#include <pebble.h>
#include "sha1.h"
#include "base32.h"

#define MAX_ACCOUNTS 100
#define MAX_NAME_LEN 32
#define MAX_SECRET_LEN 80 

#define PERSIST_KEY_NUM_ACCOUNTS 100
#define PERSIST_KEY_ACCOUNT_BASE 200

// Row height and name-label size scale with the actual display height.
// This means new/round platforms (Chalk, Gabbro) get a sensible size.
#if PBL_DISPLAY_HEIGHT >= 260
  #define ROW_HEIGHT 84
  #define FONT_NAME FONT_KEY_GOTHIC_24_BOLD
#elif PBL_DISPLAY_HEIGHT >= 228
  #define ROW_HEIGHT 72
  #define FONT_NAME FONT_KEY_GOTHIC_24_BOLD
#elif PBL_DISPLAY_HEIGHT >= 180
  #define ROW_HEIGHT 64
  #define FONT_NAME FONT_KEY_GOTHIC_18_BOLD
#else
  #define ROW_HEIGHT 60
  #define FONT_NAME FONT_KEY_GOTHIC_18_BOLD
#endif

// pick_code_font() (below) measures the rendered width of the actual code
// text and only drops to the smaller one if the big one wouldn't fit
#define FONT_CODE FONT_KEY_BITHAM_30_BLACK
#define FONT_CODE_SMALL FONT_KEY_GOTHIC_24_BOLD

typedef struct {
  char name[MAX_NAME_LEN];
  char secret[MAX_SECRET_LEN];
  uint8_t period; // TOTP validity window in seconds (e.g. 30 or 60)
  uint8_t digits; // Code length (6 or 8)
} Account;

static Window *s_main_window;
static MenuLayer *s_menu_layer;
static bool s_touch_subscribed = false;

// Drag-scroll state, used only on platforms where touch is present and enabled.
static bool s_touch_dragging = false;
static int16_t s_touch_start_y = 0;
static GPoint s_touch_start_offset;

static Account s_accounts[MAX_ACCOUNTS];
static int s_num_accounts = 0;

static void generate_totp_string(const char *secret, uint8_t period, uint8_t digits, char *out_buffer, size_t out_len) {
  uint8_t key[128]; 
  int key_len = base32_decode((const uint8_t *)secret, key, sizeof(key));

  if (key_len <= 0) {
    // Falls das Secret ungültig ist, zeigen wir einen Fehler an
    snprintf(out_buffer, out_len, "ERR 001");
    return;
  }

  if (period == 0) period = 30;
  if (digits != 6 && digits != 8) digits = 6;
  uint64_t t = time(NULL) / period;

  uint8_t time_bytes[8];
  for (int i = 7; i >= 0; i--) {
    time_bytes[i] = t & 0xFF;
    t >>= 8;
  }

  sha1nfo s; 
  
  sha1_initHmac(&s, key, key_len);
  
  sha1_write(&s, (const char *)time_bytes, 8);
  
  uint8_t *hash = sha1_resultHmac(&s);

  int offset = hash[19] & 0x0f;
  uint32_t truncated_hash = ((hash[offset] & 0x7f) << 24) |
                            ((hash[offset + 1] & 0xff) << 16) |
                            ((hash[offset + 2] & 0xff) << 8) |
                            (hash[offset + 3] & 0xff);

  uint32_t mod = 1000000; // 6 digits
  if (digits == 8) mod = 100000000;
  uint32_t pin_value = truncated_hash % mod;

  if (digits == 8) {
    snprintf(out_buffer, out_len, "%04lu %04lu",
            (unsigned long)(pin_value / 10000),
            (unsigned long)(pin_value % 10000));
  } else {
    snprintf(out_buffer, out_len, "%03lu %03lu",
            (unsigned long)(pin_value / 1000),
            (unsigned long)(pin_value % 1000));
  }
}

static uint16_t menu_get_num_rows_callback(MenuLayer *menu_layer, uint16_t section_index, void *data) {
  return s_num_accounts > 0 ? s_num_accounts : 1;
}

static int16_t menu_get_cell_height_callback(MenuLayer *menu_layer, MenuIndex *cell_index, void *data) {
  if (s_num_accounts == 0) {
    return ROW_HEIGHT * 2; 
  }
  return ROW_HEIGHT;
}

// Picks the code font by measuring how wide `code_text` actually renders at
// full size, rather than guessing from digit count or platform name.
static GFont pick_code_font(const char *code_text, GRect code_rect) {
  GFont big_font = fonts_get_system_font(FONT_CODE);

  GRect measure_box = GRect(0, 0, 1000, code_rect.size.h);
  GSize natural_size = graphics_text_layout_get_content_size(
    code_text, big_font, measure_box, GTextOverflowModeFill, GTextAlignmentCenter);

  if (natural_size.w <= code_rect.size.w) {
    return big_font;
  }
  return fonts_get_system_font(FONT_CODE_SMALL);
}

static void menu_draw_row_callback(GContext* ctx, const Layer *cell_layer, MenuIndex *cell_index, void *data) {
  GRect bounds = layer_get_bounds(cell_layer);
  
  if (s_num_accounts == 0) {
    graphics_context_set_fill_color(ctx, GColorWhite); 
    graphics_fill_rect(ctx, bounds, 0, GCornerNone);

    // 2. Text gut sichtbar in Schwarz zeichnen
    graphics_context_set_text_color(ctx, GColorBlack);
    graphics_draw_text(ctx, "No Accounts!\nPlease add Accounts in the App-Settings.", 
                       fonts_get_system_font(FONT_NAME), 
                       GRect(5, 5, bounds.size.w - 10, bounds.size.h - 10), 
                       GTextOverflowModeWordWrap, 
                       GTextAlignmentCenter, 
                       NULL);
    return;
  }

  Account *account = &s_accounts[cell_index->row];
  uint8_t period = account->period ? account->period : 30;
  uint8_t digits = (account->digits == 6 || account->digits == 8) ? account->digits : 6;
  char code_buffer[12];
  generate_totp_string(account->secret, period, digits, code_buffer, sizeof(code_buffer));

  bool is_selected = menu_cell_layer_is_highlighted(cell_layer);
  
  GRect name_rect = GRect(5, 0, bounds.size.w - 10, 24);
  graphics_context_set_text_color(ctx, is_selected ? GColorWhite : GColorBlack);
  graphics_draw_text(ctx, account->name, fonts_get_system_font(FONT_NAME), name_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentLeft, NULL);

  GRect code_rect = GRect(5, 28, bounds.size.w - 10, bounds.size.h - 28);
  GFont code_font = pick_code_font(code_buffer, code_rect);
  graphics_draw_text(ctx, code_buffer, code_font, code_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);

  time_t now = time(NULL);
  int seconds_remaining = period - (now % period);
  
  int bar_width = (bounds.size.w * seconds_remaining) / period;
  GRect bar_rect = GRect(0, bounds.size.h - 4, bar_width, 4);
  
  #if defined(PBL_COLOR)
    graphics_context_set_fill_color(ctx, seconds_remaining <= 5 ? GColorRed : GColorMalachite);
  #else
    graphics_context_set_fill_color(ctx, is_selected ? GColorWhite : GColorBlack);
  #endif
  
  graphics_fill_rect(ctx, bar_rect, 0, GCornerNone);
}

static void inbox_received_callback(DictionaryIterator *iterator, void *context) {
  Tuple *clear_tuple = dict_find(iterator, MESSAGE_KEY_CLEAR_ACCOUNTS);
  if(clear_tuple) {
    s_num_accounts = 0;
    persist_write_int(PERSIST_KEY_NUM_ACCOUNTS, 0);
    menu_layer_reload_data(s_menu_layer);
    return;
  }

  Tuple *name_tuple = dict_find(iterator, MESSAGE_KEY_ACCOUNT_NAME);
  Tuple *secret_tuple = dict_find(iterator, MESSAGE_KEY_ACCOUNT_SECRET);
  Tuple *period_tuple = dict_find(iterator, MESSAGE_KEY_ACCOUNT_PERIOD);
  Tuple *digits_tuple = dict_find(iterator, MESSAGE_KEY_ACCOUNT_DIGITS);

  if (name_tuple && secret_tuple && s_num_accounts < MAX_ACCOUNTS) {
    strncpy(s_accounts[s_num_accounts].name, name_tuple->value->cstring, MAX_NAME_LEN - 1);
    strncpy(s_accounts[s_num_accounts].secret, secret_tuple->value->cstring, MAX_SECRET_LEN - 1);
    s_accounts[s_num_accounts].period = period_tuple ? (uint8_t)period_tuple->value->int32 : 30;
    s_accounts[s_num_accounts].digits = digits_tuple ? (uint8_t)digits_tuple->value->int32 : 6;
    
    persist_write_data(PERSIST_KEY_ACCOUNT_BASE + s_num_accounts, &s_accounts[s_num_accounts], sizeof(Account));
    
    s_num_accounts++;
    persist_write_int(PERSIST_KEY_NUM_ACCOUNTS, s_num_accounts);
    
    menu_layer_reload_data(s_menu_layer);
  }
}

static void tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  if(s_menu_layer) {
    layer_mark_dirty(menu_layer_get_layer(s_menu_layer));
  }
}

// Drives touch-drag scrolling of the account list on watches with a
// touchscreen (e.g. Pebble Time 2 / Emery). Only ever subscribed after
// confirming touch_service_is_enabled(), so this never runs on hardware
// without a touchscreen or when the user has disabled touch in Settings.
static void touch_handler(const TouchEvent *event, void *context) {
  if (!s_menu_layer) return;
  ScrollLayer *scroll_layer = menu_layer_get_scroll_layer(s_menu_layer);
  if (!scroll_layer) return;

  switch (event->type) {
    case TouchEvent_Touchdown:
      s_touch_dragging = true;
      s_touch_start_y = event->y;
      s_touch_start_offset = scroll_layer_get_content_offset(scroll_layer);
      break;

    case TouchEvent_PositionUpdate: {
      if (!s_touch_dragging) break;

      int16_t dy = event->y - s_touch_start_y;
      GPoint new_offset = s_touch_start_offset;
      new_offset.y += dy; // dragging finger down increases offset.y (scrolls up)

      GSize content_size = scroll_layer_get_content_size(scroll_layer);
      GRect frame = layer_get_bounds(scroll_layer_get_layer(scroll_layer));
      int16_t max_scroll = content_size.h - frame.size.h;
      if (max_scroll < 0) max_scroll = 0;

      if (new_offset.y > 0) new_offset.y = 0;
      if (new_offset.y < -max_scroll) new_offset.y = -max_scroll;

      // Not animated: it needs to track the finger 1:1, not ease toward it.
      scroll_layer_set_content_offset(scroll_layer, new_offset, false);
      break;
    }

    case TouchEvent_Liftoff:
      s_touch_dragging = false;
      break;
  }
}

static void main_window_appear(Window *window) {
  if (touch_service_is_enabled()) {
    touch_service_subscribe(touch_handler, NULL);
    s_touch_subscribed = true;
  }
  // If touch isn't available or is disabled in Settings, the app falls back
  // to the existing UP/DOWN button scrolling with no further action needed.
}

static void main_window_disappear(Window *window) {
  if (s_touch_subscribed) {
    touch_service_unsubscribe();
    s_touch_subscribed = false;
  }
  s_touch_dragging = false;
}

static void main_window_load(Window *window) {
  Layer *window_layer = window_get_root_layer(window);
  GRect bounds = layer_get_bounds(window_layer);

  s_menu_layer = menu_layer_create(bounds);
  menu_layer_set_callbacks(s_menu_layer, NULL, (MenuLayerCallbacks){
    .get_num_rows = menu_get_num_rows_callback,
    .get_cell_height = menu_get_cell_height_callback,
    .draw_row = menu_draw_row_callback,
  });
  
  menu_layer_set_click_config_onto_window(s_menu_layer, window);
  layer_add_child(window_layer, menu_layer_get_layer(s_menu_layer));
}

static void main_window_unload(Window *window) {
  menu_layer_destroy(s_menu_layer);
}

static void init() {
  if (persist_exists(PERSIST_KEY_NUM_ACCOUNTS)) {
    s_num_accounts = persist_read_int(PERSIST_KEY_NUM_ACCOUNTS);
    
    if (s_num_accounts > MAX_ACCOUNTS || s_num_accounts < 0) {
      s_num_accounts = 0;
    }
    
    for (int i = 0; i < s_num_accounts; i++) {
      if (persist_exists(PERSIST_KEY_ACCOUNT_BASE + i)) {
        persist_read_data(PERSIST_KEY_ACCOUNT_BASE + i, &s_accounts[i], sizeof(Account));
      }
    }
  }

  s_main_window = window_create();
  
  window_set_background_color(s_main_window, GColorWhite);
  
  window_set_window_handlers(s_main_window, (WindowHandlers) {
    .load = main_window_load,
    .unload = main_window_unload,
    .appear = main_window_appear,
    .disappear = main_window_disappear,
  });
  window_stack_push(s_main_window, true);

  app_message_register_inbox_received(inbox_received_callback);
  app_message_open(app_message_inbox_size_maximum(), app_message_outbox_size_maximum());

  tick_timer_service_subscribe(SECOND_UNIT, tick_handler);
}

static void deinit() {
  tick_timer_service_unsubscribe();
  window_destroy(s_main_window);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}

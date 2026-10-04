#include <pebble.h>
#include "totp.h"
#include "utf8.h"

#define MAX_ACCOUNTS 100
#define MAX_NAME_LEN 32
#define MAX_SECRET_LEN 80

#define PERSIST_KEY_NUM_ACCOUNTS 100
#define PERSIST_KEY_ACCOUNT_BASE 200
#define PERSIST_KEY_LOOP_LIST 300 // Dedicated persist key for the loop setting

// AppMessage buffers are sized for the largest message actually exchanged:
// one account (index, name, secret, period, digits; ~170 bytes) inbound and the
// sync result outbound. app_message_*_size_maximum() would reserve ~8 KB per
// buffer with current phone apps, which doesn't fit next to the account table
// in Aplite's 24 KB of app RAM.
#define APP_MESSAGE_INBOX_SIZE 512
#define APP_MESSAGE_OUTBOX_SIZE 64

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

// Round displays (Chalk, Gabbro) clip the corners of each row, so names are
// centred and kept clear of the bezel there.
#if defined(PBL_ROUND)
  #define NAME_INSET 12
  #define EMPTY_TEXT_INSET 20
  #define NAME_ALIGNMENT GTextAlignmentCenter
#else
  #define NAME_INSET 5
  #define EMPTY_TEXT_INSET 5
  #define NAME_ALIGNMENT GTextAlignmentLeft
#endif

// pick_code_font() (below) measures the rendered width of the actual code
// text and only drops to the smaller one if the big one wouldn't fit
#define FONT_CODE FONT_KEY_BITHAM_30_BLACK
#define FONT_CODE_SMALL FONT_KEY_GOTHIC_24_BOLD

// Persisted as-is with persist_write_data(): don't change the layout.
typedef struct {
  char name[MAX_NAME_LEN];
  char secret[MAX_SECRET_LEN];
  uint8_t period; // TOTP validity window in seconds (e.g. 30 or 60)
  uint8_t digits; // Code length (6 or 8)
} Account;

static Window *s_main_window;
static MenuLayer *s_menu_layer;

// Global variable for the loop status (default: on)
static bool s_loop_list = true;

static Account s_accounts[MAX_ACCOUNTS];
static int s_num_accounts = 0;

// Set when the current sync ran out of persistent storage. The original
// firmware gives each app 6 KB, which holds just under 50 accounts.
static bool s_storage_full = false;

#if defined(PBL_TOUCH) && defined(PBL_RECT)
// Only used to notice that the list was moved by touch since the last button step.
static bool s_touch_subscribed = false;
static bool s_touched_since_step = false;
#endif

// --- Accounts and storage ---

// Makes a record read from storage safe to use.
static void sanitize_account(Account *account) {
  account->name[MAX_NAME_LEN - 1] = '\0';
  account->secret[MAX_SECRET_LEN - 1] = '\0';
  utf8_trim_incomplete(account->name);
  if (account->period == 0) account->period = 30;
  if (account->digits != 6 && account->digits != 8) account->digits = 6;
}

static void load_accounts(void) {
  int count = 0;
  if (persist_exists(PERSIST_KEY_NUM_ACCOUNTS)) {
    count = persist_read_int(PERSIST_KEY_NUM_ACCOUNTS);
    if (count > MAX_ACCOUNTS || count < 0) {
      count = 0;
    }
  }

  s_num_accounts = 0;
  for (int i = 0; i < count; i++) {
    Account *account = &s_accounts[i];
    memset(account, 0, sizeof(*account));
    // A missing record means a sync was interrupted: keep the complete part.
    if (persist_read_data(PERSIST_KEY_ACCOUNT_BASE + i, account, sizeof(*account)) <= 0) {
      break;
    }
    sanitize_account(account);
    s_num_accounts++;
  }
}

static int32_t tuple_int(const Tuple *tuple) {
  switch (tuple->type) {
    case TUPLE_INT:
      if (tuple->length == 1) return tuple->value->int8;
      if (tuple->length == 2) return tuple->value->int16;
      return tuple->value->int32;
    case TUPLE_UINT:
      if (tuple->length == 1) return tuple->value->uint8;
      if (tuple->length == 2) return tuple->value->uint16;
      return (int32_t)tuple->value->uint32;
    default:
      return 0;
  }
}

// Copies a string tuple without reading past the tuple, even if it lacks a NUL.
static void tuple_copy_string(char *dst, size_t dst_size, const Tuple *tuple) {
  if (tuple->type == TUPLE_CSTRING) {
    utf8_copy(dst, dst_size, tuple->value->cstring, tuple->length);
  } else {
    dst[0] = '\0';
  }
}

// A sync from the phone starts by wiping the stored list, so the new list gets
// the whole storage quota and no deleted secret stays behind on the watch.
static void begin_sync(void) {
  s_storage_full = false;
  s_num_accounts = 0;
  persist_write_int(PERSIST_KEY_NUM_ACCOUNTS, 0);
  for (int i = 0; i < MAX_ACCOUNTS; i++) {
    const uint32_t key = PERSIST_KEY_ACCOUNT_BASE + i;
    if (persist_exists(key)) {
      persist_delete(key);
    }
  }
  if (s_menu_layer) {
    menu_layer_reload_data(s_menu_layer);
    menu_layer_set_selected_index(s_menu_layer, MenuIndex(0, 0), MenuRowAlignTop, false);
  }
}

// Accounts arrive in order. A repeated index is a retransmission (the phone
// missed our ACK) and simply overwrites the same slot instead of duplicating it.
static void store_account(int32_t index, const Tuple *name, const Tuple *secret,
                          const Tuple *period, const Tuple *digits) {
  if (s_storage_full || index < 0 || index > s_num_accounts || index >= MAX_ACCOUNTS) {
    return;
  }

  Account account;
  memset(&account, 0, sizeof(account));
  tuple_copy_string(account.name, sizeof(account.name), name);
  tuple_copy_string(account.secret, sizeof(account.secret), secret);
  const int32_t period_value = period ? tuple_int(period) : 30;
  account.period = (period_value > 0 && period_value <= UINT8_MAX) ? (uint8_t)period_value : 30;
  account.digits = (digits && tuple_int(digits) == 8) ? 8 : 6;

  const uint32_t key = PERSIST_KEY_ACCOUNT_BASE + index;
  if (persist_write_data(key, &account, sizeof(account)) < 0) {
    s_storage_full = true;
    APP_LOG(APP_LOG_LEVEL_WARNING, "Storage full after %d accounts", s_num_accounts);
    return;
  }

  if (index == s_num_accounts) {
    if (persist_write_int(PERSIST_KEY_NUM_ACCOUNTS, index + 1) < 0) {
      persist_delete(key);
      s_storage_full = true;
      APP_LOG(APP_LOG_LEVEL_WARNING, "Storage full after %d accounts", s_num_accounts);
      return;
    }
    s_num_accounts++;
  }
  s_accounts[index] = account;
  if (s_menu_layer) {
    menu_layer_reload_data(s_menu_layer);
  }
}

// Tells the phone how many accounts were stored, so it can report when the
// watch ran out of storage.
static void send_sync_result(void) {
  DictionaryIterator *iterator;
  if (app_message_outbox_begin(&iterator) != APP_MSG_OK || !iterator) {
    return;
  }
  dict_write_int32(iterator, MESSAGE_KEY_SYNC_RESULT, s_num_accounts);
  app_message_outbox_send();
}

// --- Menu ---

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

    // Draw text clearly visible in black
    graphics_context_set_text_color(ctx, GColorBlack);
    graphics_draw_text(ctx, "No accounts yet.\nAdd them in the app settings on your phone.",
                       fonts_get_system_font(FONT_NAME),
                       GRect(EMPTY_TEXT_INSET, 5, bounds.size.w - 2 * EMPTY_TEXT_INSET, bounds.size.h - 10),
                       GTextOverflowModeWordWrap,
                       GTextAlignmentCenter,
                       NULL);
    return;
  }

  if (cell_index->row >= s_num_accounts) {
    return;
  }

  Account *account = &s_accounts[cell_index->row];
  time_t now = time(NULL);
  char code_buffer[12];
  totp_format_code(account->secret, account->period, account->digits, now,
                   code_buffer, sizeof(code_buffer));

  bool is_selected = menu_cell_layer_is_highlighted(cell_layer);

  GRect name_rect = GRect(NAME_INSET, 0, bounds.size.w - 2 * NAME_INSET, 24);
  graphics_context_set_text_color(ctx, is_selected ? GColorWhite : GColorBlack);
  graphics_draw_text(ctx, account->name, fonts_get_system_font(FONT_NAME), name_rect, GTextOverflowModeTrailingEllipsis, NAME_ALIGNMENT, NULL);

  GRect code_rect = GRect(5, 28, bounds.size.w - 10, bounds.size.h - 28);
  GFont code_font = pick_code_font(code_buffer, code_rect);
  graphics_draw_text(ctx, code_buffer, code_font, code_rect, GTextOverflowModeTrailingEllipsis, GTextAlignmentCenter, NULL);

  int period = account->period;
  int seconds_remaining = period - (now % period);

  int bar_width = (bounds.size.w * seconds_remaining) / period;
#if defined(PBL_ROUND)
  // Shrink towards the centre so the bar isn't cut off by the round bezel.
  GRect bar_rect = GRect((bounds.size.w - bar_width) / 2, bounds.size.h - 4, bar_width, 4);
#else
  GRect bar_rect = GRect(0, bounds.size.h - 4, bar_width, 4);
#endif

  #if defined(PBL_COLOR)
    graphics_context_set_fill_color(ctx, seconds_remaining <= 5 ? GColorRed : GColorMalachite);
  #else
    graphics_context_set_fill_color(ctx, is_selected ? GColorWhite : GColorBlack);
  #endif

  graphics_fill_rect(ctx, bar_rect, 0, GCornerNone);
}

// --- Phone communication ---

static void inbox_received_callback(DictionaryIterator *iterator, void *context) {
  if (dict_find(iterator, MESSAGE_KEY_SYNC_BEGIN)) {
    begin_sync();
  }

  Tuple *name_tuple = dict_find(iterator, MESSAGE_KEY_ACCOUNT_NAME);
  Tuple *secret_tuple = dict_find(iterator, MESSAGE_KEY_ACCOUNT_SECRET);
  if (name_tuple && secret_tuple) {
    Tuple *index_tuple = dict_find(iterator, MESSAGE_KEY_ACCOUNT_INDEX);
    store_account(index_tuple ? tuple_int(index_tuple) : s_num_accounts,
                  name_tuple, secret_tuple,
                  dict_find(iterator, MESSAGE_KEY_ACCOUNT_PERIOD),
                  dict_find(iterator, MESSAGE_KEY_ACCOUNT_DIGITS));
  }

  // Handle the loop list setting toggle from the phone
  Tuple *loop_tuple = dict_find(iterator, MESSAGE_KEY_SETTING_LOOP_LIST);
  if (loop_tuple) {
    bool loop_list = tuple_int(loop_tuple) != 0;
    if (loop_list != s_loop_list || !persist_exists(PERSIST_KEY_LOOP_LIST)) {
      s_loop_list = loop_list;
      persist_write_bool(PERSIST_KEY_LOOP_LIST, s_loop_list);
    }
  }

  if (dict_find(iterator, MESSAGE_KEY_SYNC_END)) {
    send_sync_result();
  }
}

static void inbox_dropped_callback(AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_WARNING, "Message from phone dropped: %d", (int)reason);
}

static void tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  if(s_menu_layer) {
    layer_mark_dirty(menu_layer_get_layer(s_menu_layer));
  }
}

// --- Touch (Pebble Time 2 / Emery) ---
// Scrolling itself is done by the system: init() opts into touch navigation,
// which makes the MenuLayer follow the finger (with momentum) on touch
// watches. On Round 2 / Gabbro the list is centre-focused, so the selection
// follows the finger and nothing else is needed.

#if defined(PBL_TOUCH) && defined(PBL_RECT)
static void touch_handler(const TouchEvent *event, void *context) {
  if (event->type == TouchEvent_Touchdown && !event->non_navigational) {
    s_touched_since_step = true;
  }
}

// A touch scroll moves the list but not the selection. Before a button step,
// re-anchor the selection on the row in view so the list doesn't jump back to
// an off-screen selection, like MenuLayer's own button handlers do.
static void reconcile_selection_after_touch(void) {
  if (!s_touched_since_step) return;
  s_touched_since_step = false;

  ScrollLayer *scroll_layer = menu_layer_get_scroll_layer(s_menu_layer);
  const int offset_y = scroll_layer_get_content_offset(scroll_layer).y;
  const int frame_h = layer_get_bounds(menu_layer_get_layer(s_menu_layer)).size.h;
  MenuIndex index = menu_layer_get_selected_index(s_menu_layer);

  const int row_top = index.row * ROW_HEIGHT + offset_y;
  if (row_top + ROW_HEIGHT > 0 && row_top < frame_h) {
    return; // the selection is still on screen
  }

  int row = (frame_h / 2 - offset_y) / ROW_HEIGHT;
  if (row < 0) row = 0;
  if (row > s_num_accounts - 1) row = s_num_accounts - 1;
  index.row = row;
  menu_layer_set_selected_index(s_menu_layer, index, MenuRowAlignNone, false);
}
#endif

// --- Custom Click Handlers for Menu Looping ---

// Handler for the "Down" button
static void down_single_click_handler(ClickRecognizerRef recognizer, void *context) {
  if (s_num_accounts <= 0) return;
#if defined(PBL_TOUCH) && defined(PBL_RECT)
  reconcile_selection_after_touch();
#endif

  MenuIndex current_index = menu_layer_get_selected_index(s_menu_layer);

  if (current_index.row < (s_num_accounts - 1)) {
    current_index.row++; // Normal scrolling downwards
  } else if (s_loop_list && !click_recognizer_is_repeating(recognizer)) {
    current_index.row = 0; // Loop: jump back to the beginning (on a fresh press, not while held)
  } else {
    return;
  }

  menu_layer_set_selected_index(s_menu_layer, current_index, MenuRowAlignCenter, true);
}

// Handler for the "Up" button
static void up_single_click_handler(ClickRecognizerRef recognizer, void *context) {
  if (s_num_accounts <= 0) return;
#if defined(PBL_TOUCH) && defined(PBL_RECT)
  reconcile_selection_after_touch();
#endif

  MenuIndex current_index = menu_layer_get_selected_index(s_menu_layer);

  if (current_index.row > 0) {
    current_index.row--; // Normal scrolling upwards
  } else if (s_loop_list && !click_recognizer_is_repeating(recognizer)) {
    current_index.row = s_num_accounts - 1; // Loop: jump to the end of the list (on a fresh press)
  } else {
    return;
  }

  menu_layer_set_selected_index(s_menu_layer, current_index, MenuRowAlignCenter, true);
}

// Registers our custom button handlers instead of the default MenuLayer ones
static void custom_click_config_provider(void *context) {
  window_single_repeating_click_subscribe(BUTTON_ID_DOWN, 100, down_single_click_handler);
  window_single_repeating_click_subscribe(BUTTON_ID_UP, 100, up_single_click_handler);
}

// --- Window ---

static void main_window_appear(Window *window) {
#if defined(PBL_TOUCH) && defined(PBL_RECT)
  if (touch_service_is_enabled()) {
    touch_service_subscribe(touch_handler, NULL);
    s_touch_subscribed = true;
  }
#endif
}

static void main_window_disappear(Window *window) {
#if defined(PBL_TOUCH) && defined(PBL_RECT)
  if (s_touch_subscribed) {
    touch_service_unsubscribe();
    s_touch_subscribed = false;
  }
  s_touched_since_step = false;
#endif
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

  // Use our custom click configuration instead of the default MenuLayer provider
  // This enables the looping logic
  window_set_click_config_provider(window, custom_click_config_provider);
  layer_add_child(window_layer, menu_layer_get_layer(s_menu_layer));
}

static void main_window_unload(Window *window) {
  menu_layer_destroy(s_menu_layer);
  s_menu_layer = NULL;
}

static void init(void) {
  load_accounts();

  // Load the loop list preference from persistent storage
  if (persist_exists(PERSIST_KEY_LOOP_LIST)) {
    s_loop_list = persist_read_bool(PERSIST_KEY_LOOP_LIST);
  }

#if defined(PBL_TOUCH)
  // Opt into the system's touch navigation (third-party apps are opted out by
  // default), so the account list scrolls by touch on Pebble Time 2 / Round 2.
  app_touch_navigation_enable(true);
#endif

  // Listen for the phone before showing the UI, so no early message is missed.
  app_message_register_inbox_received(inbox_received_callback);
  app_message_register_inbox_dropped(inbox_dropped_callback);
  app_message_open(APP_MESSAGE_INBOX_SIZE, APP_MESSAGE_OUTBOX_SIZE);

  s_main_window = window_create();

  window_set_background_color(s_main_window, GColorWhite);

  window_set_window_handlers(s_main_window, (WindowHandlers) {
    .load = main_window_load,
    .unload = main_window_unload,
    .appear = main_window_appear,
    .disappear = main_window_disappear,
  });
  window_stack_push(s_main_window, true);

  tick_timer_service_subscribe(SECOND_UNIT, tick_handler);
}

static void deinit(void) {
  tick_timer_service_unsubscribe();
  app_message_deregister_callbacks();
  window_destroy(s_main_window);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}

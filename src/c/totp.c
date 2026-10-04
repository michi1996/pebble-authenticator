#include <pebble.h>
#include "totp.h"
#include "sha1.h"
#include "base32.h"

int totp_key_from_base32(const char *secret, uint8_t *key) {
  // static: called from the AppMessage handler, keep the watch's stack small
  static uint8_t decoded[TOTP_MAX_SECRET_CHARS * 5 / 8 + 1];
  if (strlen(secret) > TOTP_MAX_SECRET_CHARS) return -1;

  int len = base32_decode((const uint8_t *)secret, decoded, sizeof(decoded));
  if (len <= 0) return -1;
  if (len > TOTP_MAX_KEY_LEN) {
    sha1nfo s;
    sha1_init(&s);
    sha1_write(&s, (const char *)decoded, len);
    memcpy(key, sha1_result(&s), HASH_LENGTH);
    return HASH_LENGTH;
  }
  memcpy(key, decoded, len);
  return len;
}

bool totp_format_code(const char *secret, uint8_t period, uint8_t digits, time_t now,
                      char *out, size_t out_len) {
  uint8_t key[128];
  int key_len = base32_decode((const uint8_t *)secret, key, sizeof(key));
  return totp_format_code_key(key, key_len > 0 ? key_len : 0, period, digits, now, out, out_len);
}

bool totp_format_code_key(const uint8_t *key, size_t key_len, uint8_t period, uint8_t digits,
                          time_t now, char *out, size_t out_len) {
  if (key_len == 0) {
    // If the secret is invalid, display an error
    snprintf(out, out_len, "ERR 001");
    return false;
  }

  if (period == 0) period = 30;
  if (digits != 6 && digits != 8) digits = 6;
  uint64_t t;
  if (sizeof(time_t) > sizeof(uint32_t)) {
    t = (uint64_t)now / period;
  } else {
    // 32-bit time_t (the watch): a 32-bit division avoids linking the 64-bit helper.
    t = (uint32_t)now / period;
  }

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
  uint32_t truncated_hash = ((uint32_t)(hash[offset] & 0x7f) << 24) |
                            ((uint32_t)(hash[offset + 1] & 0xff) << 16) |
                            ((uint32_t)(hash[offset + 2] & 0xff) << 8) |
                            (uint32_t)(hash[offset + 3] & 0xff);

  if (digits == 8) {
    uint32_t pin_value = truncated_hash % 100000000;
    snprintf(out, out_len, "%04lu %04lu",
             (unsigned long)(pin_value / 10000),
             (unsigned long)(pin_value % 10000));
  } else {
    uint32_t pin_value = truncated_hash % 1000000;
    snprintf(out, out_len, "%03lu %03lu",
             (unsigned long)(pin_value / 1000),
             (unsigned long)(pin_value % 1000));
  }
  return true;
}

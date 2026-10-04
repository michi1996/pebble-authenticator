#include <stdbool.h>
#include <stdint.h>
#include <string.h>
#include "utf8.h"

static bool is_continuation_byte(char c) {
  return ((uint8_t)c & 0xC0) == 0x80;
}

void utf8_copy(char *dst, size_t dst_size, const char *src, size_t src_len) {
  if (dst_size == 0) return;

  size_t len = 0;
  while (len < src_len && src[len] != '\0') len++;

  if (len > dst_size - 1) {
    len = dst_size - 1;
    // src[len] is the first byte left out: if it continues a character,
    // drop the beginning of that character too.
    while (len > 0 && is_continuation_byte(src[len])) len--;
  }
  memcpy(dst, src, len);
  dst[len] = '\0';
}

void utf8_trim_incomplete(char *str) {
  size_t len = strlen(str);
  size_t start = len;
  while (start > 0 && is_continuation_byte(str[start - 1])) start--;
  if (start == 0) return;

  // str[start - 1] is the lead byte of the last character.
  uint8_t lead = (uint8_t)str[start - 1];
  size_t expected = 1;
  if ((lead & 0xE0) == 0xC0) expected = 2;
  else if ((lead & 0xF0) == 0xE0) expected = 3;
  else if ((lead & 0xF8) == 0xF0) expected = 4;

  if (len - (start - 1) < expected) {
    str[start - 1] = '\0';
  }
}

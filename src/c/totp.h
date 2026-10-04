#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <time.h>

// Longest Base32 secret accepted, and the most key bytes ever needed: HMAC-SHA1
// replaces keys longer than its 64-byte block by their SHA-1 hash.
#define TOTP_MAX_SECRET_CHARS 256
#define TOTP_MAX_KEY_LEN 64

// Formats the TOTP code (RFC 6238, HMAC-SHA1) of a key at time `now` as
// "123 456" (6 digits) or "1234 5678" (8 digits). Unknown digit counts fall
// back to 6 and a period of 0 to 30 seconds.
// Returns false and writes "ERR 001" if the key is empty.
bool totp_format_code_key(const uint8_t *key, size_t key_len, uint8_t period, uint8_t digits,
                          time_t now, char *out, size_t out_len);

// Same for a Base32 secret; returns false and writes "ERR 001" if it is invalid.
bool totp_format_code(const char *secret, uint8_t period, uint8_t digits, time_t now,
                      char *out, size_t out_len);

// Decodes a Base32 secret of up to TOTP_MAX_SECRET_CHARS characters into the
// key HMAC actually uses: keys longer than TOTP_MAX_KEY_LEN bytes become their
// SHA-1 hash, which gives identical codes. Returns the key length written to
// `key` (TOTP_MAX_KEY_LEN bytes of room), or -1 if the secret is invalid.
int totp_key_from_base32(const char *secret, uint8_t *key);

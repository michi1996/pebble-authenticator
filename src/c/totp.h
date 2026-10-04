#pragma once
#include <stdbool.h>
#include <stddef.h>
#include <stdint.h>
#include <time.h>

// Formats the TOTP code (RFC 6238, HMAC-SHA1) of a Base32 secret at time `now`
// as "123 456" (6 digits) or "1234 5678" (8 digits). Unknown digit counts fall
// back to 6 and a period of 0 to 30 seconds.
// Returns false and writes "ERR 001" if the secret is not valid Base32.
bool totp_format_code(const char *secret, uint8_t period, uint8_t digits, time_t now,
                      char *out, size_t out_len);

#pragma once
#include <stddef.h>

// Copies at most `src_len` bytes of `src` (stopping early at a NUL) into `dst`
// and always NUL-terminates it. If the text does not fit into `dst_size`, it
// is cut at a character boundary so no multi-byte UTF-8 sequence is split.
void utf8_copy(char *dst, size_t dst_size, const char *src, size_t src_len);

// Removes an incomplete multi-byte UTF-8 sequence from the end of `str`, as
// left behind by older versions that truncated names byte-wise.
void utf8_trim_incomplete(char *str);

#include "base32.h"

int base32_decode(const uint8_t *encoded, uint8_t *result, int bufSize) {
    uint32_t buffer = 0; // unsigned: shifting old bits out must not overflow
    int bitsLeft = 0;
    int count = 0;
    
    for (const uint8_t *ptr = encoded; count < bufSize && *ptr; ++ptr) {
        uint8_t ch = *ptr;
        
        if (ch == ' ' || ch == '\t' || ch == '\r' || ch == '\n' || ch == '-') {
            continue;
        }
        
        buffer <<= 5;

        // Base32 Alphabet: A-Z (0-25) and 2-7 (26-31)
        if (ch >= 'A' && ch <= 'Z') {
            buffer |= (ch - 'A');
        } else if (ch >= 'a' && ch <= 'z') {
            buffer |= (ch - 'a'); 
        } else if (ch >= '2' && ch <= '7') {
            buffer |= (ch - '2' + 26);
        } else if (ch == '=') {
            break; 
        } else {
            return -1; 
        }

        bitsLeft += 5;
        if (bitsLeft >= 8) {
            result[count++] = (uint8_t)(buffer >> (bitsLeft - 8));
            bitsLeft -= 8;
        }
    }
    return count;
}

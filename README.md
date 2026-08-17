# 2FActor - TOTP Authenticator for Pebble

A lightweight, secure, and fully offline Two-Factor Authentication (2FA / TOTP) application for Pebble smartwatches. Bring your login codes right to your wrist!

## Features

* **Fully Offline & Secure:** Your secret keys are stored strictly locally on your smartphone (using `localStorage`) and on the Pebble watch itself (using `persist_write_data`). No cloud sync, no tracking, and no external servers.
* **Easy Import:** Quickly add multiple accounts at once by pasting standard `otpauth://` export links into the settings page.
* **Wide Compatibility:** Supports both 6 and 8 digit codes in 30 or 60 second validity periods.
* **Manual Entry:** Add accounts manually by entering the Account Name and the Base32 Secret Key.
* **High Capacity:** Stores and manages up to 100 different 2FA accounts natively on your watch.
* **Clean Interface:** Optimized for readability on Pebble displays (especially Pebble Time 2), featuring large, bold fonts and an animated progress bar to show when the next code will arrive. Now with touch support!
* **Easy Management:** View, reorder, and delete individual accounts directly from the Pebble app configuration screen.

##  Built With

* **Pebble C SDK:** Core application and UI rendering on the smartwatch.
* **PebbleKit JS & Clay:** Configuration page for managing accounts via the official Pebble mobile app.

##  How to Use

1. Open the **Pebble App** on your smartphone and navigate to the settings of this app.
2. Under **Import**, paste your exported `otpauth://totp/...` URIs to load multiple accounts.
3. Alternatively, use the **Add Manually** section to type in a name and a Base32 secret.
4. Hit **Save & Send to Watch** at the bottom. Your watch will instantly sync the new list.
5. To delete an account, use the **Manage Accounts** dropdown, select the account, and click delete.

## Acknowledgments & Credits

* **SHA1 Implementation:** The core cryptographic logic (SHA1/HMAC) used to generate the TOTP codes is adapted from the excellent [neal/pebble-authenticator](https://github.com/neal/pebble-authenticator) repository.
* The source fork of this app is from [michi1996](https://github.com/michi1996/pebble-authenticator).

## Disclaimers

### Missing Features

* Only TOTP codes are supported, not HOTP.
* SHA1 encoding is presumed for all codes, SHA256/512 are not supported.

### 🤖 AI Assisted

This application was developed with the assistance of Google's **Gemini AI** and Anthropic's **Claude**. It helped in bridging the gap between modern JavaScript configuration tools (Clay) and the Pebble C SDK. 

If you encounter any bugs, have ideas for new features, or want to suggest improvements, please feel free to open an issue or send me a message! I am always happy to receive feedback and make the app even better.

## License

This project is open-source. Feel free to fork, modify, and distribute it!

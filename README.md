# Pebble Authenticator - TOTP Authenticator for Pebble

A lightweight, secure, and fully offline Two-Factor Authentication (2FA / TOTP) application for Pebble smartwatches. Bring your login codes right to your wrist!

Find it on the [Pebble App Store](https://apps.repebble.com/864fb2cb5c0444b088dbbaa0)

## Features

* **Fully Offline & Secure:** Your secret keys are stored strictly locally on your smartphone (using `localStorage`) and on the Pebble watch itself (using `persist_write_data`). No cloud sync, no tracking, and no external servers.
* **Easy Import:** Quickly add multiple accounts at once by pasting standard `otpauth://` export links into the settings page. Links that can't work on the watch (HOTP, SHA256/SHA512, duplicates, invalid keys) are skipped with an explanation.
* **Wide Compatibility:** Supports both 6 and 8 digit codes in 30 or 60 second validity periods.
* **Manual Entry:** Add accounts manually by entering the Account Name and the Base32 Secret Key. The key is checked before it is added.
* **High Capacity:** Stores and manages up to 100 different 2FA accounts natively on your watch (see [Storage](#storage)).
* **Clean Interface:** Optimized for readability on Pebble displays (especially Pebble Time 2), featuring large, bold fonts and an animated progress bar to show when the next code will arrive. Swipe to scroll on touch watches.
* **Modern Settings Page:** Light and dark mode, reorder accounts by dragging or with the arrow buttons, rename and delete them (with undo).
* **Backup & Restore:** Save all accounts as text, optionally encrypted with a password, and restore them later – either adding to your list or replacing it (see [Backup](#backup)).

## Built With

* **Pebble C SDK:** Core application and UI rendering on the smartwatch.
* **PebbleKit JS & Clay:** Configuration page for managing accounts via the Pebble mobile app.

## Supported Watches and Phones

| Platform | Watches | Notes |
| --- | --- | --- |
| `emery` | Pebble Time 2 | Touch scrolling via the system touch navigation |
| `gabbro` | Pebble Round 2 | Round layout, touch scrolling |
| `flint` | Pebble 2 Duo | |
| `basalt`, `chalk`, `diorite`, `aplite` | Pebble Time (Steel), Pebble Time Round, Pebble 2, Pebble Classic / Steel | |

The settings page works in the Pebble app by Core Devices on iOS and Android as well as in older Pebble apps.

## How to Use

1. Open the **Pebble App** on your smartphone and navigate to the settings of this app.
2. Under **Add accounts → Import links**, paste your exported `otpauth://totp/...` URIs to load multiple accounts.
3. Alternatively, use **Enter key** to type in a name and a Base32 secret.
4. Tap an account to move, rename or delete it, or drag it by the handle on the right.
5. Hit **Save to watch** at the bottom. Your watch syncs the new list and confirms with a notification.

If the watch is out of reach while saving, the transfer is finished automatically the next time you open the app on the watch.

## Backup

Under **Backup → Create backup** the settings page turns your account list into text that you can copy, for example into a password manager:

* **Without password**, the backup is a list of standard `otpauth://` links, one per account. Other authenticator apps can import it too. Anyone who can read it can create your codes, so keep it safe.
* **With password** (at least 8 characters), the backup is a single line starting with `pebble-auth-backup:1:`. The key is derived from the password with PBKDF2-HMAC-SHA256 (600,000 iterations, random salt) and the links are encrypted with AES-256-GCM. If you forget the password, the backup can't be opened.

To restore, paste the backup (or open a text file) under **Backup → Restore**, enter the password if it is encrypted, and choose **Add to my list** (existing accounts are skipped) or **Replace my list**. Then tap **Save to watch**.

Encrypted backup format, for decrypting it with other tools: `pebble-auth-backup:1:<iterations>:<salt>:<iv>:<ciphertext + 16-byte tag>`, all binary parts base64url without padding. The text before the last colon is used as additional authenticated data; the plaintext is the list of `otpauth://` links.

## Storage

The watch keeps up to 100 accounts. Watches that still run the original Pebble firmware only give each app 6 KB of storage, which holds just under 50 accounts; if the list doesn't fit, the notification after saving tells you how many accounts were stored. Pebble Time 2, Pebble Round 2 and Pebble 2 Duo have plenty of room.

## Building

Install the current Pebble SDK and build the app for all platforms:

```bash
uv tool install pebble-tool
pebble sdk install latest
pebble build
```

## Acknowledgments & Credits

* **SHA1 Implementation:** The core cryptographic logic (SHA1/HMAC) used to generate the TOTP codes is adapted from the excellent [neal/pebble-authenticator](https://github.com/neal/pebble-authenticator) repository.

## Disclaimers

### Missing Features

* Only TOTP codes are supported, not HOTP.
* Only SHA1 is supported, SHA256/512 are not (such links are skipped during import).
* Google Authenticator export links (`otpauth-migration://`) can't be imported; export the accounts as `otpauth://` links instead.

### 🤖 AI Assisted

This application was developed with the assistance of Google's **Gemini AI** and Anthropic's **Claude**. It helped in bridging the gap between modern JavaScript configuration tools (Clay) and the Pebble C SDK.

If you encounter any bugs, have ideas for new features, or want to suggest improvements, please feel free to open an issue or send me a message! I am always happy to receive feedback and make the app even better.

## License

This project is open-source. Feel free to fork, modify, and distribute it!

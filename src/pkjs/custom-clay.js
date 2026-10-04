// Runs inside the configuration page (not in PebbleKit JS). Clay copies this
// function's source into the page, so it must be self-contained ES5 and must
// not contain dollar-sign replacement patterns or a closing script tag.
module.exports = function() {
  var clayConfig = this;

  var MAX_ACCOUNTS = 100;
  var MAX_NAME_BYTES = 31;     // the watch keeps 31 bytes of UTF-8 per name
  var MAX_SECRET_LENGTH = 256; // longest Base32 secret the watch accepts
  var MAX_LABEL_LENGTH = 64;
  var BACKUP_ITERATIONS = 600000; // PBKDF2-SHA256, as recommended by OWASP
  var MIN_PASSWORD_LENGTH = 8;

  var WATCH_NAMES = {
    aplite: 'Pebble Classic',
    basalt: 'Pebble Time',
    chalk: 'Pebble Time Round',
    diorite: 'Pebble 2',
    emery: 'Pebble Time 2',
    flint: 'Pebble 2 Duo',
    gabbro: 'Pebble Round 2'
  };

  var AVATAR_COLORS = ['#e5484d', '#d6409f', '#8e4ec6', '#6e56cf', '#3e63dd',
                       '#0b7fd4', '#0f9488', '#2f9e5c', '#d9600b', '#a07450'];

  // resources/images/menu_icon.png, the app icon shown in the launcher.
  var APP_ICON = 'data:image/png;base64,' +
    'iVBORw0KGgoAAAANSUhEUgAAABkAAAAZCAYAAADE6YVjAAADuUlEQVR4AWyVy6tWZRTGn7ULRA8hSUYQBdFA6EIkhh' +
    'GUnW7QwEGDBg36Axo0aVJEBl1sFDQJbNKwhgXRXTyKCIKgqIiCKDoQFMSZF0R0+XvWu9/v25/Hl7XW86xnrfey373P' +
    'dwZNRsz4nM2kIl3vWGKF1UrJsj7ZJJRNJ8JcjQqicwnfKeVVETDjV/B1eBkzaDGNEVVofbKJU6kqYjjNCluVcQblc3' +
    'wJty3R9yXkNP4CXpZRQDs4cpgGmo1z97o9C62F/sHJH1PqGvwLfDu+g/w6+Dj+O/4gTpsjC2DUbRbYxAK7YrrPhh9K' +
    'ehS/ib9EfSf4J/4t/gpzboNPgdvrZmkgX2WDlfBGJh3Nm7/eQLvAU+r3QYIdo/3ncd0362YR2ZCITcggjkCz7OaUp7' +
    'a+JXG8YXU1SmSdQ8HGqE+SSgGTBxUokSR9XWTQsn6cSiq0Pt1baDIz72Rb+IHqRki5lj0FQ4MlLY6NaN9IsQJuVRuf' +
    'Afvmnp1/iobFy4QV/Gve/iO1D0kZhxiKOLCiAf8+Jb6iXAY3jBM2oW+zc7vbaMXD+SZxXegb0JbBHfh3eBkae0oDC5' +
    'WgkYT0YhPGOOpjVhdnKfuEwnlG35aSIO7jUJo/iVi+CtG+eXhZk+WyJ2g2emEmFEFdU2QMyZNONvG+roB0elE5kBrq' +
    'dObqYyHponLxJOj+uoAyL1yrqT17rVGh7tU9ZCfAH2k9CU7tBsl+/Afu8xewjL7CyZM4ZxnDfT12Iz+Pf0zXs+BB3D' +
    '+UH4HrQ/UhfALnxQfQzxbTd6LVw732quT/BT2EfoO+KsVPkm61x4dVP8eAqq5uel2j7lrzaH/A1mkO6R2JCJdHyk92' +
    '1OdFtVIe1S+//M1cfGlc17SltPRa3qERtKxzvs2Cv3Ln76HsosfvB4pKbKtUXMvifyP9R+UJUPzFp3HqA03ULblWE5' +
    '3YPyDzNT1Ez2242GwzuC4hTFoD/iXpDfwKfova+MdohlJ9dJqOHJo4Nva0TzQuobCPniaspOJfpj2M9g+4rKh/cv4F' +
    'v5TM47ooJW5reMeUyQWz0GqsYZIbxWRq5/EDUD4AnYMv42e40tfAOggorktjv/o40skc496eZ+S9JP/Tep83dlgK/1' +
    's4K8kbXgSb0cdvV8iP1JSK/mXds7gqnYvCFjqfw63eILzLI+4l54pi9gTklMSTBAtgqlSManpLaaG+17DIaQulmVZf' +
    'V6rGZaJf9gU2k9ypNpL2IbMrYzurtzLRBwCmk5za26wWa4opzpq1j3vKM3UXAAD//5/UNNEAAAAGSURBVAMAlR0BTE' +
    '5zdiEAAAAASUVORK5CYII=';

  var SVG_OPEN = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" ';
  var STROKE = 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" ' +
               'stroke-linejoin="round"';
  var ICONS = {
    watch: SVG_OPEN + 'width="16" height="16" ' + STROKE + '>' +
      '<rect x="6.5" y="6" width="11" height="12" rx="3"/><path d="M9 6l.8-3h4.4L15 6M9 18l.8 3h4.4l.8-3"/></svg>',
    grip: SVG_OPEN + 'width="20" height="20" fill="currentColor">' +
      '<circle cx="9" cy="6" r="1.6"/><circle cx="15" cy="6" r="1.6"/><circle cx="9" cy="12" r="1.6"/>' +
      '<circle cx="15" cy="12" r="1.6"/><circle cx="9" cy="18" r="1.6"/><circle cx="15" cy="18" r="1.6"/></svg>',
    up: SVG_OPEN + 'width="18" height="18" ' + STROKE + '><path d="M6 14.5l6-6 6 6"/></svg>',
    down: SVG_OPEN + 'width="18" height="18" ' + STROKE + '><path d="M6 9.5l6 6 6-6"/></svg>',
    pencil: SVG_OPEN + 'width="16" height="16" ' + STROKE + '><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>',
    trash: SVG_OPEN + 'width="16" height="16" ' + STROKE + '>' +
      '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/></svg>',
    key: SVG_OPEN + 'width="26" height="26" ' + STROKE + '>' +
      '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2.5 2.5M14 9l2 2"/></svg>',
    lock: SVG_OPEN + 'width="18" height="18" ' + STROKE + '>' +
      '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>'
  };

  var state = {
    accounts: [],
    expanded: -1,  // index of the row showing its actions
    renaming: -1,  // index of the row being renamed
    initial: null, // snapshot at page load, for the unsaved-changes hint
    busy: false,   // a backup is being encrypted or decrypted
    backupOf: null, // account list the shown backup was made from
    restoreMode: 'add',
    restoreArmed: false
  };
  var ui = {};
  var drag = null;
  var reported = { importText: null, manual: null, restore: null };
  var toastTimer = null;
  var clearAllTimer = null;
  var restoreTimer = null;

  // --- Text helpers ---

  function codePointBytes(code) {
    if (code < 0x80) return 1;
    if (code < 0x800) return 2;
    if (code < 0x10000) return 3;
    return 4;
  }

  // Cuts `str` to at most `maxBytes` of UTF-8 without splitting a character.
  function truncateUtf8(str, maxBytes) {
    var bytes = 0;
    for (var i = 0; i < str.length; i++) {
      var code = str.charCodeAt(i);
      var units = 1;
      if (code >= 0xD800 && code <= 0xDBFF && i + 1 < str.length) {
        var low = str.charCodeAt(i + 1);
        if (low >= 0xDC00 && low <= 0xDFFF) {
          code = 0x10000 + ((code - 0xD800) << 10) + (low - 0xDC00);
          units = 2;
        }
      }
      bytes += codePointBytes(code);
      if (bytes > maxBytes) return str.slice(0, i);
      i += units - 1;
    }
    return str;
  }

  function cleanText(str) {
    return String(str || '').replace(/\s+/g, ' ').replace(/^ | $/g, '');
  }

  function cleanName(str) {
    return cleanText(truncateUtf8(cleanText(str), MAX_NAME_BYTES));
  }

  function normalizeSecret(str) {
    return String(str || '').replace(/[\s-]+/g, '').replace(/=+$/, '').toUpperCase();
  }

  function checkSecret(secret) {
    if (!secret) return 'The secret key is missing.';
    if (!/^[A-Z2-7]+$/.test(secret)) {
      return 'The secret key can only contain the letters A\u2013Z and the digits 2\u20137.';
    }
    if (secret.length < 2) return 'The secret key is too short.';
    if (secret.length > MAX_SECRET_LENGTH) {
      return 'The secret key is too long (max. ' + MAX_SECRET_LENGTH + ' characters).';
    }
    return '';
  }

  function isEnter(event) {
    return event.key === 'Enter' || event.keyCode === 13;
  }

  function safeDecode(str) {
    try { return decodeURIComponent(str); } catch (e) { return str; }
  }

  // Clay pastes the stored settings into the page with String#replace, where
  // dollar patterns are special, and inside a script tag. Escape those
  // characters (they can only occur inside JSON strings) so names
  // containing dollar signs or angle brackets can't break the page.
  function escapeForPage(json) {
    return json.replace(/[\u0024<>&\u2028\u2029]/g, function(c) {
      return '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4);
    });
  }

  // --- Accounts ---

  function toAccount(raw) {
    if (!raw || typeof raw !== 'object') return null;
    var name = cleanName(raw.ACCOUNT_NAME);
    var secret = normalizeSecret(raw.ACCOUNT_SECRET);
    if (!name || !secret) return null;
    var period = parseInt(raw.ACCOUNT_PERIOD, 10);
    var digits = parseInt(raw.ACCOUNT_DIGITS, 10);
    var account = {
      ACCOUNT_NAME: name,
      ACCOUNT_SECRET: secret,
      ACCOUNT_PERIOD: period >= 1 && period <= 255 ? period : 30,
      ACCOUNT_DIGITS: digits === 8 ? 8 : 6
    };
    var label = cleanText(raw.ACCOUNT_LABEL).slice(0, MAX_LABEL_LENGTH);
    if (label && label !== name) account.ACCOUNT_LABEL = label;
    return account;
  }

  function parseStored(value) {
    if (!value) return [];
    try {
      var list = JSON.parse(value);
      if (!Array.isArray(list)) return [];
      return list.map(toAccount).filter(function(account) { return account; });
    } catch (e) {
      setTimeout(function() {
        toast('The saved account list could not be read.', { type: 'error' });
      }, 0);
      return [];
    }
  }

  function serializeAccounts() {
    return escapeForPage(JSON.stringify(state.accounts));
  }

  function findBySecret(secret, list) {
    for (var i = 0; i < list.length; i++) {
      if (list[i].ACCOUNT_SECRET === secret) return list[i];
    }
    return null;
  }

  function parseLink(body) {
    var slash = body.indexOf('/');
    var type = (slash >= 0 ? body.slice(0, slash) : body).toLowerCase();
    var rest = slash >= 0 ? body.slice(slash + 1) : '';
    var query = rest.indexOf('?');
    var rawLabel = query >= 0 ? rest.slice(0, query) : rest;
    var label = cleanText(safeDecode(rawLabel));

    var params = {};
    (query >= 0 ? rest.slice(query + 1) : '').split('&').forEach(function(pair) {
      var eq = pair.indexOf('=');
      if (eq <= 0) return;
      var key = pair.slice(0, eq).toLowerCase();
      var value = pair.slice(eq + 1);
      if (key !== 'issuer') value = value.split(/\s/)[0];
      params[key] = cleanText(safeDecode(value.replace(/\+/g, ' ')));
    });

    // The label is "Issuer:account" or just "account". Names may contain a
    // colon themselves (encoded as %3A), so prefer the issuer parameter.
    var issuer = params.issuer || '';
    var user = label;
    if (issuer && label === issuer) {
      user = '';
    } else if (issuer && label.indexOf(issuer + ':') === 0) {
      user = cleanText(label.slice(issuer.length + 1));
    } else {
      var colon = rawLabel.indexOf(':');
      var colonLength = 1;
      if (colon < 0) {
        colon = rawLabel.search(/%3a/i);
        colonLength = 3;
      }
      if (colon >= 0) {
        if (!issuer) issuer = cleanText(safeDecode(rawLabel.slice(0, colon)));
        user = cleanText(safeDecode(rawLabel.slice(colon + colonLength)));
      }
    }
    var name = cleanName(issuer || user) || 'Account';

    if (type !== 'totp') {
      return { name: name, reason: type === 'hotp' ?
        'counter-based (HOTP) codes are not supported' : 'not a TOTP link' };
    }
    var algorithm = (params.algorithm || 'SHA1').toUpperCase();
    if (algorithm !== 'SHA1') {
      return { name: name, reason: algorithm + ' is not supported, only SHA1' };
    }
    var digits = params.digits ? parseInt(params.digits, 10) : 6;
    if (digits !== 6 && digits !== 8) {
      return { name: name, reason: 'only 6 or 8 digit codes are supported' };
    }
    var period = params.period ? parseInt(params.period, 10) : 30;
    if (!(period >= 1 && period <= 255)) {
      return { name: name, reason: 'unsupported refresh interval' };
    }
    var secret = normalizeSecret(params.secret);
    var error = checkSecret(secret);
    if (error) return { name: name, reason: error.charAt(0).toLowerCase() + error.slice(1, -1) };

    return { account: toAccount({
      ACCOUNT_NAME: name,
      ACCOUNT_SECRET: secret,
      ACCOUNT_PERIOD: period,
      ACCOUNT_DIGITS: digits,
      ACCOUNT_LABEL: issuer ? user : ''
    }) };
  }

  // Finds every otpauth:// link in `text` (one per line or simply pasted
  // one after another) and returns the new accounts plus the skipped links.
  function parseLinks(text, existing) {
    var result = { added: [], skipped: [] };
    var pattern = /otpauth(-migration)?:\/\//ig;
    var starts = [];
    var match;
    while ((match = pattern.exec(text))) {
      starts.push({ index: match.index, length: match[0].length, migration: !!match[1] });
    }
    starts.forEach(function(start, i) {
      var end = i + 1 < starts.length ? starts[i + 1].index : text.length;
      var body = cleanText(text.slice(start.index + start.length, end).split(/[\r\n]/)[0]);
      if (start.migration) {
        result.skipped.push({ name: 'Google Authenticator export',
          reason: 'export each account as an otpauth:// link instead' });
        return;
      }
      var parsed = parseLink(body);
      if (!parsed.account) {
        result.skipped.push(parsed);
        return;
      }
      var duplicate = findBySecret(parsed.account.ACCOUNT_SECRET, existing.concat(result.added));
      if (duplicate) {
        result.skipped.push({ name: parsed.account.ACCOUNT_NAME, reason: 'already in your list' });
      } else if (existing.length + result.added.length >= MAX_ACCOUNTS) {
        result.skipped.push({ name: parsed.account.ACCOUNT_NAME,
          reason: 'the list is full (' + MAX_ACCOUNTS + ' accounts)' });
      } else {
        result.added.push(parsed.account);
      }
    });
    return result;
  }

  function avatarColor(name) {
    var hash = 0;
    for (var i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
    return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
  }

  function initialOf(name) {
    var match = /[A-Za-z0-9\u00c0-\ud7ff\ue000-\uffff]/.exec(name);
    return match ? match[0].toUpperCase() : '#';
  }

  function metaText(account) {
    var parts = [account.ACCOUNT_LABEL || 'Key \u2026' + account.ACCOUNT_SECRET.slice(-4)];
    parts.push(account.ACCOUNT_DIGITS + ' digits');
    parts.push(account.ACCOUNT_PERIOD + ' s');
    return parts.join(' \u00b7 ');
  }

  // --- Backup encryption ---
  // The page is a data: URL, which browsers don't treat as a secure context,
  // so Web Crypto isn't available. These are compact implementations of the
  // standard algorithms: PBKDF2-HMAC-SHA256 derives the key from the password
  // and AES-256-GCM encrypts and authenticates the backup.

  var SHA256_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  var SHA256_INIT = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
                     0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

  // Runs the SHA-256 compression on state `v` (8 words) with the message
  // block already in w[0..15] (w has room for 64 words).
  function sha256Compress(v, w) {
    var i, u, t1, t2;
    for (i = 16; i < 64; i++) {
      u = w[i - 2];
      t1 = (u >>> 17 | u << 15) ^ (u >>> 19 | u << 13) ^ (u >>> 10);
      u = w[i - 15];
      t2 = (u >>> 7 | u << 25) ^ (u >>> 18 | u << 14) ^ (u >>> 3);
      w[i] = (((t1 + w[i - 7]) | 0) + ((t2 + w[i - 16]) | 0)) | 0;
    }
    var a = v[0], b = v[1], c = v[2], d = v[3], e = v[4], f = v[5], g = v[6], h = v[7];
    for (i = 0; i < 64; i++) {
      t1 = (((((e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7)) +
        ((e & f) ^ (~e & g))) | 0) + ((h + ((SHA256_K[i] + w[i]) | 0)) | 0)) | 0;
      t2 = (((a >>> 2 | a << 30) ^ (a >>> 13 | a << 19) ^ (a >>> 22 | a << 10)) +
        ((a & b) ^ (a & c) ^ (b & c))) | 0;
      h = g; g = f; f = e; e = (d + t1) | 0;
      d = c; c = b; b = a; a = (t1 + t2) | 0;
    }
    v[0] = (v[0] + a) | 0; v[1] = (v[1] + b) | 0; v[2] = (v[2] + c) | 0; v[3] = (v[3] + d) | 0;
    v[4] = (v[4] + e) | 0; v[5] = (v[5] + f) | 0; v[6] = (v[6] + g) | 0; v[7] = (v[7] + h) | 0;
  }

  function sha256Update(v, w, bytes, pos) {
    for (var i = 0; i < 16; i++) {
      var j = pos + i * 4;
      w[i] = (bytes[j] << 24) | (bytes[j + 1] << 16) | (bytes[j + 2] << 8) | bytes[j + 3];
    }
    sha256Compress(v, w);
  }

  function wordsToBytes(words, count) {
    var out = new Uint8Array(count * 4);
    for (var i = 0; i < count; i++) {
      out[i * 4] = words[i] >>> 24;
      out[i * 4 + 1] = (words[i] >>> 16) & 255;
      out[i * 4 + 2] = (words[i] >>> 8) & 255;
      out[i * 4 + 3] = words[i] & 255;
    }
    return out;
  }

  // SHA-256 of `bytes`, continuing from `state` if given (used for HMAC).
  function sha256(bytes, state, prefixLength) {
    var v = new Int32Array(state || SHA256_INIT);
    var w = new Int32Array(64);
    var total = bytes.length + (prefixLength || 0);
    var padded = new Uint8Array(((bytes.length + 9 + 63) >> 6) << 6);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    var bits = total * 8;
    padded[padded.length - 4] = bits >>> 24;
    padded[padded.length - 3] = (bits >>> 16) & 255;
    padded[padded.length - 2] = (bits >>> 8) & 255;
    padded[padded.length - 1] = bits & 255;
    padded[padded.length - 5] = Math.floor(total / 0x20000000) & 255;
    for (var pos = 0; pos < padded.length; pos += 64) sha256Update(v, w, padded, pos);
    return v;
  }

  // PBKDF2-HMAC-SHA256 (RFC 8018) for a 32-byte key. Keeps the HMAC inner
  // and outer states and works on words in the hot loop. The work is done in
  // slices so the page stays responsive: onProgress(fraction), onDone(key).
  function pbkdf2Sha256(password, salt, iterations, onProgress, onDone) {
    var key = password.length > 64 ? wordsToBytes(sha256(password), 8) : password;
    var pad = new Uint8Array(64);
    var w = new Int32Array(64);
    var inner = new Int32Array(SHA256_INIT);
    var outer = new Int32Array(SHA256_INIT);
    var i;
    for (i = 0; i < 64; i++) pad[i] = (key[i] || 0) ^ 0x36;
    sha256Update(inner, w, pad, 0);
    for (i = 0; i < 64; i++) pad[i] = (key[i] || 0) ^ 0x5c;
    sha256Update(outer, w, pad, 0);

    var msg = new Uint8Array(salt.length + 4);
    msg.set(salt);
    msg[salt.length + 3] = 1; // block index 1: one block gives 32 bytes
    var first = sha256(wordsToBytes(sha256(msg, inner, 64), 8), outer, 64);
    var u = new Int32Array(first);
    var t = new Int32Array(first);
    var s = new Int32Array(8);
    var done = 1;

    function slice() {
      var stop = Math.min(iterations, done + 50000);
      for (; done < stop; done++) {
        // inner: H(ipad-state, U || padding), 96 bytes hashed in total
        for (i = 0; i < 8; i++) { s[i] = inner[i]; w[i] = u[i]; }
        w[8] = 0x80000000 | 0;
        for (i = 9; i < 15; i++) w[i] = 0;
        w[15] = 768;
        sha256Compress(s, w);
        // outer: H(opad-state, inner || padding)
        for (i = 0; i < 8; i++) { w[i] = s[i]; u[i] = outer[i]; }
        w[8] = 0x80000000 | 0;
        for (i = 9; i < 15; i++) w[i] = 0;
        w[15] = 768;
        sha256Compress(u, w);
        for (i = 0; i < 8; i++) t[i] ^= u[i];
      }
      if (done < iterations) {
        if (onProgress) onProgress(done / iterations);
        setTimeout(slice, 0);
      } else {
        onDone(wordsToBytes(t, 8));
      }
    }
    setTimeout(slice, 0);
  }

  var aesTables = null;

  // AES encryption tables, computed once (same construction as SJCL).
  function getAesTables() {
    if (aesTables) return aesTables;
    var enc = [[], [], [], []];
    var sbox = [];
    var d = [];
    var th = [];
    var i, x, xInv, x2, s, tEnc;
    for (i = 0; i < 256; i++) {
      sbox[i] = 0;
      th[(d[i] = i << 1 ^ (i >> 7) * 283) ^ i] = i;
    }
    for (x = xInv = 0; !sbox[x]; x ^= x2 || 1, xInv = th[xInv] || 1) {
      s = xInv ^ xInv << 1 ^ xInv << 2 ^ xInv << 3 ^ xInv << 4;
      s = s >> 8 ^ s & 255 ^ 99;
      sbox[x] = s;
      x2 = d[x];
      tEnc = d[s] * 0x101 ^ s * 0x1010100;
      for (i = 0; i < 4; i++) {
        enc[i][x] = tEnc = tEnc << 24 ^ tEnc >>> 8;
      }
    }
    aesTables = { t: enc, sbox: sbox };
    return aesTables;
  }

  function bytesToWords(bytes) {
    var words = [];
    for (var i = 0; i < bytes.length; i += 4) {
      words.push((bytes[i] << 24) | (bytes[i + 1] << 16) | (bytes[i + 2] << 8) | bytes[i + 3]);
    }
    return words;
  }

  function aesExpandKey(keyBytes) {
    var sbox = getAesTables().sbox;
    var key = bytesToWords(keyBytes);
    var keyLen = key.length;
    var rcon = 1;
    for (var i = keyLen; i < 4 * keyLen + 28; i++) {
      var tmp = key[i - 1];
      if (i % keyLen === 0 || (keyLen === 8 && i % keyLen === 4)) {
        tmp = sbox[tmp >>> 24] << 24 ^ sbox[tmp >> 16 & 255] << 16 ^ sbox[tmp >> 8 & 255] << 8 ^ sbox[tmp & 255];
        if (i % keyLen === 0) {
          tmp = tmp << 8 ^ tmp >>> 24 ^ rcon << 24;
          rcon = rcon << 1 ^ (rcon >> 7) * 283;
        }
      }
      key[i] = key[i - keyLen] ^ tmp;
    }
    return key;
  }

  // Encrypts one 16-byte block given as four words.
  function aesEncryptBlock(key, input) {
    var tables = getAesTables();
    var t0 = tables.t[0], t1 = tables.t[1], t2 = tables.t[2], t3 = tables.t[3], sbox = tables.sbox;
    var a = input[0] ^ key[0], b = input[1] ^ key[1], c = input[2] ^ key[2], d = input[3] ^ key[3];
    var a2, b2, c2, i;
    var rounds = key.length / 4 - 2;
    var k = 4;
    var out = [0, 0, 0, 0];
    for (i = 0; i < rounds; i++) {
      a2 = t0[a >>> 24] ^ t1[b >> 16 & 255] ^ t2[c >> 8 & 255] ^ t3[d & 255] ^ key[k];
      b2 = t0[b >>> 24] ^ t1[c >> 16 & 255] ^ t2[d >> 8 & 255] ^ t3[a & 255] ^ key[k + 1];
      c2 = t0[c >>> 24] ^ t1[d >> 16 & 255] ^ t2[a >> 8 & 255] ^ t3[b & 255] ^ key[k + 2];
      d = t0[d >>> 24] ^ t1[a >> 16 & 255] ^ t2[b >> 8 & 255] ^ t3[c & 255] ^ key[k + 3];
      k += 4;
      a = a2; b = b2; c = c2;
    }
    for (i = 0; i < 4; i++) {
      out[i] = sbox[a >>> 24] << 24 ^ sbox[b >> 16 & 255] << 16 ^ sbox[c >> 8 & 255] << 8 ^
        sbox[d & 255] ^ key[k++];
      a2 = a; a = b; b = c; c = d; d = a2;
    }
    return out;
  }

  // Multiplication in GF(2^128) as defined for GHASH.
  function gcmMultiply(x, y) {
    var z = [0, 0, 0, 0];
    var v = y.slice(0);
    for (var i = 0; i < 128; i++) {
      if (x[i >>> 5] & (1 << (31 - (i & 31)))) {
        z[0] ^= v[0]; z[1] ^= v[1]; z[2] ^= v[2]; z[3] ^= v[3];
      }
      var lsb = v[3] & 1;
      v[3] = (v[3] >>> 1) | ((v[2] & 1) << 31);
      v[2] = (v[2] >>> 1) | ((v[1] & 1) << 31);
      v[1] = (v[1] >>> 1) | ((v[0] & 1) << 31);
      v[0] = v[0] >>> 1;
      if (lsb) v[0] ^= 0xe1000000;
    }
    return z;
  }

  function ghash(h, aad, data) {
    var y = [0, 0, 0, 0];
    function absorb(bytes) {
      for (var pos = 0; pos < bytes.length; pos += 16) {
        var block = new Uint8Array(16);
        block.set(bytes.subarray(pos, Math.min(pos + 16, bytes.length)));
        var words = bytesToWords(block);
        y = gcmMultiply([y[0] ^ words[0], y[1] ^ words[1], y[2] ^ words[2], y[3] ^ words[3]], h);
      }
    }
    absorb(aad);
    absorb(data);
    y = gcmMultiply([y[0], y[1] ^ (aad.length * 8), y[2], y[3] ^ (data.length * 8)], h);
    return y;
  }

  // AES-GCM with a 96-bit IV and a 128-bit tag (NIST SP 800-38D). XORing the
  // key stream is the same for both directions; returns the processed bytes
  // and the tag computed over the ciphertext.
  function aesGcm(keyBytes, iv, input, aad, decrypt) {
    var key = aesExpandKey(keyBytes);
    var h = aesEncryptBlock(key, [0, 0, 0, 0]);
    var ivWords = bytesToWords(iv);
    var counter = [ivWords[0], ivWords[1], ivWords[2], 1];
    var tagMask = aesEncryptBlock(key, counter);
    var output = new Uint8Array(input.length);
    for (var pos = 0; pos < input.length; pos += 16) {
      counter[3] = (counter[3] + 1) | 0;
      var stream = wordsToBytes(aesEncryptBlock(key, counter), 4);
      for (var i = 0; i < 16 && pos + i < input.length; i++) output[pos + i] = input[pos + i] ^ stream[i];
    }
    var s = ghash(h, aad, decrypt ? input : output);
    var tag = wordsToBytes([s[0] ^ tagMask[0], s[1] ^ tagMask[1], s[2] ^ tagMask[2], s[3] ^ tagMask[3]], 4);
    return { data: output, tag: tag };
  }

  function utf8Bytes(str) {
    var binary = unescape(encodeURIComponent(str));
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function utf8String(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return decodeURIComponent(escape(binary));
  }

  function base64UrlEncode(bytes) {
    var binary = '';
    for (var i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+/g, '');
  }

  function base64UrlDecode(text) {
    var binary = atob(text.replace(/-/g, '+').replace(/_/g, '/') +
      ['', '', '==', '='][text.length % 4]);
    var bytes = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  }

  function randomBytes(count) {
    var bytes = new Uint8Array(count);
    window.crypto.getRandomValues(bytes);
    return bytes;
  }

  function canEncrypt() {
    return !!(window.crypto && window.crypto.getRandomValues && window.Uint8Array && window.btoa);
  }

  function passwordBytes(password) {
    return utf8Bytes(password.normalize ? password.normalize('NFC') : password);
  }

  // Encrypted backups look like
  //   pebble-auth-backup:1:<iterations>:<salt>:<iv>:<ciphertext and tag>
  // (base64url). Everything before the last part is authenticated as well.
  var BACKUP_PREFIX = 'pebble-auth-backup:';
  var BACKUP_PATTERN = /pebble-auth-backup:(\d+):(\d+):([A-Za-z0-9_-]+):([A-Za-z0-9_-]+):([A-Za-z0-9_-]+)/;

  function isEncryptedBackup(text) {
    return text.indexOf(BACKUP_PREFIX) >= 0;
  }

  function encryptBackup(text, password, onProgress, onDone) {
    var salt = randomBytes(16);
    var iv = randomBytes(12);
    var header = BACKUP_PREFIX + '1:' + BACKUP_ITERATIONS + ':' + base64UrlEncode(salt) + ':' +
      base64UrlEncode(iv);
    pbkdf2Sha256(passwordBytes(password), salt, BACKUP_ITERATIONS, onProgress, function(key) {
      var sealed = aesGcm(key, iv, utf8Bytes(text), utf8Bytes(header), false);
      var payload = new Uint8Array(sealed.data.length + 16);
      payload.set(sealed.data);
      payload.set(sealed.tag, sealed.data.length);
      onDone(header + ':' + base64UrlEncode(payload));
    });
  }

  // Calls onDone({ text }) or onDone({ error }) with error 'format', 'version'
  // or 'password'.
  function decryptBackup(text, password, onProgress, onDone) {
    var match = BACKUP_PATTERN.exec(text.replace(/\s+/g, ''));
    if (!match) return onDone({ error: 'format' });
    if (match[1] !== '1') return onDone({ error: 'version' });
    var iterations = parseInt(match[2], 10);
    var salt, iv, payload;
    try {
      salt = base64UrlDecode(match[3]);
      iv = base64UrlDecode(match[4]);
      payload = base64UrlDecode(match[5]);
    } catch (e) {
      return onDone({ error: 'format' });
    }
    if (!(iterations >= 1000 && iterations <= 10000000) || salt.length < 8 || iv.length !== 12 ||
        payload.length < 16) {
      return onDone({ error: 'format' });
    }
    var header = BACKUP_PREFIX + match[1] + ':' + match[2] + ':' + match[3] + ':' + match[4];
    pbkdf2Sha256(passwordBytes(password), salt, iterations, onProgress, function(key) {
      var data = payload.subarray(0, payload.length - 16);
      var opened = aesGcm(key, iv, data, utf8Bytes(header), true);
      var diff = 0;
      for (var i = 0; i < 16; i++) diff |= opened.tag[i] ^ payload[data.length + i];
      if (diff) return onDone({ error: 'password' });
      try {
        onDone({ text: utf8String(opened.data) });
      } catch (e) {
        onDone({ error: 'format' });
      }
    });
  }

  // --- DOM helpers ---

  function el(tag, props, children) {
    var node = document.createElement(tag);
    Object.keys(props || {}).forEach(function(key) {
      var value = props[key];
      if (value === undefined || value === null || value === false) return;
      if (key === 'text') node.textContent = value;
      else if (key === 'html') node.innerHTML = value;  // static markup only, never user data
      else if (key === 'className') node.className = value;
      else node.setAttribute(key, value === true ? '' : value);
    });
    (children || []).forEach(function(child) {
      node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
    });
    return node;
  }

  function field(label, control, extraClass) {
    return el('label', { className: 'field' + (extraClass || '') }, [
      el('span', { className: 'field-label', text: label }), control
    ]);
  }

  function iconButton(act, icon, label, disabled) {
    return el('button', { type: 'button', className: 'chip-btn icon-btn', 'data-act': act,
      'aria-label': label, title: label, disabled: disabled, html: ICONS[icon] });
  }

  function textButton(act, icon, label, extraClass) {
    var button = el('button', { type: 'button', className: 'chip-btn' + (icon ? ' has-icon' : '') +
      (extraClass || ''), 'data-act': act, html: icon ? ICONS[icon] : '' });
    button.appendChild(el('span', { className: 'chip-label', text: label }));
    return button;
  }

  // Scrolls a row into the area above the sticky save bar.
  function revealRow(index) {
    revealElement(ui.list.querySelector('[data-idx="' + index + '"]'));
  }

  function revealElement(node) {
    if (!node) return;
    var rect = node.getBoundingClientRect();
    var bottom = window.innerHeight - (ui.saveBar ? ui.saveBar.offsetHeight : 0) - 12;
    if (rect.bottom > bottom) window.scrollBy(0, Math.min(rect.bottom - bottom, rect.top - 12));
    else if (rect.top < 12) window.scrollBy(0, rect.top - 12);
  }

  function toast(message, options) {
    options = options || {};
    if (!ui.toastWrap) {
      ui.toastWrap = el('div', { className: 'auth-toast-wrap', 'aria-live': 'polite' });
      document.body.appendChild(ui.toastWrap);
    }
    var wrap = ui.toastWrap;
    wrap.innerHTML = '';
    var box = el('div', { className: 'auth-toast' + (options.type ? ' is-' + options.type : ''),
      role: 'status' }, [el('span', { className: 'auth-toast-text', text: message })]);
    if (options.action) {
      var action = el('button', { type: 'button', className: 'auth-toast-action', text: options.action });
      action.addEventListener('click', function() {
        hide();
        options.onAction();
      });
      box.appendChild(action);
    }
    wrap.appendChild(box);
    box.getBoundingClientRect(); // start the fade-in from the initial style
    box.classList.add('is-visible');

    function hide() {
      box.classList.remove('is-visible');
      setTimeout(function() {
        if (box.parentNode) box.parentNode.removeChild(box);
      }, 250);
    }
    clearTimeout(toastTimer);
    toastTimer = setTimeout(hide, options.action ? 6000 : 3200);
  }

  function showMessage(box, type, title, items) {
    box.innerHTML = '';
    box.className = 'form-msg' + (type ? ' is-' + type : '');
    if (!type) return;
    box.appendChild(el('div', { text: title }));
    if (items && items.length) {
      box.appendChild(el('ul', {}, items.map(function(item) {
        return el('li', {}, [el('strong', { text: item.name }), ' \u2013 ' + item.reason]);
      })));
    }
  }

  // --- Unsaved changes ---

  function snapshot() {
    var loop = clayConfig.getItemByMessageKey('SETTING_LOOP_LIST');
    return serializeAccounts() + '|' + (loop ? loop.get() : '');
  }

  function updateDirty() {
    if (state.initial === null) return;
    var dirty = snapshot() !== state.initial;
    document.body.classList.toggle('is-dirty', dirty);
    if (ui.saveHint) {
      ui.saveHint.textContent = dirty ? 'You have unsaved changes' :
        'Changes are sent to your watch when you save';
    }
  }

  // --- Account list ---

  function renderAccounts(focusIndex, focusAct) {
    if (!ui.list || drag) return;
    var accounts = state.accounts;
    ui.list.innerHTML = '';
    accounts.forEach(function(account, index) {
      ui.list.appendChild(renderRow(account, index));
    });
    ui.count.textContent = accounts.length + ' / ' + MAX_ACCOUNTS;
    ui.empty.classList.toggle('hide', accounts.length > 0);
    ui.foot.classList.toggle('hide', accounts.length === 0);
    disarmClearAll();
    if (state.backupOf !== null && state.backupOf !== serializeAccounts()) hideBackupResult();

    if (state.renaming >= 0) {
      var input = ui.list.querySelector('.acc-rename');
      if (input) {
        input.focus();
        input.select();
      }
    } else if (focusAct) {
      var target = ui.list.querySelector('[data-idx="' + focusIndex + '"] [data-act="' + focusAct + '"]');
      if (target && !target.disabled) target.focus();
    }
    updateDirty();
  }

  function renderRow(account, index) {
    var open = state.expanded === index;
    var renaming = state.renaming === index;
    var row = el('li', { className: 'acc-row' + (open ? ' is-open' : ''), 'data-idx': index });
    var main = el('div', { className: 'acc-main' });

    var avatar = el('span', { className: 'acc-avatar', 'aria-hidden': 'true', text: initialOf(account.ACCOUNT_NAME) });
    avatar.style.backgroundColor = avatarColor(account.ACCOUNT_NAME);
    main.appendChild(avatar);

    if (renaming) {
      main.appendChild(el('input', { type: 'text', className: 'acc-rename', value: account.ACCOUNT_NAME,
        'aria-label': 'Account name', autocomplete: 'off', autocorrect: 'off', spellcheck: 'false',
        enterkeyhint: 'done' }));
    } else {
      main.appendChild(el('button', { type: 'button', className: 'acc-toggle', 'data-act': 'toggle',
        'aria-expanded': open ? 'true' : 'false' }, [
        el('span', { className: 'acc-name', text: account.ACCOUNT_NAME }),
        el('span', { className: 'acc-meta', text: metaText(account) })
      ]));
      if (window.PointerEvent && state.accounts.length > 1) {
        main.appendChild(el('span', { className: 'acc-handle', 'data-drag': 'true',
          title: 'Drag to reorder', 'aria-hidden': 'true', html: ICONS.grip }));
      }
    }
    row.appendChild(main);

    if (renaming) {
      row.appendChild(el('div', { className: 'acc-actions' }, [
        textButton('rename-cancel', null, 'Cancel'),
        textButton('rename-save', null, 'Save name', ' is-primary')
      ]));
    } else if (open) {
      row.appendChild(el('div', { className: 'acc-actions' }, [
        iconButton('up', 'up', 'Move up', index === 0),
        iconButton('down', 'down', 'Move down', index === state.accounts.length - 1),
        textButton('rename', 'pencil', 'Rename'),
        textButton('delete', 'trash', 'Delete', ' is-danger')
      ]));
    }
    return row;
  }

  function moveAccount(from, to) {
    if (to < 0 || to >= state.accounts.length || from === to) return;
    var account = state.accounts.splice(from, 1)[0];
    state.accounts.splice(to, 0, account);
  }

  function saveRename(index) {
    var input = ui.list.querySelector('.acc-rename');
    if (!input) return;
    var raw = cleanText(input.value);
    if (!raw) {
      toast('Enter a name for the account.', { type: 'error' });
      input.focus();
      return;
    }
    var name = cleanName(raw);
    state.accounts[index].ACCOUNT_NAME = name;
    if (state.accounts[index].ACCOUNT_LABEL === name) delete state.accounts[index].ACCOUNT_LABEL;
    state.renaming = -1;
    renderAccounts(index, 'rename');
    if (name !== raw) toast('Name shortened to fit on the watch.');
  }

  function onListClick(event) {
    var button = event.target.closest ? event.target.closest('[data-act]') : null;
    if (!button || !ui.list.contains(button)) return;
    var row = button.closest('[data-idx]');
    var index = parseInt(row.getAttribute('data-idx'), 10);
    var account = state.accounts[index];
    if (!account) return;

    switch (button.getAttribute('data-act')) {
      case 'toggle':
        state.expanded = state.expanded === index ? -1 : index;
        state.renaming = -1;
        renderAccounts(index, 'toggle');
        if (state.expanded === index) revealRow(index);
        break;
      case 'up':
      case 'down':
        var to = index + (button.getAttribute('data-act') === 'up' ? -1 : 1);
        moveAccount(index, to);
        state.expanded = to;
        renderAccounts(to, button.getAttribute('data-act'));
        revealRow(to);
        break;
      case 'rename':
        state.renaming = index;
        renderAccounts();
        break;
      case 'rename-save':
        saveRename(index);
        break;
      case 'rename-cancel':
        state.renaming = -1;
        renderAccounts(index, 'rename');
        break;
      case 'delete':
        state.accounts.splice(index, 1);
        state.expanded = -1;
        renderAccounts();
        toast('\u201c' + account.ACCOUNT_NAME + '\u201d removed', { action: 'Undo', onAction: function() {
          state.accounts.splice(Math.min(index, state.accounts.length), 0, account);
          renderAccounts();
        } });
        break;
    }
  }

  function onListKeyDown(event) {
    if (!event.target.classList.contains('acc-rename')) return;
    var index = parseInt(event.target.closest('[data-idx]').getAttribute('data-idx'), 10);
    if (isEnter(event)) {
      event.preventDefault(); // Enter must not submit the whole page
      saveRename(index);
    } else if (event.key === 'Escape') {
      state.renaming = -1;
      renderAccounts(index, 'rename');
    }
  }

  function disarmClearAll() {
    clearTimeout(clearAllTimer);
    if (ui.clearAll) {
      ui.clearAll.classList.remove('is-armed');
      ui.clearAll.textContent = 'Delete all accounts';
    }
  }

  function onClearAll() {
    if (!ui.clearAll.classList.contains('is-armed')) {
      ui.clearAll.classList.add('is-armed');
      ui.clearAll.textContent = 'Tap again to delete all ' + state.accounts.length;
      clearTimeout(clearAllTimer);
      clearAllTimer = setTimeout(disarmClearAll, 4000);
      return;
    }
    var previous = state.accounts;
    state.accounts = [];
    state.expanded = -1;
    state.renaming = -1;
    renderAccounts();
    toast('All accounts removed', { action: 'Undo', onAction: function() {
      state.accounts = previous;
      renderAccounts();
    } });
  }

  // Drag to reorder with the grip on the right. The dragged row follows the
  // finger while the rows it passes slide out of the way; the new order is
  // applied on release. Scrolls the page when dragging near an edge.
  function onDragStart(event) {
    var handle = event.target.closest ? event.target.closest('[data-drag]') : null;
    if (!handle || drag || (event.button !== undefined && event.button !== 0)) return;
    event.preventDefault();
    var row = handle.closest('[data-idx]');
    var rows = Array.prototype.slice.call(ui.list.children);
    var index = rows.indexOf(row);
    var scrollY = window.pageYOffset;
    drag = {
      pointerId: event.pointerId,
      handle: handle,
      rows: rows,
      index: index,
      target: index,
      startY: event.clientY,
      lastY: event.clientY,
      startScroll: scrollY,
      height: row.getBoundingClientRect().height,
      mids: rows.map(function(item) {
        var rect = item.getBoundingClientRect();
        return rect.top + scrollY + rect.height / 2;
      })
    };
    try {
      handle.setPointerCapture(event.pointerId);
    } catch (e) {
      // keeps working through the list's own pointer events
    }
    row.classList.add('is-dragging');
    ui.list.classList.add('is-sorting');
    drag.frame = window.requestAnimationFrame(autoScroll);
  }

  function updateDrag() {
    var offset = drag.lastY - drag.startY + (window.pageYOffset - drag.startScroll);
    drag.rows[drag.index].style.transform = 'translateY(' + offset + 'px)';
    var center = drag.mids[drag.index] + offset;
    var target = drag.index;
    var k;
    for (k = drag.index + 1; k < drag.rows.length; k++) {
      if (center > drag.mids[k]) target = k;
    }
    for (k = drag.index - 1; k >= 0; k--) {
      if (center < drag.mids[k]) target = k;
    }
    drag.target = target;
    for (k = 0; k < drag.rows.length; k++) {
      if (k === drag.index) continue;
      var shift = 0;
      if (target > drag.index && k > drag.index && k <= target) shift = -drag.height;
      if (target < drag.index && k < drag.index && k >= target) shift = drag.height;
      drag.rows[k].style.transform = shift ? 'translateY(' + shift + 'px)' : '';
    }
  }

  function autoScroll() {
    if (!drag) return;
    var top = 70;
    var bottom = window.innerHeight - (ui.saveBar ? ui.saveBar.offsetHeight : 0) - 50;
    var speed = 0;
    if (drag.lastY < top) speed = -Math.ceil((top - drag.lastY) / 5);
    else if (drag.lastY > bottom) speed = Math.ceil((drag.lastY - bottom) / 5);
    if (speed) {
      window.scrollBy(0, speed);
      updateDrag();
    }
    drag.frame = window.requestAnimationFrame(autoScroll);
  }

  function onDragMove(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    event.preventDefault();
    drag.lastY = event.clientY;
    updateDrag();
  }

  function onDragEnd(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    var from = drag.index;
    var to = event.type === 'pointercancel' ? from : drag.target;
    window.cancelAnimationFrame(drag.frame);
    drag.rows.forEach(function(item) { item.style.transform = ''; });
    ui.list.classList.remove('is-sorting');
    drag = null;
    if (to !== from) {
      moveAccount(from, to);
      if (state.expanded === from) state.expanded = to;
      else if (state.expanded >= 0) state.expanded = -1;
    }
    renderAccounts();
  }

  // --- Adding accounts ---

  function addAccount(fromSave) {
    var nameField = ui.nameInput;
    var secretField = ui.secretInput;
    var rawName = cleanText(nameField.value);
    var secret = normalizeSecret(secretField.value);
    var problem = null;
    var field = null;

    if (!rawName) {
      problem = 'Enter a name for the account.';
      field = nameField;
    } else if (checkSecret(secret)) {
      problem = checkSecret(secret);
      field = secretField;
    } else if (findBySecret(secret, state.accounts)) {
      problem = 'This key is already in your list as \u201c' +
        findBySecret(secret, state.accounts).ACCOUNT_NAME + '\u201d.';
      field = secretField;
    } else if (state.accounts.length >= MAX_ACCOUNTS) {
      problem = 'The list is full (' + MAX_ACCOUNTS + ' accounts).';
    }

    [nameField, secretField].forEach(function(input) {
      input.parentNode.classList.toggle('is-invalid', input === field);
    });
    if (problem) {
      reported.manual = nameField.value + '\n' + secretField.value;
      showMessage(ui.manualMsg, 'error', problem);
      if (field && !fromSave) field.focus();
      return false;
    }

    var account = toAccount({
      ACCOUNT_NAME: rawName,
      ACCOUNT_SECRET: secret,
      ACCOUNT_PERIOD: ui.periodSelect.value,
      ACCOUNT_DIGITS: ui.digitsSelect.value
    });
    state.accounts.push(account);
    state.expanded = -1;
    renderAccounts();
    nameField.value = '';
    secretField.value = '';
    showMessage(ui.manualMsg, null);
    toast('\u201c' + account.ACCOUNT_NAME + '\u201d added' +
      (account.ACCOUNT_NAME !== rawName ? ' (name shortened for the watch)' : ''), { type: 'success' });
    return true;
  }

  function importLinks() {
    var text = ui.importText.value;
    if (isEncryptedBackup(text)) {
      // Hand an encrypted backup over to the restore form, which asks for the password.
      ui.importText.value = '';
      showMessage(ui.importMsg, null);
      ui.restoreText.value = text;
      updateRestoreFields();
      selectBackupTab('restore');
      showMessage(ui.restoreMsg, 'warning', 'This is an encrypted backup. Enter its password to restore it.');
      revealElement(ui.restorePasswordField);
      ui.restorePassword.focus();
      return false;
    }
    if (!/otpauth/i.test(text)) {
      reported.importText = text;
      showMessage(ui.importMsg, 'error', text.replace(/\s/g, '') ?
        'No otpauth:// link found. Links start with \u201cotpauth://totp/\u201d.' :
        'Paste at least one otpauth:// link first.');
      return false;
    }
    var result = parseLinks(text, state.accounts);
    if (result.added.length) {
      state.accounts = state.accounts.concat(result.added);
      state.expanded = -1;
      renderAccounts();
      ui.importText.value = '';
    }
    reported.importText = ui.importText.value;
    var count = result.added.length;
    var title = count ? 'Imported ' + count + (count === 1 ? ' account.' : ' accounts.') :
      'Nothing was imported.';
    if (result.skipped.length) {
      title += ' Skipped ' + result.skipped.length + ':';
      showMessage(ui.importMsg, count ? 'warning' : 'error', title, result.skipped);
    } else {
      showMessage(ui.importMsg, 'success', title);
    }
    if (count) toast(title.split('.')[0], { type: 'success' });
    return result.skipped.length === 0;
  }

  // Pasted links or a filled-in form are easy to forget before saving: add
  // them automatically, and only keep the page open if something needs a
  // look. Input that was already reported doesn't block saving a second time.
  function addPendingInput() {
    if (state.busy) {
      toast('Please wait until the backup is ready.');
      return false;
    }
    var ok = true;
    var text = ui.importText ? ui.importText.value : '';
    if (/\S/.test(text) && text !== reported.importText) {
      if (!importLinks()) {
        selectTab('import');
        ok = false;
      }
    }
    var manual = ui.nameInput ? ui.nameInput.value + '\n' + ui.secretInput.value : '';
    if (/\S/.test(manual) && manual !== reported.manual) {
      if (!addAccount(true)) {
        selectTab('manual');
        ok = false;
      }
    }
    var restore = ui.restoreText ? ui.restoreText.value : '';
    if (/\S/.test(restore) && restore !== reported.restore) {
      reported.restore = restore;
      selectBackupTab('restore');
      showMessage(ui.restoreMsg, 'warning', 'This backup hasn\'t been restored yet. Tap \u201cRestore\u201d, ' +
        'or save again to continue without it.');
      revealElement(ui.restoreMsg);
      ok = false;
    }
    return ok;
  }

  function selectTabIn(tabs, panels, name) {
    tabs.forEach(function(tab) {
      var selected = tab.getAttribute('data-tab') === name;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
    });
    panels.forEach(function(panel) {
      panel.classList.toggle('hide', panel.getAttribute('data-panel') !== name);
    });
  }

  function selectTab(name) {
    selectTabIn(ui.tabs, ui.panels, name);
  }

  function selectBackupTab(name) {
    selectTabIn(ui.backupTabs, ui.backupPanels, name);
  }

  // --- Components ---

  var displayOnly = {
    get: function() { return ''; },
    set: function() { return this; }
  };

  clayConfig.registerComponent({
    name: 'auth-header',
    template: '<div class="component auth-header"></div>',
    manipulator: displayOnly,
    initialize: function() {
      var root = this.$element[0];
      root.appendChild(el('div', { className: 'hero' }, [
        el('div', { className: 'hero-icon' }, [el('img', { src: APP_ICON, alt: '' })]),
        el('div', {}, [
          el('h1', { text: 'Authenticator' }),
          el('p', { text: 'Two-factor codes on your Pebble' })
        ])
      ]));
      var info = clayConfig.meta && clayConfig.meta.activeWatchInfo;
      var watchName = info && WATCH_NAMES[info.platform];
      if (watchName) {
        root.appendChild(el('div', { className: 'watch-chip' }, [
          el('span', { className: 'watch-chip-icon', html: ICONS.watch }),
          el('span', { text: watchName })
        ]));
      }
    }
  });

  clayConfig.registerComponent({
    name: 'auth-accounts',
    template: '<div class="component auth-card auth-accounts"></div>',
    manipulator: {
      get: function() { return serializeAccounts(); },
      set: function(value) {
        state.accounts = parseStored(value);
        state.expanded = -1;
        state.renaming = -1;
        renderAccounts();
        return this;
      }
    },
    initialize: function() {
      var root = this.$element[0];
      ui.count = el('span', { className: 'count-badge' });
      ui.list = el('ul', { className: 'acc-list' });
      ui.empty = el('div', { className: 'acc-empty' }, [
        el('div', { className: 'acc-empty-icon', html: ICONS.key }),
        el('strong', { text: 'No accounts yet' }),
        el('p', { text: 'Import otpauth:// links or enter a secret key below.' })
      ]);
      ui.clearAll = el('button', { type: 'button', className: 'link-btn', text: 'Delete all accounts' });
      ui.foot = el('div', { className: 'card-foot' }, [ui.clearAll]);
      root.appendChild(el('div', { className: 'card-head' }, [
        el('h2', { text: 'Accounts' }), ui.count
      ]));
      root.appendChild(ui.list);
      root.appendChild(ui.empty);
      root.appendChild(ui.foot);

      ui.list.addEventListener('click', onListClick);
      ui.list.addEventListener('keydown', onListKeyDown);
      ui.clearAll.addEventListener('click', onClearAll);
      if (window.PointerEvent) {
        ui.list.addEventListener('pointerdown', onDragStart);
        ui.list.addEventListener('pointermove', onDragMove);
        ui.list.addEventListener('pointerup', onDragEnd);
        ui.list.addEventListener('pointercancel', onDragEnd);
        ui.list.addEventListener('lostpointercapture', onDragEnd);
      }
    }
  });

  clayConfig.registerComponent({
    name: 'auth-add',
    template: '<div class="component auth-card auth-add"></div>',
    manipulator: displayOnly,
    initialize: function() {
      var root = this.$element[0];
      ui.tabs = [
        el('button', { type: 'button', role: 'tab', 'data-tab': 'import', text: 'Import links' }),
        el('button', { type: 'button', role: 'tab', 'data-tab': 'manual', text: 'Enter key' })
      ];
      ui.importText = el('textarea', { rows: '4', autocomplete: 'off', autocorrect: 'off',
        autocapitalize: 'off', spellcheck: 'false',
        placeholder: 'otpauth://totp/Example:alice@example.com?secret=JBSWY3DPEHPK3PXP&issuer=Example' });
      ui.importMsg = el('div', { className: 'form-msg', role: 'status', 'aria-live': 'polite' });
      var importButton = el('button', { type: 'button', className: 'btn-primary', text: 'Import' });

      ui.nameInput = el('input', { type: 'text', autocomplete: 'off', autocorrect: 'off',
        placeholder: 'e.g. GitHub', enterkeyhint: 'next' });
      ui.secretInput = el('input', { type: 'text', className: 'mono', autocomplete: 'off',
        autocorrect: 'off', autocapitalize: 'characters', spellcheck: 'false',
        placeholder: 'JBSW Y3DP EHPK 3PXP', enterkeyhint: 'done' });
      ui.digitsSelect = el('select', {}, [
        el('option', { value: '6', text: '6 digits' }), el('option', { value: '8', text: '8 digits' })
      ]);
      ui.periodSelect = el('select', {}, [
        el('option', { value: '30', text: '30 seconds' }), el('option', { value: '60', text: '60 seconds' })
      ]);
      ui.manualMsg = el('div', { className: 'form-msg', role: 'status', 'aria-live': 'polite' });
      var addButton = el('button', { type: 'button', className: 'btn-primary', text: 'Add account' });

      ui.panels = [
        el('div', { className: 'panel', 'data-panel': 'import', role: 'tabpanel' }, [
          field('otpauth:// links', ui.importText),
          el('p', { className: 'field-hint', text: 'Paste one or more links, for example exported from ' +
            'another authenticator app. Each link becomes one account.' }),
          ui.importMsg,
          importButton
        ]),
        el('div', { className: 'panel hide', 'data-panel': 'manual', role: 'tabpanel' }, [
          field('Account name', ui.nameInput),
          field('Secret key', ui.secretInput),
          el('div', { className: 'field-row' }, [
            field('Code length', ui.digitsSelect, ' field-select'),
            field('New code every', ui.periodSelect, ' field-select')
          ]),
          el('p', { className: 'field-hint', text: 'Use the values the service shows next to the key. ' +
            'Most use 6 digits and 30 seconds.' }),
          ui.manualMsg,
          addButton
        ])
      ];

      root.appendChild(el('div', { className: 'card-head' }, [el('h2', { text: 'Add accounts' })]));
      root.appendChild(el('div', { className: 'segmented', role: 'tablist' }, ui.tabs));
      ui.panels.forEach(function(panel) { root.appendChild(panel); });
      selectTab('import');

      ui.tabs.forEach(function(tab) {
        tab.addEventListener('click', function() { selectTab(tab.getAttribute('data-tab')); });
      });
      importButton.addEventListener('click', importLinks);
      addButton.addEventListener('click', function() { addAccount(false); });
      ui.nameInput.addEventListener('keydown', function(event) {
        if (isEnter(event)) {
          event.preventDefault(); // Enter must not submit the whole page
          ui.secretInput.focus();
        }
      });
      ui.secretInput.addEventListener('keydown', function(event) {
        if (isEnter(event)) {
          event.preventDefault();
          addAccount(false);
        }
      });
      [ui.nameInput, ui.secretInput].forEach(function(input) {
        input.addEventListener('input', function() {
          input.parentNode.classList.remove('is-invalid');
        });
      });
    }
  });

  // --- Backup and restore ---

  // A backup without password is a list of standard otpauth:// links, so
  // other authenticator apps can import it as well.
  function accountToLink(account) {
    var name = encodeURIComponent(account.ACCOUNT_NAME);
    var label = account.ACCOUNT_LABEL ? name + ':' + encodeURIComponent(account.ACCOUNT_LABEL) : name;
    return 'otpauth://totp/' + label + '?secret=' + account.ACCOUNT_SECRET + '&issuer=' + name +
      '&algorithm=SHA1&digits=' + account.ACCOUNT_DIGITS + '&period=' + account.ACCOUNT_PERIOD;
  }

  // Shows a working label with progress on `button` while `work` runs.
  function runBusy(button, label, work, then) {
    state.busy = true;
    var original = button.textContent;
    button.classList.add('is-busy');
    button.textContent = label + '\u2026';
    setTimeout(function() { // let the label appear before the work starts
      work(function(fraction) {
        button.textContent = label + '\u2026 ' + Math.round(fraction * 100) + ' %';
      }, function(result) {
        state.busy = false;
        button.classList.remove('is-busy');
        button.textContent = original;
        then(result);
      });
    }, 30);
  }

  function hideBackupResult() {
    state.backupOf = null;
    if (ui.backupResult) ui.backupResult.classList.add('hide');
  }

  function markInvalid(input, invalid) {
    input.parentNode.classList.toggle('is-invalid', invalid);
  }

  function createBackup() {
    if (state.busy) return;
    var count = state.accounts.length;
    if (!count) {
      showMessage(ui.backupMsg, 'error', 'There are no accounts to back up yet.');
      return;
    }
    var text = state.accounts.map(accountToLink).join('\n');
    var listState = serializeAccounts();
    if (!ui.encryptToggle.checked) {
      showMessage(ui.backupMsg, null);
      showBackup(text, false, listState);
      return;
    }
    var password = ui.backupPassword.value;
    markInvalid(ui.backupPassword, false);
    markInvalid(ui.backupRepeat, false);
    if (password.length < MIN_PASSWORD_LENGTH) {
      markInvalid(ui.backupPassword, true);
      showMessage(ui.backupMsg, 'error', 'Use a password with at least ' + MIN_PASSWORD_LENGTH + ' characters.');
      ui.backupPassword.focus();
      return;
    }
    if (password !== ui.backupRepeat.value) {
      markInvalid(ui.backupRepeat, true);
      showMessage(ui.backupMsg, 'error', 'The two passwords don\'t match.');
      ui.backupRepeat.focus();
      return;
    }
    showMessage(ui.backupMsg, null);
    runBusy(ui.backupButton, 'Encrypting', function(onProgress, onDone) {
      encryptBackup(text, password, onProgress, onDone);
    }, function(backup) {
      ui.backupPassword.value = '';
      ui.backupRepeat.value = '';
      showBackup(backup, true, listState);
    });
  }

  function showBackup(text, encrypted, listState) {
    var count = state.accounts.length;
    state.backupOf = listState;
    ui.backupOutput.value = text;
    ui.backupNote.className = 'form-msg ' + (encrypted ? 'is-success' : 'is-warning');
    ui.backupNote.textContent = (count === 1 ? '1 account. ' : count + ' accounts. ') + (encrypted ?
      'Encrypted with your password. Without the password this backup can\'t be opened.' :
      'Not encrypted: anyone who can read this text can create your codes. Keep it somewhere ' +
      'safe, for example in a password manager.');
    ui.backupResult.classList.remove('hide');
    revealElement(ui.backupResult);
  }

  // Copies through a temporary read-only text field: the page is no secure
  // context, so the asynchronous Clipboard API isn't available.
  function copyBackup() {
    var text = ui.backupOutput.value;
    var helper = el('textarea', { readonly: true });
    helper.value = text;
    helper.style.position = 'fixed';
    helper.style.top = '-1000px';
    helper.style.opacity = '0';
    document.body.appendChild(helper);
    helper.select();
    helper.setSelectionRange(0, text.length);
    var copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (e) {
      copied = false;
    }
    document.body.removeChild(helper);
    if (copied) {
      toast('Backup copied', { type: 'success' });
    } else {
      ui.backupOutput.focus();
      ui.backupOutput.setSelectionRange(0, text.length);
      toast('Select the text and copy it with your phone\'s menu.');
    }
  }

  function updateRestoreFields() {
    var encrypted = isEncryptedBackup(ui.restoreText.value);
    ui.restorePasswordField.classList.toggle('hide', !encrypted);
    disarmRestore();
  }

  function selectRestoreMode(mode) {
    state.restoreMode = mode;
    ui.restoreModes.forEach(function(button) {
      button.setAttribute('aria-checked', button.getAttribute('data-mode') === mode ? 'true' : 'false');
    });
    ui.replaceHint.classList.toggle('hide', mode !== 'replace');
    disarmRestore();
  }

  function disarmRestore() {
    clearTimeout(restoreTimer);
    state.restoreArmed = false;
    if (ui.restoreButton && !state.busy) {
      ui.restoreButton.classList.remove('is-danger');
      ui.restoreButton.textContent = 'Restore';
    }
  }

  function restoreBackup() {
    if (state.busy) return;
    var raw = ui.restoreText.value;
    var encrypted = isEncryptedBackup(raw);
    if (!/\S/.test(raw)) {
      showMessage(ui.restoreMsg, 'error', 'Paste a backup or otpauth:// links first.');
      return;
    }
    if (!encrypted && !/otpauth/i.test(raw)) {
      reported.restore = raw;
      showMessage(ui.restoreMsg, 'error', 'No backup found. A backup starts with \u201cotpauth://\u201d ' +
        'or \u201cpebble-auth-backup:\u201d.');
      return;
    }
    if (encrypted && !ui.restorePassword.value) {
      showMessage(ui.restoreMsg, 'error', 'Enter the password of this backup.');
      ui.restorePassword.focus();
      return;
    }
    if (state.restoreMode === 'replace' && state.accounts.length && !state.restoreArmed) {
      state.restoreArmed = true;
      ui.restoreButton.classList.add('is-danger');
      ui.restoreButton.textContent = 'Tap again to replace all ' + state.accounts.length + ' accounts';
      clearTimeout(restoreTimer);
      restoreTimer = setTimeout(disarmRestore, 5000);
      return;
    }
    disarmRestore();
    showMessage(ui.restoreMsg, null);
    if (!encrypted) {
      applyRestore(raw);
      return;
    }
    var password = ui.restorePassword.value;
    runBusy(ui.restoreButton, 'Decrypting', function(onProgress, onDone) {
      decryptBackup(raw, password, onProgress, onDone);
    }, function(result) {
      if (result.text !== undefined) {
        applyRestore(result.text);
        return;
      }
      reported.restore = raw;
      if (result.error === 'password') {
        showMessage(ui.restoreMsg, 'error', 'Wrong password, or the backup was changed.');
        ui.restorePassword.focus();
        ui.restorePassword.select();
      } else if (result.error === 'version') {
        showMessage(ui.restoreMsg, 'error', 'This backup was made with a newer version of the app. ' +
          'Update the app and try again.');
      } else {
        showMessage(ui.restoreMsg, 'error', 'This backup is incomplete or damaged. Copy the whole text, ' +
          'starting with \u201cpebble-auth-backup:\u201d.');
      }
    });
  }

  function applyRestore(text) {
    var replace = state.restoreMode === 'replace';
    var result = parseLinks(text, replace ? [] : state.accounts);
    var count = result.added.length;
    if (!count) {
      reported.restore = ui.restoreText.value;
      showMessage(ui.restoreMsg, 'error', 'Nothing was restored.' +
        (result.skipped.length ? ' Skipped ' + result.skipped.length + ':' : ''), result.skipped);
      return;
    }
    var previous = state.accounts;
    state.accounts = replace ? result.added : state.accounts.concat(result.added);
    state.expanded = -1;
    state.renaming = -1;
    renderAccounts();
    ui.restoreText.value = '';
    ui.restorePassword.value = '';
    updateRestoreFields();
    reported.restore = null;

    var done = (replace ? 'Replaced your list with ' : 'Restored ') + count +
      (count === 1 ? ' account.' : ' accounts.');
    var title = done + ' Tap \u201cSave to watch\u201d to send ' + (count === 1 ? 'it' : 'them') +
      ' to your watch.';
    if (result.skipped.length) {
      showMessage(ui.restoreMsg, 'warning', title + ' Skipped ' + result.skipped.length + ':', result.skipped);
    } else {
      showMessage(ui.restoreMsg, 'success', title);
    }
    toast(done, { action: 'Undo', onAction: function() {
      state.accounts = previous;
      renderAccounts();
      showMessage(ui.restoreMsg, null);
    } });
  }

  function onRestoreFile() {
    var file = ui.restoreFile.files && ui.restoreFile.files[0];
    ui.restoreFile.value = '';
    if (!file) return;
    if (file.size > 500000) {
      showMessage(ui.restoreMsg, 'error', 'This file is too large to be a backup.');
      return;
    }
    var reader = new FileReader();
    reader.onload = function() {
      ui.restoreText.value = String(reader.result || '');
      updateRestoreFields();
      showMessage(ui.restoreMsg, null);
    };
    reader.onerror = function() {
      showMessage(ui.restoreMsg, 'error', 'The file could not be read.');
    };
    reader.readAsText(file);
  }

  clayConfig.registerComponent({
    name: 'auth-backup',
    template: '<div class="component auth-card auth-backup"></div>',
    manipulator: displayOnly,
    initialize: function() {
      var root = this.$element[0];
      var encryptionAvailable = canEncrypt();

      ui.backupTabs = [
        el('button', { type: 'button', role: 'tab', 'data-tab': 'create', text: 'Create backup' }),
        el('button', { type: 'button', role: 'tab', 'data-tab': 'restore', text: 'Restore' })
      ];

      ui.encryptToggle = el('input', { type: 'checkbox', className: 'switch-input',
        disabled: !encryptionAvailable });
      ui.backupPassword = el('input', { type: 'password', autocomplete: 'new-password',
        enterkeyhint: 'next' });
      ui.backupRepeat = el('input', { type: 'password', autocomplete: 'new-password',
        enterkeyhint: 'done' });
      ui.passwordFields = el('div', { className: 'hide' }, [
        field('Password', ui.backupPassword),
        field('Repeat password', ui.backupRepeat),
        el('p', { className: 'field-hint', text: 'At least ' + MIN_PASSWORD_LENGTH + ' characters. ' +
          'A long password, for example four random words, is best. If you forget it, the backup ' +
          'can\'t be opened.' })
      ]);
      ui.backupMsg = el('div', { className: 'form-msg', role: 'status', 'aria-live': 'polite' });
      ui.backupButton = el('button', { type: 'button', className: 'btn-primary', text: 'Create backup' });
      ui.backupOutput = el('textarea', { className: 'backup-output', readonly: true, rows: '5',
        'aria-label': 'Backup', spellcheck: 'false' });
      ui.backupNote = el('div', { className: 'form-msg', role: 'status' });
      var copyButton = el('button', { type: 'button', className: 'btn-primary', text: 'Copy backup' });
      ui.backupResult = el('div', { className: 'backup-result hide' }, [
        field('Your backup', ui.backupOutput),
        ui.backupNote,
        copyButton
      ]);

      ui.restoreText = el('textarea', { rows: '4', autocomplete: 'off', autocorrect: 'off',
        autocapitalize: 'off', spellcheck: 'false',
        placeholder: 'pebble-auth-backup:\u2026 or otpauth://totp/\u2026' });
      ui.restoreFile = el('input', { type: 'file', accept: '.txt,text/plain', className: 'hide' });
      var fileButton = el('button', { type: 'button', className: 'chip-btn', text: 'Open a file\u2026' });
      ui.restorePassword = el('input', { type: 'password', autocomplete: 'current-password',
        enterkeyhint: 'done' });
      ui.restorePasswordField = el('div', { className: 'hide' }, [
        field('Backup password', ui.restorePassword)
      ]);
      ui.restoreModes = [
        el('button', { type: 'button', role: 'radio', 'data-mode': 'add', text: 'Add to my list' }),
        el('button', { type: 'button', role: 'radio', 'data-mode': 'replace', text: 'Replace my list' })
      ];
      ui.replaceHint = el('p', { className: 'field-hint hide', text: 'Replacing removes all accounts ' +
        'that are not in the backup. Nothing changes on the watch until you save.' });
      ui.restoreMsg = el('div', { className: 'form-msg', role: 'status', 'aria-live': 'polite' });
      ui.restoreButton = el('button', { type: 'button', className: 'btn-primary', text: 'Restore' });

      ui.backupPanels = [
        el('div', { className: 'panel', 'data-panel': 'create', role: 'tabpanel' }, [
          el('p', { className: 'field-hint backup-intro', text: 'Saves your accounts as text, for ' +
            'example for a password manager. The backup consists of standard otpauth:// links that ' +
            'other authenticator apps can import too.' }),
          el('label', { className: 'switch-row' }, [
            el('span', { className: 'switch-label', text: 'Protect with a password' }),
            ui.encryptToggle,
            el('span', { className: 'switch', 'aria-hidden': 'true' })
          ]),
          encryptionAvailable ? ui.passwordFields :
            el('p', { className: 'field-hint', text: 'Encryption isn\'t available on this device.' }),
          ui.backupMsg,
          ui.backupButton,
          ui.backupResult
        ]),
        el('div', { className: 'panel hide', 'data-panel': 'restore', role: 'tabpanel' }, [
          field('Backup or otpauth:// links', ui.restoreText),
          el('div', { className: 'btn-row' }, [fileButton, ui.restoreFile]),
          ui.restorePasswordField,
          el('span', { className: 'field-label', text: 'Restore mode' }),
          el('div', { className: 'segmented segmented-inline', role: 'radiogroup',
            'aria-label': 'Restore mode' }, ui.restoreModes),
          ui.replaceHint,
          ui.restoreMsg,
          ui.restoreButton
        ])
      ];

      root.appendChild(el('div', { className: 'card-head' }, [el('h2', { text: 'Backup' })]));
      root.appendChild(el('div', { className: 'segmented', role: 'tablist' }, ui.backupTabs));
      ui.backupPanels.forEach(function(panel) { root.appendChild(panel); });
      selectBackupTab('create');
      selectRestoreMode('add');

      ui.backupTabs.forEach(function(tab) {
        tab.addEventListener('click', function() { selectBackupTab(tab.getAttribute('data-tab')); });
      });
      ui.encryptToggle.addEventListener('change', function() {
        ui.passwordFields.classList.toggle('hide', !ui.encryptToggle.checked);
        hideBackupResult();
        showMessage(ui.backupMsg, null);
      });
      ui.backupButton.addEventListener('click', createBackup);
      copyButton.addEventListener('click', copyBackup);
      ui.backupPassword.addEventListener('keydown', function(event) {
        if (isEnter(event)) ui.backupRepeat.focus();
      });
      ui.backupRepeat.addEventListener('keydown', function(event) {
        if (isEnter(event)) createBackup();
      });
      [ui.backupPassword, ui.backupRepeat].forEach(function(input) {
        input.addEventListener('input', function() { markInvalid(input, false); });
      });

      ui.restoreText.addEventListener('input', updateRestoreFields);
      fileButton.addEventListener('click', function() { ui.restoreFile.click(); });
      ui.restoreFile.addEventListener('change', onRestoreFile);
      ui.restoreModes.forEach(function(button) {
        button.addEventListener('click', function() { selectRestoreMode(button.getAttribute('data-mode')); });
      });
      ui.restorePassword.addEventListener('keydown', function(event) {
        if (isEnter(event)) restoreBackup();
      });
      ui.restoreButton.addEventListener('click', restoreBackup);
    }
  });

  clayConfig.registerComponent({
    name: 'auth-privacy',
    template: '<div class="component auth-privacy"></div>',
    manipulator: displayOnly,
    initialize: function() {
      var root = this.$element[0];
      root.appendChild(el('span', { className: 'auth-privacy-icon', html: ICONS.lock }));
      root.appendChild(el('p', { text: 'Your secret keys are stored only on this phone and on your watch. ' +
        'Nothing is sent to any server.' }));
    }
  });

  // --- Styles ---

  var css = [
    ':root{--bg:#f2f2f7;--card:#fff;--text:#16161b;--text-2:#62626d;--text-3:#8e8e99;',
    '--line:rgba(60,60,67,.14);--field:#f0f0f4;--accent:#cf4310;--accent-pressed:#b53a0d;',
    '--accent-text:#c2410c;--accent-soft:rgba(207,67,16,.12);--danger:#d70015;',
    '--danger-soft:rgba(215,0,21,.08);--success:#1b7a43;--success-soft:rgba(27,122,67,.1);',
    '--warning:#8a5300;--warning-soft:rgba(214,138,0,.14);--tab-on:#fff;--switch-off:#e3e3e8;',
    '--savebar-bg:rgba(242,242,247,.86);--toast:#232329;',
    '--shadow:0 1px 2px rgba(16,16,24,.05),0 8px 24px rgba(16,16,24,.06);--savebar-h:104px;',
    '--button-glow:0 6px 18px rgba(207,67,16,.3)}',
    '@media (prefers-color-scheme:dark){:root{--bg:#0e0e11;--card:#1c1c21;--text:#f4f4f7;',
    '--text-2:#a5a5af;--text-3:#7a7a84;--line:rgba(255,255,255,.09);--field:#28282e;',
    '--accent-text:#ff8f61;--accent-soft:rgba(255,143,97,.14);--danger:#ff5a50;',
    '--danger-soft:rgba(255,90,80,.14);--success:#3ddc6f;--success-soft:rgba(61,220,111,.13);',
    '--warning:#ffc457;--warning-soft:rgba(255,196,87,.13);--tab-on:#3a3a42;--switch-off:#3a3a40;',
    '--savebar-bg:rgba(14,14,17,.84);--toast:#2f2f36;--shadow:none;--button-glow:none}}',

    'html,body{background:var(--bg)!important;color:var(--text);',
    'font-family:-apple-system,BlinkMacSystemFont,"SF Pro Text","Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;',
    'font-size:16px;line-height:1.45;-webkit-text-size-adjust:100%}',
    'html,body{height:auto!important;min-height:100%}',
    'body{padding:calc(16px + env(safe-area-inset-top)) 16px 0!important;',
    '-webkit-tap-highlight-color:transparent}',
    '#main-form{max-width:640px;margin:0 auto;',
    'padding-bottom:calc(var(--savebar-h) + 24px + env(safe-area-inset-bottom))}',
    '#main-form .component{padding:0}',
    '#main-form h1,#main-form h2,#main-form h4,#main-form strong{font-family:inherit;text-transform:none;',
    'letter-spacing:-.01em;top:0;color:var(--text)}',
    '#main-form p{margin:0}',
    '#main-form button{font:inherit;text-transform:none;letter-spacing:normal;min-width:0;margin:0;',
    'padding:0;border:0;border-radius:0;background:none;color:inherit;display:inline-flex;',
    'align-items:center;gap:6px;cursor:pointer;-webkit-tap-highlight-color:transparent;',
    'transition:background-color .15s,color .15s,transform .1s,opacity .15s}',
    '#main-form button:active{transform:scale(.97)}',
    '#main-form button[disabled]{opacity:.35;pointer-events:none}',
    '#main-form button:focus-visible{outline:2px solid var(--accent);outline-offset:2px}',
    '#main-form svg{display:block;flex:none}',

    '.auth-header{padding:4px 2px 20px!important}',
    '.hero{display:flex;align-items:center;gap:14px}',
    '.hero-icon{flex:0 0 52px;height:52px;border-radius:15px;display:flex;align-items:center;',
    'justify-content:center;background:linear-gradient(145deg,#ff8040,#cf3a0b);',
    'box-shadow:0 8px 20px rgba(207,58,11,.28)}',
    '.hero-icon img{display:block;width:32px;height:32px}',
    '#main-form .hero h1{font-size:26px;line-height:1.15;font-weight:700;letter-spacing:-.02em}',
    '.hero p{color:var(--text-2);font-size:15px;margin-top:2px!important}',
    '.watch-chip{display:inline-flex;align-items:center;gap:6px;margin-top:14px;padding:6px 12px 6px 9px;',
    'border-radius:999px;background:var(--card);box-shadow:var(--shadow);color:var(--text-2);',
    'font-size:13px;font-weight:600}',
    '.watch-chip-icon{color:var(--accent-text)}',

    '.auth-card,#main-form .section{background:var(--card);border-radius:18px;box-shadow:var(--shadow);',
    'margin:0 0 16px;overflow:hidden}',
    '.card-head{display:flex;align-items:center;justify-content:space-between;padding:16px 16px 10px}',
    '#main-form .card-head h2{font-size:18px;line-height:1.3;font-weight:650}',
    '.count-badge{font-size:12px;font-weight:600;color:var(--text-2);background:var(--field);',
    'border-radius:999px;padding:3px 10px}',

    '.acc-list{margin:0;padding:0}',
    '.acc-row{position:relative;background:var(--card)}',
    '.acc-row+.acc-row:before{content:"";position:absolute;top:0;left:68px;right:0;height:1px;background:var(--line)}',
    '.acc-main{display:flex;align-items:center;gap:12px;min-height:66px;padding:0 6px 0 16px}',
    '.acc-avatar{flex:0 0 40px;height:40px;border-radius:12px;display:flex;align-items:center;',
    'justify-content:center;color:#fff;font-weight:700;font-size:17px}',
    '#main-form .acc-toggle{flex:1;min-width:0;align-self:stretch;flex-direction:column;align-items:flex-start;',
    'justify-content:center;gap:1px;text-align:left;padding:10px 0}',
    '#main-form .acc-toggle:active{transform:none;opacity:.6}',
    '.acc-name,.acc-meta{display:block;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
    '.acc-name{font-size:16px;font-weight:600;color:var(--text)}',
    '.acc-meta{font-size:13px;color:var(--text-2)}',
    '.acc-handle{flex:0 0 44px;height:48px;display:flex;align-items:center;justify-content:center;',
    'color:var(--text-3);touch-action:none;cursor:grab;-webkit-user-select:none;user-select:none}',
    '.acc-rename{flex:1;min-width:0;font:inherit;font-size:16px;font-weight:600;color:var(--text);',
    'background:var(--field);border:1.5px solid var(--accent);border-radius:10px;padding:9px 12px;',
    'margin:10px 10px 10px 0;box-shadow:0 0 0 4px var(--accent-soft);outline:none}',
    '.acc-actions{display:flex;flex-wrap:wrap;gap:8px;padding:0 16px 14px}',
    '#main-form .acc-actions .is-danger{margin-left:auto}',
    '@media (max-width:359px){#main-form .acc-actions .has-icon{width:40px;padding:0;justify-content:center}',
    '.acc-actions .has-icon .chip-label{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0)}}',
    '#main-form .chip-btn{height:36px;padding:0 13px;border-radius:10px;background:var(--field);',
    'color:var(--text);font-size:14px;font-weight:600}',
    '#main-form .chip-btn.icon-btn{width:40px;padding:0;justify-content:center}',
    '#main-form .chip-btn.is-danger{color:var(--danger);background:var(--danger-soft)}',
    '#main-form .chip-btn.is-primary{color:#fff;background:var(--accent)}',
    '.is-sorting .acc-row{transition:transform .2s ease}',
    '.is-sorting .acc-row:before{opacity:0}',
    '#main-form .acc-row.is-dragging{z-index:5;transition:none;border-radius:14px;',
    'box-shadow:0 12px 30px rgba(0,0,0,.2)}',
    '.is-dragging .acc-handle{cursor:grabbing;color:var(--accent-text)}',

    '.acc-empty{text-align:center;padding:6px 28px 26px;color:var(--text-2);font-size:15px}',
    '.acc-empty-icon{width:56px;height:56px;margin:4px auto 12px;border-radius:16px;display:flex;',
    'align-items:center;justify-content:center;background:var(--accent-soft);color:var(--accent-text)}',
    '#main-form .acc-empty strong{display:block;font-size:16px;font-weight:600;margin-bottom:2px}',
    '.card-foot{display:flex;justify-content:center;border-top:1px solid var(--line);padding:6px}',
    '#main-form .link-btn{color:var(--danger);font-size:15px;font-weight:500;padding:10px 16px;border-radius:10px}',
    '#main-form .link-btn.is-armed{color:#fff;background:var(--danger);font-weight:600}',

    '.segmented{display:flex;margin:2px 16px 16px;padding:3px;border-radius:12px;background:var(--field)}',
    '#main-form .segmented button{flex:1;justify-content:center;height:36px;border-radius:9px;',
    'font-size:14px;font-weight:600;color:var(--text-2)}',
    '#main-form .segmented button:active{transform:none}',
    '#main-form .segmented button[aria-selected="true"]{background:var(--tab-on);color:var(--text);',
    'box-shadow:0 1px 3px rgba(0,0,0,.14)}',
    '.panel{padding:0 16px 16px}',
    '#main-form label.field{display:block;padding:0;margin:0 0 14px;border-radius:0}',
    '.field-label{display:block;font-size:13px;font-weight:600;color:var(--text-2);margin:0 0 6px}',
    '.field input,.field textarea,.field select{display:block;width:100%;font:inherit;font-size:16px;',
    'line-height:1.4;color:var(--text);background:var(--field);border:1.5px solid transparent;',
    'border-radius:12px;padding:12px 14px;margin:0;-webkit-appearance:none;appearance:none;',
    'transition:border-color .15s,box-shadow .15s,background-color .15s}',
    '.field textarea{min-height:116px;resize:vertical;word-break:break-all}',
    '.field input::placeholder,.field textarea::placeholder{color:var(--text-3);opacity:1}',
    '.field input:focus,.field textarea:focus,.field select:focus{outline:none;border-color:var(--accent);',
    'background:var(--card);box-shadow:0 0 0 4px var(--accent-soft)}',
    '.field.is-invalid input{border-color:var(--danger);box-shadow:0 0 0 4px var(--danger-soft)}',
    '.field .mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,"Roboto Mono",monospace;letter-spacing:.03em}',
    '.field-row{display:flex;gap:12px}',
    '.field-row .field{flex:1;min-width:0}',
    '.field-select{position:relative}',
    '.field-select select{padding-right:36px}',
    '.field-select:after{content:"";position:absolute;right:16px;bottom:21px;width:7px;height:7px;',
    'border-right:2px solid var(--text-2);border-bottom:2px solid var(--text-2);transform:rotate(45deg);pointer-events:none}',
    '.field-hint{font-size:13px;line-height:1.4;color:var(--text-2);margin:-4px 0 14px!important}',
    '#main-form .btn-primary{width:100%;height:50px;justify-content:center;border-radius:14px;',
    'background:var(--accent);color:#fff;font-size:16px;font-weight:650}',
    '#main-form .btn-primary:active{background:var(--accent-pressed)}',
    '.form-msg{display:none;margin:0 0 14px;padding:11px 14px;border-radius:12px;font-size:14px;line-height:1.45}',
    '.form-msg.is-error{display:block;color:var(--danger);background:var(--danger-soft)}',
    '.form-msg.is-warning{display:block;color:var(--warning);background:var(--warning-soft)}',
    '.form-msg.is-success{display:block;color:var(--success);background:var(--success-soft)}',
    '.form-msg ul{list-style:disc;margin:6px 0 0;padding-left:18px}',
    '#main-form .form-msg strong{color:inherit;font-weight:650}',

    '#main-form .section>.component{margin:0;padding:0 16px}',
    '#main-form .section>.component:after{display:none!important}',
    '#main-form .section>.component-heading:first-child{background:none;border-radius:0;padding:16px 16px 0}',
    '#main-form .component-heading h4{font-size:18px;line-height:1.3;font-weight:650}',
    '#main-form .component-toggle label{padding:12px 0;border-radius:0}',
    '#main-form .tap-highlight:active{background:none}',
    '#main-form .component-toggle .label{font-size:16px;color:var(--text)}',
    '#main-form .component-toggle .input{max-width:none;margin-left:16px}',
    '#main-form .component-toggle .slide{width:51px;height:31px;border-radius:31px;background:var(--switch-off);',
    'transition:background-color .2s}',
    '#main-form .component-toggle .marker{width:27px;height:27px;top:2px;left:2px;border-radius:50%;',
    'background:#fff;box-shadow:0 2px 5px rgba(0,0,0,.2),0 0 1px rgba(0,0,0,.25);transition:transform .2s}',
    '#main-form .component-toggle input:checked+.graphic .slide{background:var(--accent)}',
    '#main-form .component-toggle input:checked+.graphic .marker{background:#fff;transform:translateX(20px)}',
    '#main-form .component-toggle .description{padding:0 0 16px;font-size:14px;line-height:1.4;color:var(--text-2)}',

    '.auth-privacy{display:flex;gap:10px;align-items:flex-start;padding:2px 6px 8px!important;',
    'color:var(--text-2);font-size:13px;line-height:1.45}',
    '.auth-privacy-icon{color:var(--text-3);margin-top:1px}',

    '#main-form .component-submit{position:fixed;left:0;right:0;bottom:0;z-index:20;margin:0;',
    'padding:10px 16px calc(12px + env(safe-area-inset-bottom));text-align:center;background:var(--savebar-bg);',
    '-webkit-backdrop-filter:saturate(180%) blur(18px);backdrop-filter:saturate(180%) blur(18px);',
    'border-top:1px solid var(--line)}',
    '.save-hint{font-size:13px;color:var(--text-2);margin:0 0 8px!important}',
    '.is-dirty .save-hint{color:var(--accent-text);font-weight:600}',
    '#main-form .component-submit button{display:flex;justify-content:center;width:100%;max-width:608px;',
    'height:52px;margin:0 auto;border-radius:14px;background:var(--accent);color:#fff;font-size:17px;',
    'font-weight:650;box-shadow:var(--button-glow)}',
    '#main-form .component-submit button:active{background:var(--accent-pressed);transform:scale(.985)}',

    '.auth-toast-wrap{position:fixed;left:16px;right:16px;z-index:30;display:flex;justify-content:center;',
    'pointer-events:none;bottom:calc(var(--savebar-h) + 12px)}',
    '.auth-toast{pointer-events:auto;display:flex;align-items:center;gap:14px;max-width:520px;',
    'padding:12px 14px 12px 16px;border-radius:14px;background:var(--toast);color:#fff;font-size:15px;',
    'line-height:1.35;box-shadow:0 12px 32px rgba(0,0,0,.24);opacity:0;transform:translateY(12px);',
    'transition:opacity .2s ease,transform .2s ease}',
    '.auth-toast.is-visible{opacity:1;transform:none}',
    '.auth-toast.is-error{background:#b3261e}',
    '.auth-toast.is-success:before{content:"";flex:none;width:8px;height:8px;border-radius:50%;background:#3ddc6f}',
    '.auth-toast-text{flex:1}',
    'button.auth-toast-action{font:inherit;font-weight:700;color:#ffb088;background:none;border:0;',
    'padding:6px 4px;margin:0;min-width:0;text-transform:none;letter-spacing:normal;',
    '-webkit-tap-highlight-color:transparent}',

    '#main-form .is-busy{pointer-events:none;opacity:.8}',
    '#main-form .btn-primary.is-danger{background:var(--danger)}',
    '#main-form .segmented button[aria-checked="true"]{background:var(--tab-on);color:var(--text);',
    'box-shadow:0 1px 3px rgba(0,0,0,.14)}',
    '#main-form .segmented-inline{margin:0 0 14px}',
    '.backup-intro{margin:0 0 10px!important}',
    '#main-form label.switch-row{display:flex;align-items:center;justify-content:space-between;',
    'padding:6px 0 16px;border-radius:0;cursor:pointer}',
    '.switch-label{font-size:16px;color:var(--text)}',
    '.switch-input{position:absolute;opacity:0;width:1px;height:1px}',
    '.switch{position:relative;flex:none;width:51px;height:31px;border-radius:31px;',
    'background:var(--switch-off);transition:background-color .2s}',
    '.switch:after{content:"";position:absolute;top:2px;left:2px;width:27px;height:27px;border-radius:50%;',
    'background:#fff;box-shadow:0 2px 5px rgba(0,0,0,.2),0 0 1px rgba(0,0,0,.25);transition:transform .2s}',
    '.switch-input:checked+.switch{background:var(--accent)}',
    '.switch-input:checked+.switch:after{transform:translateX(20px)}',
    '.switch-input:focus-visible+.switch{outline:2px solid var(--accent);outline-offset:2px}',
    '.switch-input:disabled+.switch{opacity:.4}',
    '.backup-result{margin-top:18px}',
    '.field .backup-output{min-height:120px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,',
    '"Roboto Mono",monospace;font-size:13px;word-break:break-all;resize:none}',
    '.btn-row{display:flex;gap:10px;margin:-4px 0 14px}',

    '@media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}'
  ].join('');

  var style = document.createElement('style');
  style.appendChild(document.createTextNode(css));
  document.head.appendChild(style);

  clayConfig.on(clayConfig.EVENTS.AFTER_BUILD, function() {
    // Let the page use the full screen on phones with a notch / home indicator.
    var viewport = document.querySelector('meta[name="viewport"]');
    if (viewport && viewport.content.indexOf('viewport-fit') < 0) {
      viewport.content += ', viewport-fit=cover';
    }

    var submit = clayConfig.getItemsByType('submit')[0];
    if (submit) {
      ui.saveBar = submit.$element[0];
      ui.saveHint = el('p', { className: 'save-hint' });
      ui.saveBar.insertBefore(ui.saveHint, ui.saveBar.firstChild);
      submit.$manipulatorTarget[0].addEventListener('click', function(event) {
        if (!addPendingInput()) event.preventDefault();
      });
      var syncSaveBarHeight = function() {
        document.documentElement.style.setProperty('--savebar-h', ui.saveBar.offsetHeight + 'px');
      };
      syncSaveBarHeight();
      window.addEventListener('resize', syncSaveBarHeight);
    }

    // Enter in a single-line field would submit the form and close the page.
    clayConfig.$rootContainer[0].addEventListener('keydown', function(event) {
      if (isEnter(event) && event.target.tagName === 'INPUT') event.preventDefault();
    });

    var loop = clayConfig.getItemByMessageKey('SETTING_LOOP_LIST');
    if (loop) loop.on('change', updateDirty);

    state.initial = snapshot();
    updateDirty();
  });
};

// Runs inside the configuration page (not in PebbleKit JS). Clay copies this
// function's source into the page, so it must be self-contained ES5 and must
// not contain dollar-sign replacement patterns or a closing script tag.
module.exports = function() {
  var clayConfig = this;

  var MAX_ACCOUNTS = 100;
  var MAX_NAME_BYTES = 31;     // the watch keeps 31 bytes of UTF-8 per name
  var MAX_SECRET_LENGTH = 79;  // and 79 Base32 characters per secret
  var MAX_LABEL_LENGTH = 64;

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
    initial: null  // snapshot at page load, for the unsaved-changes hint
  };
  var ui = {};
  var drag = null;
  var reported = { importText: null, manual: null };
  var toastTimer = null;
  var clearAllTimer = null;

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
      return 'The secret key is too long for the watch (max. ' + MAX_SECRET_LENGTH + ' characters).';
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
    var label = cleanText(safeDecode(query >= 0 ? rest.slice(0, query) : rest));

    var params = {};
    (query >= 0 ? rest.slice(query + 1) : '').split('&').forEach(function(pair) {
      var eq = pair.indexOf('=');
      if (eq <= 0) return;
      var key = pair.slice(0, eq).toLowerCase();
      var value = pair.slice(eq + 1);
      if (key !== 'issuer') value = value.split(/\s/)[0];
      params[key] = cleanText(safeDecode(value.replace(/\+/g, ' ')));
    });

    var issuer = params.issuer || '';
    var user = label;
    var colon = label.indexOf(':');
    if (colon >= 0) {
      if (!issuer) issuer = cleanText(label.slice(0, colon));
      user = cleanText(label.slice(colon + 1));
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
    var row = ui.list.querySelector('[data-idx="' + index + '"]');
    if (!row) return;
    var rect = row.getBoundingClientRect();
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
    return ok;
  }

  function selectTab(name) {
    ui.tabs.forEach(function(tab) {
      var selected = tab.getAttribute('data-tab') === name;
      tab.setAttribute('aria-selected', selected ? 'true' : 'false');
      tab.tabIndex = selected ? 0 : -1;
    });
    ui.panels.forEach(function(panel) {
      panel.classList.toggle('hide', panel.getAttribute('data-panel') !== name);
    });
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

      function field(label, control, extraClass) {
        return el('label', { className: 'field' + (extraClass || '') }, [
          el('span', { className: 'field-label', text: label }), control
        ]);
      }

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

    var loop = clayConfig.getItemByMessageKey('SETTING_LOOP_LIST');
    if (loop) loop.on('change', updateDirty);

    state.initial = snapshot();
    updateDirty();
  });
};

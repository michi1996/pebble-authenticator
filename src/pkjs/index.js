var Clay = require('@rebble/clay');
var clayConfig = require('./clay-config.json');
var customClay = require('./custom-clay.js');
var messageKeys = require('message_keys');

// Clay's automatic event handling would send every setting in one message;
// the account list is sent one account per message instead (see syncToWatch).
var clay = new Clay(clayConfig, customClay, { autoHandleEvents: false });

var MAX_ACCOUNTS = 100;
var MAX_NAME_BYTES = 31;      // the watch stores names in 32 bytes
var MAX_SECRET_LENGTH = 79;   // and secrets in 80
var MAX_ATTEMPTS = 4;         // per message, before giving up
var RETRY_DELAY_MS = 1200;
var RESULT_TIMEOUT_MS = 4000;
var PENDING_SYNC_KEY = 'pending-sync';

var currentSync = null;

Pebble.addEventListener('ready', function() {
  // A save whose transfer didn't finish (watch out of range, app closed)
  // is completed the next time the watch app starts.
  if (localStorage.getItem(PENDING_SYNC_KEY)) {
    console.log('Resuming an unfinished sync.');
    syncToWatch(readSettings());
  }
});

Pebble.addEventListener('showConfiguration', function() {
  escapeStoredAccounts();
  Pebble.openURL(clay.generateUrl());
});

Pebble.addEventListener('webviewclosed', function(e) {
  if (!e || !e.response) {
    return; // closed without saving
  }
  try {
    // Accepts both URL-encoded responses and the already decoded ones newer
    // Pebble apps deliver, and stores the settings for the next visit.
    clay.getSettings(e.response, false);
  } catch (err) {
    console.log('Ignoring settings response: ' + err.message);
    return;
  }
  syncToWatch(readSettings());
});

Pebble.addEventListener('appmessage', function(e) {
  var payload = (e && e.payload) || {};
  var stored = payload.SYNC_RESULT;
  if (stored === undefined) stored = payload[messageKeys.SYNC_RESULT];
  if (stored !== undefined && currentSync && currentSync.awaitingResult) {
    finishSync(currentSync, parseInt(stored, 10));
  }
});

function readSettings() {
  var settings = {};
  try {
    settings = JSON.parse(localStorage.getItem('clay-settings')) || {};
  } catch (err) {
    console.log('Stored settings are unreadable: ' + err.message);
  }
  return settings;
}

// Account names are user data and end up inside the generated config page;
// keep characters that would break it escaped (also for lists saved by older
// versions of the app).
function escapeStoredAccounts() {
  var settings = readSettings();
  var data = settings.TOTP_EXPORT_DATA;
  if (typeof data === 'string' && /[\u0024<>&\u2028\u2029]/.test(data)) {
    clay.setSettings('TOTP_EXPORT_DATA', data.replace(/[\u0024<>&\u2028\u2029]/g, function(c) {
      return '\\u' + ('000' + c.charCodeAt(0).toString(16)).slice(-4);
    }));
  }
}

// Cuts a string to at most maxBytes of UTF-8 without splitting a character.
function truncateUtf8(str, maxBytes) {
  var bytes = 0;
  for (var i = 0; i < str.length; i++) {
    var code = str.charCodeAt(i);
    var size = code < 0x80 ? 1 : code < 0x800 ? 2 : 3;
    var units = 1;
    if (code >= 0xD800 && code <= 0xDBFF && i + 1 < str.length) {
      size = 4;  // surrogate pair
      units = 2;
    }
    if (bytes + size > maxBytes) return str.slice(0, i);
    bytes += size;
    i += units - 1;
  }
  return str;
}

// Returns the accounts to send, or null if the stored list is missing or
// unreadable. Null leaves the watch's accounts untouched rather than wiping
// them because of a parse error.
function readAccounts(data) {
  if (typeof data !== 'string') return null;
  var list;
  try {
    list = JSON.parse(data || '[]');
  } catch (err) {
    console.log('Account list is unreadable: ' + err.message);
    return null;
  }
  if (!Array.isArray(list)) return null;

  var accounts = [];
  list.forEach(function(item) {
    if (!item || accounts.length >= MAX_ACCOUNTS) return;
    var name = truncateUtf8(String(item.ACCOUNT_NAME || '').trim(), MAX_NAME_BYTES);
    var secret = String(item.ACCOUNT_SECRET || '').replace(/[\s-]+/g, '').replace(/=+$/, '')
      .toUpperCase().slice(0, MAX_SECRET_LENGTH);
    var period = parseInt(item.ACCOUNT_PERIOD, 10);
    var digits = parseInt(item.ACCOUNT_DIGITS, 10);
    if (!name || !secret) return;
    accounts.push({
      name: name,
      secret: secret,
      period: period >= 1 && period <= 255 ? period : 30,
      digits: digits === 8 ? 8 : 6
    });
  });
  return accounts;
}

function syncToWatch(settings) {
  var loop = settings.SETTING_LOOP_LIST;
  var loopValue = loop === undefined ? 1 : (loop && loop !== '0' ? 1 : 0);
  var accounts = readAccounts(settings.TOTP_EXPORT_DATA);

  var messages;
  if (accounts) {
    messages = [{ SYNC_BEGIN: 1, SETTING_LOOP_LIST: loopValue }];
    accounts.forEach(function(account, index) {
      messages.push({
        ACCOUNT_INDEX: index,
        ACCOUNT_NAME: account.name,
        ACCOUNT_SECRET: account.secret,
        ACCOUNT_PERIOD: account.period,
        ACCOUNT_DIGITS: account.digits
      });
    });
    messages.push({ SYNC_END: 1 });
  } else {
    messages = [{ SETTING_LOOP_LIST: loopValue }];
  }

  var sync = {
    messages: messages,
    total: accounts ? accounts.length : -1,
    index: 0,
    attempts: 0,
    awaitingResult: false
  };
  if (currentSync && currentSync.resultTimer) clearTimeout(currentSync.resultTimer);
  currentSync = sync; // a newer save replaces a transfer that is still running
  localStorage.setItem(PENDING_SYNC_KEY, '1');
  console.log('Sending ' + (accounts ? accounts.length + ' accounts' : 'settings') + ' to the watch.');
  sendNext(sync);
}

// Sends the messages strictly one after another; each one is only sent
// after the watch acknowledged the previous one.
function sendNext(sync) {
  if (sync !== currentSync) return;

  if (sync.index >= sync.messages.length) {
    if (sync.total < 0) {
      finishSync(sync, -1);
      return;
    }
    // The watch answers SYNC_END with the number of accounts it could store.
    sync.awaitingResult = true;
    sync.resultTimer = setTimeout(function() { finishSync(sync, sync.total); }, RESULT_TIMEOUT_MS);
    return;
  }

  Pebble.sendAppMessage(sync.messages[sync.index], function() {
    if (sync !== currentSync) return;
    sync.index++;
    sync.attempts = 0;
    sendNext(sync);
  }, function(e) {
    if (sync !== currentSync) return;
    sync.attempts++;
    if (sync.attempts >= MAX_ATTEMPTS) {
      console.log('The watch did not accept the data: ' + JSON.stringify(e && (e.error || e)));
      currentSync = null; // stays pending and is retried when the watch app starts
      return;
    }
    setTimeout(function() { sendNext(sync); }, RETRY_DELAY_MS);
  });
}

function finishSync(sync, stored) {
  if (sync !== currentSync) return;
  clearTimeout(sync.resultTimer);
  currentSync = null;
  localStorage.removeItem(PENDING_SYNC_KEY);

  if (sync.total < 0) return; // only the settings were sent

  var message;
  if (isNaN(stored) || stored >= sync.total) {
    message = sync.total === 0 ? 'All accounts were removed from the watch.' :
      sync.total + (sync.total === 1 ? ' account' : ' accounts') + ' saved on the watch.';
  } else {
    message = 'Only ' + stored + ' of ' + sync.total + ' accounts fit into the storage of this ' +
      'watch. Remove some accounts to make room for the others.';
  }
  console.log(message);
  Pebble.showSimpleNotificationOnPebble('Authenticator', message);
}

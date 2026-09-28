module.exports = function() {
  var clayConfig = this;

  function safeDecode(str) {
    try { return decodeURIComponent(str); } catch (e) { return str; }
  }

  function parseOtpAuthStrings(text) {
    var parsed = [];
    var parts = text.split('otpauth://totp/');
    parts.forEach(function(part) {
      if (!part.trim()) return;
      var s = part.match(/[?&]secret=([^&\s]+)/);
      var i = part.match(/[?&]issuer=([^&\n\r]+)/);
      var p = part.match(/[?&]period=(\d+)/);
      var d = part.match(/[?&]digits=(\d+)/);
      var path = part.split('?')[0];
      var name = safeDecode(path).trim();
      var issuer = i ? safeDecode(i[1]).trim() : name;
      var period = p ? parseInt(p[1], 10) : 30;
      if (isNaN(period) || period <= 0) period = 30;
      var digits = d ? parseInt(d[1], 10) : 6;
      if (digits !== 6 && digits !== 8) digits = 6;
      if (s) {
        parsed.push({
          'ACCOUNT_NAME': issuer,
          'ACCOUNT_SECRET': s[1].trim().toUpperCase(),
          'ACCOUNT_PERIOD': period,
          'ACCOUNT_DIGITS': digits
        });
      }
    });
    return parsed;
  }

  clayConfig.on(clayConfig.EVENTS.AFTER_BUILD, function() {
    var hiddenData = clayConfig.getItemById('hidden_data');
    var statusBar = clayConfig.getItemById('status_bar');

    function showStatus(msg) {
      if (statusBar) statusBar.set(msg);
    }

    function getAccounts() {
      try {
        var val = hiddenData.get();
        if (val) return JSON.parse(val);
      } catch(e) {}
      return [];
    }

    function saveAccounts(accs) {
      hiddenData.set(JSON.stringify(accs));
    }

    // Distance (px) a touch may drift before it's treated as a scroll instead of a tap.
    var TAP_MOVE_THRESHOLD = 10;

    // Adds tap-to-select support to a scrollable container without breaking
    // native touch scrolling: a touchend only fires the callback if the
    // finger didn't move more than TAP_MOVE_THRESHOLD px since touchstart.
    // Touches starting on a .drag-handle are ignored here — those are for
    // reordering, handled separately by attachRowReordering.
    function attachTapSelection(container, onSelect) {
      var startX = 0, startY = 0, moved = false, startedOnHandle = false;

      container.addEventListener('touchstart', function(e) {
        if (!e.touches || !e.touches.length) return;
        startedOnHandle = !!(e.target.closest && e.target.closest('.drag-handle'));
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        moved = false;
      }, { passive: true });

      container.addEventListener('touchmove', function(e) {
        if (!e.touches || !e.touches.length) return;
        var dx = e.touches[0].clientX - startX;
        var dy = e.touches[0].clientY - startY;
        if (Math.abs(dx) > TAP_MOVE_THRESHOLD || Math.abs(dy) > TAP_MOVE_THRESHOLD) {
          moved = true;
        }
      }, { passive: true });

      container.addEventListener('touchend', function(e) {
        if (moved || startedOnHandle) return; // was a scroll, or a drag-handle grab
        var row = e.target.closest ? e.target.closest('[data-idx]') : null;
        if (!row) return;
        e.preventDefault();
        onSelect(row);
      });

      // Non-touch fallback (desktop testing / phone webviews that fire click).
      container.addEventListener('click', function(e) {
        if (e.target.closest && e.target.closest('.drag-handle')) return;
        var row = e.target.closest ? e.target.closest('[data-idx]') : null;
        if (!row) return;
        onSelect(row);
      });
    }

    // Adds drag-to-reorder support via each row's .drag-handle. Only the
    // dragged row is moved live (translateY, following the finger); the
    // target drop slot is computed from the dragged row's midpoint against
    // the other (static) rows' midpoints, and shown with a blue insertion
    // line. The actual reorder is committed on release.
    function attachRowReordering(listEl, onReorder) {
      var dragging = null; // { rowEl, fromIdx, currentIdx, startY, others }

      function otherRows() {
        return Array.prototype.slice.call(listEl.querySelectorAll('[data-idx]'))
          .filter(function(r) { return r !== dragging.rowEl; })
          .map(function(r) {
            return { el: r, idx: parseInt(r.getAttribute('data-idx'), 10), rect: r.getBoundingClientRect() };
          });
      }

      function clearIndicators() {
        var rows = listEl.querySelectorAll('[data-idx]');
        for (var i = 0; i < rows.length; i++) rows[i].style.borderTop = '';
      }

      function start(rowEl, clientY) {
        var fromIdx = parseInt(rowEl.getAttribute('data-idx'), 10);
        if (isNaN(fromIdx)) return;
        dragging = { rowEl: rowEl, fromIdx: fromIdx, currentIdx: fromIdx, startY: clientY };
        dragging.others = otherRows();
        rowEl.style.position = 'relative';
        rowEl.style.zIndex = '5';
        rowEl.style.boxShadow = '0 2px 8px rgba(0,0,0,0.35)';
        rowEl.style.background = '#eef4ff';
      }

      function move(clientY) {
        if (!dragging) return;
        var dy = clientY - dragging.startY;
        dragging.rowEl.style.transform = 'translateY(' + dy + 'px)';

        var draggedRect = dragging.rowEl.getBoundingClientRect();
        var draggedMid = draggedRect.top + draggedRect.height / 2;

        var newIdx = 0;
        dragging.others.forEach(function(o) {
          if (draggedMid > o.rect.top + o.rect.height / 2) newIdx++;
        });
        dragging.currentIdx = newIdx;

        clearIndicators();
        if (dragging.others.length) {
          var target = dragging.others[Math.min(newIdx, dragging.others.length - 1)];
          if (target) target.el.style.borderTop = '3px solid #4a90d9';
        }
      }

      function end() {
        if (!dragging) return;
        var fromIdx = dragging.fromIdx;
        var toIdx = dragging.currentIdx;

        dragging.rowEl.style.transform = '';
        dragging.rowEl.style.position = '';
        dragging.rowEl.style.zIndex = '';
        dragging.rowEl.style.boxShadow = '';
        dragging.rowEl.style.background = '';
        clearIndicators();

        dragging = null;

        if (fromIdx !== toIdx) onReorder(fromIdx, toIdx);
      }

      listEl.addEventListener('touchstart', function(e) {
        var handle = e.target.closest ? e.target.closest('.drag-handle') : null;
        if (!handle || !e.touches || !e.touches.length) return;
        var row = handle.closest('[data-idx]');
        if (!row) return;
        start(row, e.touches[0].clientY);
      }, { passive: true });

      listEl.addEventListener('mousedown', function(e) {
        var handle = e.target.closest ? e.target.closest('.drag-handle') : null;
        if (!handle) return;
        var row = handle.closest('[data-idx]');
        if (!row) return;
        e.preventDefault();
        start(row, e.clientY);
      });

      document.addEventListener('touchmove', function(e) {
        if (!dragging || !e.touches || !e.touches.length) return;
        e.preventDefault(); // suppress list scroll while actively dragging a row
        move(e.touches[0].clientY);
      }, { passive: false });

      document.addEventListener('mousemove', function(e) {
        if (!dragging) return;
        move(e.clientY);
      });

      document.addEventListener('touchend', end);
      document.addEventListener('mouseup', end);
    }

    function updateUI() {
      var currentAccounts = getAccounts();
      var dropdownItem = clayConfig.getItemById('account_dropdown');

      if (!dropdownItem || !dropdownItem.$element) return;

      var wrapperEl = dropdownItem.$element[0];
      var selectEl = wrapperEl.querySelector('select');
      if (!selectEl) return;

      // Keep the real <select> in sync — it's still what dropdownItem.get()/set()
      // read from, and what persists the choice, we just stop showing it.
      selectEl.innerHTML = '';
      if (currentAccounts.length === 0) {
        selectEl.options.add(new Option("No accounts available", "-1"));
      } else {
        currentAccounts.forEach(function(acc, idx) {
          var badges = [];
          if (acc.ACCOUNT_PERIOD && acc.ACCOUNT_PERIOD !== 30) badges.push(acc.ACCOUNT_PERIOD + "s");
          if (acc.ACCOUNT_DIGITS && acc.ACCOUNT_DIGITS !== 6) badges.push(acc.ACCOUNT_DIGITS + "-digit");
          var label = (idx + 1) + ". " + acc.ACCOUNT_NAME + (badges.length ? " (" + badges.join(", ") + ")" : "");
          selectEl.options.add(new Option(label, idx));
        });
      }
      dropdownItem.set(selectEl.options[0].value);
      selectEl.style.display = 'none';

      // Build (or reuse) a touch-friendly list mirroring the select's options.
      var listEl = wrapperEl.querySelector('.account-touch-list');
      if (!listEl) {
        listEl = document.createElement('div');
        listEl.className = 'account-touch-list';
        listEl.style.cssText =
          'max-height:200px;overflow-y:auto;-webkit-overflow-scrolling:touch;' +
          'border:1px solid #ccc;border-radius:4px;margin-top:6px;background:#fff;';
        wrapperEl.appendChild(listEl);

        attachTapSelection(listEl, function(row) {
          dropdownItem.set(row.getAttribute('data-idx'));
          var rows = listEl.querySelectorAll('[data-idx]');
          for (var r = 0; r < rows.length; r++) {
            rows[r].style.background = '';
            rows[r].style.color = '';
          }
          row.style.background = '#4a90d9';
          row.style.color = '#fff';
        });

        attachRowReordering(listEl, function(fromIdx, toIdx) {
          var accs = getAccounts();
          if (fromIdx < 0 || fromIdx >= accs.length) return;
          var item = accs.splice(fromIdx, 1)[0];
          accs.splice(toIdx, 0, item);
          saveAccounts(accs);
          updateUI();
          showStatus("Order updated.");
        });
      }

      listEl.innerHTML = '';
      if (currentAccounts.length === 0) {
        var empty = document.createElement('div');
        empty.textContent = "No accounts available";
        empty.style.cssText = 'padding:10px 8px;color:#888;font-size:14px;';
        listEl.appendChild(empty);
      } else {
        currentAccounts.forEach(function(acc, idx) {
          var badges = [];
          if (acc.ACCOUNT_PERIOD && acc.ACCOUNT_PERIOD !== 30) badges.push(acc.ACCOUNT_PERIOD + "s");
          if (acc.ACCOUNT_DIGITS && acc.ACCOUNT_DIGITS !== 6) badges.push(acc.ACCOUNT_DIGITS + "-digit");
          var label = (idx + 1) + ". " + acc.ACCOUNT_NAME + (badges.length ? " (" + badges.join(", ") + ")" : "");

          var row = document.createElement('div');
          row.setAttribute('data-idx', idx);
          row.style.cssText =
            'display:flex;align-items:center;justify-content:space-between;' +
            'padding:10px 8px;border-bottom:1px solid #eee;font-size:14px;' +
            (idx === currentAccounts.length - 1 ? 'border-bottom:none;' : '');
          if (idx === 0) {
            row.style.background = '#4a90d9';
            row.style.color = '#fff';
          }

          var labelEl = document.createElement('span');
          labelEl.textContent = label;
          labelEl.style.cssText = 'flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;';
          row.appendChild(labelEl);

          // Hamburger drag handle — grabbing this (and only this) reorders the row.
          var handle = document.createElement('span');
          handle.className = 'drag-handle';
          handle.style.cssText =
            'display:flex;flex-direction:column;justify-content:space-between;' +
            'width:22px;height:14px;margin-left:10px;flex-shrink:0;cursor:grab;touch-action:none;';
          for (var b = 0; b < 3; b++) {
            var bar = document.createElement('span');
            bar.style.cssText = 'display:block;height:2px;border-radius:1px;background:currentColor;opacity:0.6;';
            handle.appendChild(bar);
          }
          row.appendChild(handle);

          listEl.appendChild(row);
        });
      }
    }

    function onImport() {
      var inputField = clayConfig.getItemById('import_text');
      var text = inputField.get();
      if (text) {
        var accs = getAccounts();
        var newAccs = parseOtpAuthStrings(text);
        if (newAccs.length > 0) {
          accs = accs.concat(newAccs);
          saveAccounts(accs);
          updateUI();
          inputField.set('');
          showStatus(newAccs.length + " accounts imported!");
        } else {
          showStatus("Error: No valid links.");
        }
      } else {
        showStatus("Error: Import field is empty.");
      }
    }

    function onAdd() {
      var nameField = clayConfig.getItemById('manual_name');
      var secField = clayConfig.getItemById('manual_secret');
      var periodField = clayConfig.getItemById('manual_period');
      var digitsField = clayConfig.getItemById('manual_digits');
      var n = nameField.get().trim();
      var s = secField.get().trim();
      var period = periodField ? parseInt(periodField.get(), 10) : 30;
      if (isNaN(period) || period <= 0) period = 30;
      var digits = digitsField ? parseInt(digitsField.get(), 10) : 6;
      if (digits !== 6 && digits !== 8) digits = 6;

      if (n && s) {
        var accs = getAccounts();
        accs.push({
          'ACCOUNT_NAME': n,
          'ACCOUNT_SECRET': s.replace(/\s+/g, '').toUpperCase(),
          'ACCOUNT_PERIOD': period,
          'ACCOUNT_DIGITS': digits
        });
        saveAccounts(accs);
        updateUI();
        nameField.set('');
        secField.set('');
        showStatus("Account added manually!");
      } else {
        showStatus("Error: Please enter Name and Secret.");
      }
    }

    var clearClicks = 0;
    function onDeleteSingle() {
      var dropdownItem = clayConfig.getItemById('account_dropdown');
      var selectedValue = dropdownItem.get();

      if (selectedValue !== null && selectedValue !== "-1" && selectedValue !== "") {
        var idx = parseInt(selectedValue, 10);
        var accs = getAccounts();

        if (!isNaN(idx) && idx >= 0 && idx < accs.length) {
          accs.splice(idx, 1);
          saveAccounts(accs);
          updateUI();
          showStatus("Account successfully deleted!");
        } else {
          showStatus("Error: Invalid index.");
        }
      } else {
        showStatus("Error: No account selected.");
      }
    }

    function onClearAll() {
      if (clearClicks === 0) {
        showStatus("Really delete ALL? Click again!");
        clearClicks++;
        setTimeout(function() { clearClicks = 0; }, 4000);
      } else {
        saveAccounts([]);
        updateUI();
        showStatus("ALL accounts have been deleted!");
        clearClicks = 0;
      }
    }

    function bindButtonByLabel(label, callback) {
      var allButtons = document.querySelectorAll('button');
      for (var i = 0; i < allButtons.length; i++) {
        if (allButtons[i].innerText.trim().toUpperCase() === label.toUpperCase()) {
          allButtons[i].addEventListener('touchend', function(e) {
            e.preventDefault();
            e.stopPropagation();
            callback();
          });
          allButtons[i].addEventListener('click', function(e) {
            e.preventDefault();
            callback();
          });
          return;
        }
      }
    }

    updateUI();

    bindButtonByLabel('Import',                  onImport);
    bindButtonByLabel('Add',                     onAdd);
    bindButtonByLabel('Delete Selected Account', onDeleteSingle);
    bindButtonByLabel('Delete ALL Accounts',     onClearAll);

    showStatus("Ready.");
  });
};

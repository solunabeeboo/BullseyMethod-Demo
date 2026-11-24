/*
 * claude-shim.js — lets the Bullseye Method run outside Claude (e.g. on GitHub Pages).
 *
 * Inside a Claude artifact the page gets `window.claude.use('db' | 'user' | 'downloads')`.
 * Anywhere else that object is missing, so this file provides a stand-in with the same
 * shape, backed by the browser's localStorage. If the real `window.claude` exists, this
 * file does nothing.
 *
 * Data is stored per browser, per device. Use Backup / Restore in the side menu to move it.
 */
(function () {
  'use strict';
  if (window.claude && typeof window.claude.use === 'function') return;

  window.BULLSEYE_STANDALONE = true;
  var KEY = 'bullseye-db-v1';

  // ---- In-memory copy of the database: { "<collection path>": { "<doc id>": {...} } }
  var mem = load();
  var listeners = {}; // collection path -> [fn]

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      var o = raw ? JSON.parse(raw) : {};
      return o && typeof o === 'object' ? o : {};
    } catch (e) { return {}; }
  }
  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(mem)); }
    catch (e) {
      var err = new Error('Storage is full');
      err.code = (e && (e.name === 'QuotaExceededError' || e.code === 22)) ? 'quota_exceeded' : 'storage_error';
      throw err;
    }
  }
  function clone(v) { return v === undefined ? undefined : JSON.parse(JSON.stringify(v)); }
  function snapshot(path) {
    var col = mem[path] || {};
    return {
      docs: Object.keys(col).map(function (id) {
        var d = col[id];
        return { id: id, exists: true, data: function () { return clone(d); } };
      })
    };
  }
  function notify(path) {
    (listeners[path] || []).slice().forEach(function (fn) {
      try { fn(snapshot(path)); } catch (e) { console.error(e); }
    });
  }
  function notifyAll() { Object.keys(listeners).forEach(notify); }
  function split(path) {
    var i = String(path).lastIndexOf('/');
    return { col: path.slice(0, i), id: path.slice(i + 1) };
  }
  // Apply a change, write it to disk (rolling back if that fails), then tell listeners
  // before the returned promise resolves, the way Firestore's local writes behave.
  function mutate(col, fn) {
    return new Promise(function (resolve, reject) {
      var before = clone(mem[col]);
      try { fn(); persist(); }
      catch (e) {
        if (before === undefined) delete mem[col]; else mem[col] = before;
        reject(e); return;
      }
      Promise.resolve().then(function () { notify(col); resolve(); });
    });
  }
  function docRef(path) {
    var p = split(path);
    return {
      id: p.id,
      get: function () {
        var col = mem[p.col] || {}, has = Object.prototype.hasOwnProperty.call(col, p.id);
        var d = has ? clone(col[p.id]) : undefined;
        return Promise.resolve({ id: p.id, exists: has, data: function () { return d; } });
      },
      set: function (data) {
        return mutate(p.col, function () { (mem[p.col] = mem[p.col] || {})[p.id] = clone(data); });
      },
      update: function (patch) {
        return mutate(p.col, function () {
          var col = mem[p.col] || {};
          if (!Object.prototype.hasOwnProperty.call(col, p.id)) {
            var e = new Error('No document to update: ' + path); e.code = 'not_found'; throw e;
          }
          col[p.id] = Object.assign({}, col[p.id], clone(patch));
        });
      },
      delete: function () {
        return mutate(p.col, function () { if (mem[p.col]) delete mem[p.col][p.id]; });
      }
    };
  }
  var db = {
    doc: docRef,
    collection: function (path) {
      return {
        doc: function (id) { return docRef(path + '/' + (id || ('i' + Math.random().toString(36).slice(2, 12)))); },
        onSnapshot: function (fn) {
          (listeners[path] = listeners[path] || []).push(fn);
          setTimeout(function () { fn(snapshot(path)); }, 0);
          return function () {
            var a = listeners[path] || [], i = a.indexOf(fn);
            if (i >= 0) a.splice(i, 1);
          };
        }
      };
    }
  };

  // Keep several open tabs of the app in step with each other.
  window.addEventListener('storage', function (e) {
    if (e.key !== KEY) return;
    mem = load(); notifyAll();
  });

  // ---- Single local user who owns everything.
  var user = {
    id: function () { return 'local'; },
    isOwner: function () { return true; },
    canEdit: function () { return true; },
    can: function () { return true; }
  };

  // ---- Downloads: save bytes as a normal browser download.
  function saveFile(name, data, type) {
    var blob = data instanceof Blob ? data : new Blob([data], { type: type || 'application/octet-stream' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 30000);
  }
  var downloads = {
    save: function (o) {
      var n = String((o && o.filename) || 'download');
      saveFile(n, o.data, /\.pdf$/i.test(n) ? 'application/pdf' : undefined);
      return Promise.resolve();
    }
  };

  window.claude = {
    use: function (name) {
      if (name === 'db') return Promise.resolve(db);
      if (name === 'user') return Promise.resolve(user);
      if (name === 'downloads') return Promise.resolve(downloads);
      return Promise.reject(Object.assign(new Error('Not available outside Claude: ' + name), { code: 'unavailable' }));
    }
  };

  // ---- Backup and restore, used by the side menu.
  window.bullseyeBackup = function () {
    var d = new Date(), pad = function (n) { return String(n).padStart(2, '0'); };
    var stamp = d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    var payload = { app: 'bullseye-method', version: 1, exported: d.toISOString(), data: mem };
    saveFile('bullseye-backup-' + stamp + '.json', JSON.stringify(payload, null, 2), 'application/json');
  };
  window.bullseyeRestore = function () {
    var input = document.createElement('input');
    input.type = 'file'; input.accept = 'application/json,.json';
    input.onchange = function () {
      var f = input.files && input.files[0]; if (!f) return;
      var r = new FileReader();
      r.onload = function () {
        var o;
        try { o = JSON.parse(r.result); } catch (e) { alert('That file isn’t a Bullseye backup.'); return; }
        if (!o || o.app !== 'bullseye-method' || !o.data || typeof o.data !== 'object') { alert('That file isn’t a Bullseye backup.'); return; }
        if (!confirm('Restore this backup? It replaces everything currently saved in this browser.')) return;
        var old = mem;
        mem = o.data;
        try { persist(); } catch (e) { mem = old; alert('Couldn’t restore: this browser’s storage is full.'); return; }
        location.reload();
      };
      r.readAsText(f);
    };
    input.click();
  };

  // Ask the browser not to clear this site's storage when space runs low.
  try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist(); } catch (e) {}
})();

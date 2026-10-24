'use strict';
// P0 iPhone 實機測試頁。語法限 ES2017 以內。
(function () {
  var BUILD = 'p0-1';

  function $(id) { return document.getElementById(id); }
  var setVal = window.em3SetVal || function () {};
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function fmtTime(ms) {
    if (typeof ms !== 'number' || !isFinite(ms)) return '-';
    var d = new Date(ms);
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' +
      pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds());
  }
  function errName(e) {
    if (!e) return '未知錯誤';
    return (e.name || 'Error') + (e.message ? '：' + e.message : '');
  }

  // ---------------------------------------------------------------- 1. 裝置資訊
  var feat = {};
  function measureSafe() {
    var p = $('safe-probe');
    var cs = window.getComputedStyle(p);
    return {
      t: parseFloat(cs.paddingTop) || 0,
      r: parseFloat(cs.paddingRight) || 0,
      b: parseFloat(cs.paddingBottom) || 0,
      l: parseFloat(cs.paddingLeft) || 0
    };
  }
  function isStandalone() {
    var a = window.navigator.standalone === true;
    var b = false;
    try { b = !!(window.matchMedia && window.matchMedia('(display-mode: standalone)').matches); } catch (e) {}
    return a || b;
  }
  function refreshDevice() {
    var sa = isStandalone();
    setVal('standalone', sa ? '是（從主畫面打開）' : '否（在 Safari 分頁裡）', sa ? 'ok' : 'warn');
    setVal('screen', screen.width + '×' + screen.height + '（視窗 ' + window.innerWidth + '×' + window.innerHeight + '）', '');
    setVal('dpr', String(Math.round((window.devicePixelRatio || 1) * 100) / 100), '');
    var s = measureSafe();
    setVal('safe', '上 ' + s.t + ' / 右 ' + s.r + ' / 下 ' + s.b + ' / 左 ' + s.l + '（px）', '');
  }
  function initDevice() {
    setVal('build', BUILD, '');
    feat.pointer = 'PointerEvent' in window;
    feat.sw = 'serviceWorker' in navigator;
    feat.gum = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    feat.idb = !!window.indexedDB;
    feat.audioSession = 'audioSession' in navigator;
    setVal('f-pointer', feat.pointer ? '支援' : '不支援（盤面會改用 touch 事件）', feat.pointer ? 'ok' : 'warn');
    setVal('f-sw', feat.sw ? '支援' : '不支援', feat.sw ? 'ok' : 'bad');
    setVal('f-gum', feat.gum ? '支援' : '不支援（相機掃 QR 會失敗）', feat.gum ? 'ok' : 'bad');
    setVal('f-idb', feat.idb ? '支援' : '不支援', feat.idb ? 'ok' : 'bad');
    var asTxt = feat.audioSession ? '支援（目前 type=' + safeAudioSessionType() + '）' : '不支援（iOS 16.4 以前沒有，屬正常）';
    setVal('f-audiosession', asTxt, feat.audioSession ? 'ok' : 'warn');
    function yn(b) { return b ? '有' : '無'; }
    setVal('feat', 'Pointer ' + yn(feat.pointer) + ' / SW ' + yn(feat.sw) + ' / 相機 ' + yn(feat.gum) +
      ' / IDB ' + yn(feat.idb) + ' / audioSession ' + yn(feat.audioSession), '');
    refreshDevice();
    window.addEventListener('resize', refreshDevice);
    window.addEventListener('orientationchange', function () { setTimeout(refreshDevice, 300); });
    setInterval(function () { setVal('now', fmtTime(Date.now()), ''); }, 1000);
    setVal('now', fmtTime(Date.now()), '');
  }
  function safeAudioSessionType() {
    try { return navigator.audioSession.type; } catch (e) { return '讀不到'; }
  }

  // ---------------------------------------------------------------- 2. 加到主畫面
  function initMeta() {
    var box = $('metaList');
    var items = [
      ['meta', 'viewport', 'content'],
      ['meta', 'apple-mobile-web-app-capable', 'content'],
      ['meta', 'mobile-web-app-capable', 'content'],
      ['meta', 'apple-mobile-web-app-status-bar-style', 'content'],
      ['meta', 'apple-mobile-web-app-title', 'content'],
      ['link', 'apple-touch-icon', 'href'],
      ['link', 'manifest', 'href']
    ];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      var el = it[0] === 'meta' ? document.querySelector('meta[name="' + it[1] + '"]')
                                : document.querySelector('link[rel="' + it[1] + '"]');
      var val = el ? el.getAttribute(it[2]) : null;
      var row = document.createElement('div');
      row.className = 'row';
      var k = document.createElement('div');
      k.className = 'k';
      k.textContent = it[1];
      k.style.flexBasis = '10em';
      k.style.fontSize = '20px';
      var v = document.createElement('div');
      v.className = 'v ' + (val ? 'ok' : 'bad');
      v.textContent = (val ? '✓ ' : '✗ 沒有') + (val || '');
      v.style.fontSize = '20px';
      row.appendChild(k);
      row.appendChild(v);
      box.appendChild(row);
    }
    if (window.fetch) {
      fetch('manifest.webmanifest').then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      }).then(function (j) {
        var icons = (j.icons || []).map(function (x) { return x.sizes; }).join(',');
        setVal('manifest', '讀取成功：name=' + j.name + ' short_name=' + j.short_name + ' start_url=' + j.start_url +
          ' scope=' + j.scope + ' display=' + j.display + ' icons=' + icons, 'ok');
      }).catch(function (e) {
        setVal('manifest', '讀取失敗：' + errName(e), 'bad');
      });
    } else {
      setVal('manifest', '此瀏覽器沒有 fetch，略過', 'warn');
    }
  }

  // ---------------------------------------------------------------- 3 / 4. 盤面手勢、底部安全區
  var N = 9;
  var COLORS = ['#e53935', '#1e88e5', '#43a047', '#fdd835', '#8e24aa', '#fb8c00'];
  // 形狀：0 圓、1 方、2 星、3 愛心、4 水滴、5 三角
  var board = [];
  var seed = 20261024;
  function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
  for (var r0 = 0; r0 < N; r0++) {
    board[r0] = [];
    for (var c0 = 0; c0 < N; c0++) board[r0][c0] = Math.floor(rnd() * 6);
  }

  var canvas = $('board');
  var ctx = canvas.getContext('2d');
  var W = 360, cell = 40, dpr = 1;
  var sel = null;
  var anim = null;
  var rafId = 0;
  var SWAP_MS = 130;
  var cancelCount = 0, opCount = 0, lastEvLabel = '尚無';

  // 全螢幕模式：算出「盤面以外」的內容佔多高，盤面才不會被擠出螢幕
  function fullOthersHeight() {
    var st = $('stage');
    var cs = window.getComputedStyle(st);
    var h = (parseFloat(cs.paddingTop) || 0) + 8 + 16;
    for (var i = 0; i < st.children.length; i++) {
      var el = st.children[i];
      if (el.id === 'boardWrap') continue;
      var ec = window.getComputedStyle(el);
      if (ec.display === 'none') continue;
      // .stage-top 的下邊距是 auto（會吃掉剩餘空間），不能算進去
      var mb = el.className.indexOf('stage-top') >= 0 ? 0 : (parseFloat(ec.marginBottom) || 0);
      h += el.offsetHeight + (parseFloat(ec.marginTop) || 0) + mb;
    }
    return h;
  }

  function layoutBoard() {
    var wrap = $('boardWrap');
    var w = Math.floor(wrap.clientWidth);
    if (w > 520) w = 520;
    if (document.body.classList.contains('stage-full')) {
      var maxH = window.innerHeight - fullOthersHeight();
      if (w > maxH) w = maxH;
    }
    if (w < 180) w = 180;
    W = w;
    cell = W / N;
    dpr = window.devicePixelRatio || 1;
    canvas.style.width = W + 'px';
    canvas.style.height = W + 'px';
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(W * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    requestDraw();
  }

  function pathPiece(type, cx, cy, r) {
    ctx.beginPath();
    var i, a;
    if (type === 0) {
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
    } else if (type === 1) {
      ctx.rect(cx - r * 0.88, cy - r * 0.88, r * 1.76, r * 1.76);
    } else if (type === 2) {
      for (i = 0; i < 10; i++) {
        a = -Math.PI / 2 + i * Math.PI / 5;
        var rr = (i % 2 === 0) ? r * 1.12 : r * 0.5;
        var x = cx + Math.cos(a) * rr, y = cy + 0.05 * r + Math.sin(a) * rr;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.closePath();
    } else if (type === 3) {
      ctx.moveTo(cx, cy + r * 0.95);
      ctx.bezierCurveTo(cx - r * 1.45, cy + r * 0.05, cx - r * 0.95, cy - r * 1.0, cx, cy - r * 0.38);
      ctx.bezierCurveTo(cx + r * 0.95, cy - r * 1.0, cx + r * 1.45, cy + r * 0.05, cx, cy + r * 0.95);
      ctx.closePath();
    } else if (type === 4) {
      var oy = -r * 0.12;
      ctx.moveTo(cx, cy - r * 1.05 + oy);
      ctx.bezierCurveTo(cx + r * 0.2, cy - r * 0.5 + oy, cx + r * 0.85, cy - r * 0.1 + oy, cx + r * 0.85, cy + r * 0.25 + oy);
      ctx.arc(cx, cy + r * 0.25 + oy, r * 0.85, 0, Math.PI, false);
      ctx.bezierCurveTo(cx - r * 0.85, cy - r * 0.1 + oy, cx - r * 0.2, cy - r * 0.5 + oy, cx, cy - r * 1.05 + oy);
      ctx.closePath();
    } else {
      ctx.moveTo(cx, cy - r * 1.0);
      ctx.lineTo(cx + r * 1.05, cy + r * 0.85);
      ctx.lineTo(cx - r * 1.05, cy + r * 0.85);
      ctx.closePath();
    }
  }

  function drawPiece(type, px, py, scale, glow) {
    var cx = px + cell / 2, cy = py + cell / 2;
    var r = cell * 0.33 * (scale || 1);
    ctx.save();
    pathPiece(type, cx, cy, r);
    ctx.fillStyle = COLORS[type];
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, cell * 0.05);
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.65)';
    ctx.stroke();
    ctx.lineWidth = Math.max(1, cell * 0.025);
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    pathPiece(type, cx, cy, r * 0.8);
    ctx.stroke();
    ctx.restore();
  }

  function ease(t) { return t * t * (3 - 2 * t); }

  function draw() {
    var now = performance.now();
    var t = 1;
    if (anim) t = Math.min(1, (now - anim.t0) / anim.dur);
    var e = ease(t);
    ctx.clearRect(0, 0, W, W);
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, W, W);
    var r, c;
    for (r = 0; r < N; r++) {
      for (c = 0; c < N; c++) {
        ctx.fillStyle = ((r + c) % 2) ? '#1f2c52' : '#1a2646';
        ctx.fillRect(c * cell, r * cell, cell, cell);
      }
    }
    var moving = [];
    for (r = 0; r < N; r++) {
      for (c = 0; c < N; c++) {
        var isA = anim && anim.a.r === r && anim.a.c === c;
        var isB = anim && anim.b.r === r && anim.b.c === c;
        if (isA || isB) {
          var from = isA ? anim.b : anim.a;
          var x = (from.c + (c - from.c) * e) * cell;
          var y = (from.r + (r - from.r) * e) * cell;
          moving.push([board[r][c], x, y]);
          continue;
        }
        var isSel = sel && sel.r === r && sel.c === c;
        if (isSel) drawSelection(c * cell, r * cell);
        drawPiece(board[r][c], c * cell, r * cell, isSel ? 1.12 : 1);
      }
    }
    for (var i = 0; i < moving.length; i++) drawPiece(moving[i][0], moving[i][1], moving[i][2], 1);
  }

  function drawSelection(px, py) {
    ctx.save();
    var m = cell * 0.06;
    ctx.fillStyle = 'rgba(255,255,255,0.22)';
    ctx.fillRect(px + m, py + m, cell - 2 * m, cell - 2 * m);
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = cell * 0.35;
    ctx.lineWidth = Math.max(3, cell * 0.11);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(px + m + 1, py + m + 1, cell - 2 * m - 2, cell - 2 * m - 2);
    ctx.restore();
  }

  function frame() {
    rafId = 0;
    if (anim && performance.now() - anim.t0 >= anim.dur) anim = null;
    draw();
    if (anim) rafId = requestAnimationFrame(frame);
  }
  function requestDraw() { if (!rafId) rafId = requestAnimationFrame(frame); }

  function setLastOp(how, a, b) {
    $('lastOp').textContent = '最後一次操作：' + how + '，從 (' + (a.r + 1) + ',' + (a.c + 1) + ') 到 (' + (b.r + 1) + ',' + (b.c + 1) + ')';
  }
  function doSwap(a, b, how) {
    if (anim && performance.now() - anim.t0 < anim.dur) return false;
    var t = board[a.r][a.c];
    board[a.r][a.c] = board[b.r][b.c];
    board[b.r][b.c] = t;
    anim = { a: { r: a.r, c: a.c }, b: { r: b.r, c: b.c }, t0: performance.now(), dur: SWAP_MS };
    sel = null;
    opCount++;
    setLastOp(how, a, b);
    updateGestureInfo();
    requestDraw();
    return true;
  }
  function handleTap(ce) {
    if (!sel) {
      sel = ce;
    } else if (sel.r === ce.r && sel.c === ce.c) {
      sel = null;
    } else if (Math.abs(sel.r - ce.r) + Math.abs(sel.c - ce.c) === 1) {
      doSwap(sel, ce, '點兩下');
      return;
    } else {
      sel = ce;
    }
    requestDraw();
  }

  var drag = null;
  function pos(cx, cy) {
    var rect = canvas.getBoundingClientRect();
    return { x: cx - rect.left, y: cy - rect.top };
  }
  function cellAt(p) {
    var c = Math.floor(p.x / cell), r = Math.floor(p.y / cell);
    if (r < 0 || c < 0 || r >= N || c >= N) return null;
    return { r: r, c: c };
  }
  function onDown(cx, cy) {
    var p = pos(cx, cy);
    var ce = cellAt(p);
    drag = ce ? { cell: ce, x0: p.x, y0: p.y, done: false, moved: false } : null;
  }
  function onMove(cx, cy) {
    if (!drag || drag.done) return;
    var p = pos(cx, cy);
    var dx = p.x - drag.x0, dy = p.y - drag.y0;
    var ax = Math.abs(dx), ay = Math.abs(dy);
    if (Math.max(ax, ay) < cell * 0.3) return;
    drag.moved = true;
    drag.done = true;
    var tr = drag.cell.r, tc = drag.cell.c;
    if (ax >= ay) tc += dx > 0 ? 1 : -1; else tr += dy > 0 ? 1 : -1;
    if (tr < 0 || tc < 0 || tr >= N || tc >= N) return;
    doSwap(drag.cell, { r: tr, c: tc }, '拖曳');
  }
  function onUp() {
    if (drag && !drag.done && !drag.moved) handleTap(drag.cell);
    drag = null;
  }
  function onCancel() {
    cancelCount++;
    drag = null;
    updateGestureInfo();
  }
  function updateGestureInfo() {
    var txt = (feat.pointer ? 'Pointer' : 'touch') + '｜最近：' + lastEvLabel +
      '｜被中斷(cancel) ' + cancelCount + ' 次｜交換 ' + opCount + ' 次';
    $('evInfo').textContent = txt;
    setVal('gesture', (feat.pointer ? 'Pointer' : 'touch') + '，交換 ' + opCount + ' 次，cancel ' + cancelCount + ' 次',
      cancelCount > 0 ? 'warn' : '');
  }

  function initBoard() {
    var pe = { passive: false };
    if (feat.pointer) {
      var active = null;
      canvas.addEventListener('pointerdown', function (e) {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        active = e.pointerId;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
        lastEvLabel = 'pointerdown(' + e.pointerType + ')';
        onDown(e.clientX, e.clientY);
        e.preventDefault();
      });
      canvas.addEventListener('pointermove', function (e) {
        if (e.pointerId !== active) return;
        onMove(e.clientX, e.clientY);
        e.preventDefault();
      });
      canvas.addEventListener('pointerup', function (e) {
        if (e.pointerId !== active) return;
        active = null;
        lastEvLabel = 'pointerup';
        onUp();
        updateGestureInfo();
        e.preventDefault();
      });
      canvas.addEventListener('pointercancel', function (e) {
        if (e.pointerId !== active) return;
        active = null;
        lastEvLabel = 'pointercancel';
        onCancel();
      });
    } else {
      canvas.addEventListener('touchstart', function (e) {
        var t = e.changedTouches[0];
        lastEvLabel = 'touchstart';
        onDown(t.clientX, t.clientY);
        e.preventDefault();
      }, pe);
      canvas.addEventListener('touchmove', function (e) {
        var t = e.changedTouches[0];
        onMove(t.clientX, t.clientY);
      }, pe);
      canvas.addEventListener('touchend', function (e) {
        lastEvLabel = 'touchend';
        onUp();
        updateGestureInfo();
        e.preventDefault();
      }, pe);
      canvas.addEventListener('touchcancel', function () {
        lastEvLabel = 'touchcancel';
        onCancel();
      }, pe);
    }
    // 盤面上的 touchmove 一律擋掉，頁面不會被橡皮筋拉動（兩種模式都要）
    canvas.addEventListener('touchmove', function (e) { e.preventDefault(); }, pe);
    // 全螢幕測試模式下整頁不准捲動
    document.addEventListener('touchmove', function (e) {
      if (document.body.classList.contains('stage-full')) {
        var t = e.target;
        if (t && t.tagName === 'TEXTAREA') return;
        e.preventDefault();
      }
    }, pe);

    $('btnFull').addEventListener('click', function () {
      var on = document.body.classList.toggle('stage-full');
      $('btnFull').textContent = on ? '離開全螢幕測試' : '進入全螢幕測試（盤面貼底）';
      window.scrollTo(0, 0);
      setTimeout(layoutBoard, 50);
    });
    window.addEventListener('resize', layoutBoard);
    window.addEventListener('orientationchange', function () { setTimeout(layoutBoard, 300); });

    // 防干擾
    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });
    document.addEventListener('gesturechange', function (e) { e.preventDefault(); });
    document.addEventListener('gestureend', function (e) { e.preventDefault(); });
    document.addEventListener('dblclick', function (e) { e.preventDefault(); });

    // 4. 假道具列
    var btns = document.querySelectorAll('.prop');
    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        $('propInfo').textContent = '點到第 ' + this.getAttribute('data-n') + ' 個';
      });
    }
    layoutBoard();
    updateGestureInfo();
  }

  // ---------------------------------------------------------------- 5. 聲音
  var actx1 = null, actx2 = null;
  function newAudioCtx() {
    var AC = window.AudioContext || window.webkitAudioContext;
    return AC ? new AC() : null;
  }
  function playSeq(ac) {
    var t0 = ac.currentTime + 0.05;
    for (var i = 0; i < 5; i++) {
      var o = ac.createOscillator();
      var g = ac.createGain();
      var t = t0 + i * 0.18;
      o.type = 'triangle';
      o.frequency.value = 523.25 * Math.pow(2, (i * 2) / 12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.4, t + 0.015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
      o.connect(g);
      g.connect(ac.destination);
      o.start(t);
      o.stop(t + 0.17);
    }
  }
  var audioRes = { a1: '尚未測', a2: '尚未測' };
  function audioSummary() {
    setVal('audio', '一般：' + audioRes.a1 + '；playback：' + audioRes.a2, '');
  }
  function playTest(which) {
    var key = which === 1 ? 'audio1' : 'audio2';
    var ac = which === 1 ? actx1 : actx2;
    try {
      if (!ac) {
        ac = newAudioCtx();
        if (which === 1) actx1 = ac; else actx2 = ac;
      }
      if (!ac) {
        setVal(key, '此瀏覽器沒有 AudioContext', 'bad');
        audioRes['a' + which] = '無 AudioContext';
        audioSummary();
        return;
      }
      var before = ac.state;
      if (ac.resume) {
        var p = ac.resume();
        if (p && p.catch) p.catch(function (e) { setVal(key, 'resume 失敗：' + errName(e), 'bad'); });
      }
      playSeq(ac);
      setVal(key, '已送出 5 個嗶聲，檢查中…（點擊前 state=' + before + '）', 'warn');
      setTimeout(function () {
        var running = ac.state === 'running' && ac.currentTime > 0.1;
        var txt = (running ? '已開始播放' : '沒有開始播放') + '（state=' + ac.state + '，音訊時鐘 ' + ac.currentTime.toFixed(2) + ' 秒）。聽得到嗎？聽不到先看靜音鍵。';
        setVal(key, txt, running ? 'ok' : 'bad');
        audioRes['a' + which] = running ? '成功開始(' + ac.state + ')' : '未開始(' + ac.state + ')';
        audioSummary();
      }, 700);
    } catch (e) {
      setVal(key, '錯誤：' + errName(e), 'bad');
      audioRes['a' + which] = '錯誤 ' + (e && e.name);
      audioSummary();
    }
  }
  function initAudio() {
    $('btnPlay').addEventListener('click', function () { playTest(1); });
    var b2 = $('btnPlayback');
    if (!feat.audioSession) {
      b2.disabled = true;
      b2.style.opacity = '0.5';
      setVal('audio2', '此裝置沒有 navigator.audioSession（iOS 16.4 以前沒有，屬正常，不用測）', 'warn');
      audioRes.a2 = '無 audioSession';
    } else {
      b2.addEventListener('click', function () {
        try {
          navigator.audioSession.type = 'playback';
        } catch (e) {
          setVal('audio2', '設定 audioSession.type 失敗：' + errName(e), 'bad');
          return;
        }
        playTest(2);
      });
    }
    audioSummary();
  }

  // ---------------------------------------------------------------- 6. 存檔
  var LS_KEY = 'em3p0_save';
  var DB_NAME = 'em3p0', STORE = 'kv';
  var cur = { ls: null, idb: null, lsErr: null, idbErr: null };

  function lsRead() {
    try {
      var s = localStorage.getItem(LS_KEY);
      return { ok: true, val: s ? JSON.parse(s) : null };
    } catch (e) { return { ok: false, err: errName(e) }; }
  }
  function lsWrite(obj) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(obj)); return { ok: true }; }
    catch (e) { return { ok: false, err: errName(e) }; }
  }
  function withTimeout(promise, ms, label) {
    return new Promise(function (resolve, reject) {
      var done = false;
      var tm = setTimeout(function () { if (!done) { done = true; reject(new Error(label + ' 逾時 ' + ms + 'ms（可能卡住）')); } }, ms);
      promise.then(function (v) { if (!done) { done = true; clearTimeout(tm); resolve(v); } },
                   function (e) { if (!done) { done = true; clearTimeout(tm); reject(e); } });
    });
  }
  function idbOpen() {
    return new Promise(function (resolve, reject) {
      if (!window.indexedDB) { reject(new Error('不支援 IndexedDB')); return; }
      var req;
      try { req = indexedDB.open(DB_NAME, 1); } catch (e) { reject(e); return; }
      req.onupgradeneeded = function () { req.result.createObjectStore(STORE); };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error || new Error('open 失敗')); };
      req.onblocked = function () { reject(new Error('open 被擋住')); };
    });
  }
  function idbRead() {
    return withTimeout(idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readonly');
        var rq = tx.objectStore(STORE).get('save');
        rq.onsuccess = function () { db.close(); resolve({ ok: true, val: rq.result || null }); };
        rq.onerror = function () { db.close(); reject(rq.error || new Error('get 失敗')); };
      });
    }), 5000, 'IndexedDB 讀取').catch(function (e) { return { ok: false, err: errName(e) }; });
  }
  function idbWrite(obj) {
    return withTimeout(idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put(obj, 'save');
        tx.oncomplete = function () { db.close(); resolve({ ok: true }); };
        tx.onerror = function () { db.close(); reject(tx.error || new Error('put 失敗')); };
        tx.onabort = function () { db.close(); reject(tx.error || new Error('交易中止')); };
      });
    }), 5000, 'IndexedDB 寫入').catch(function (e) { return { ok: false, err: errName(e) }; });
  }

  function descSave(res) {
    if (!res.ok) return '讀取失敗：' + res.err;
    if (!res.val) return '（還沒有存檔）';
    var v = res.val;
    return '第一次存：' + fmtTime(v.f) + '\n最後一次存：' + fmtTime(v.l) + '\n計數：' + v.c;
  }
  function refreshStorage() {
    var l = lsRead();
    return idbRead().then(function (i) {
      cur.ls = l.ok ? l.val : null;
      cur.idb = i.ok ? i.val : null;
      setVal('st-ls', descSave(l), l.ok ? '' : 'bad');
      setVal('st-idb', descSave(i), i.ok ? '' : 'bad');
      var cmpTxt, st;
      if (!l.ok || !i.ok) {
        cmpTxt = '有一邊讀不到，無法比較（localStorage ' + (l.ok ? '正常' : '壞') + '，IndexedDB ' + (i.ok ? '正常' : '壞') + '）';
        st = 'bad';
      } else if (!l.val && !i.val) {
        cmpTxt = '兩邊都還沒有存檔';
        st = 'warn';
      } else if (!l.val || !i.val || l.val.c !== i.val.c || l.val.f !== i.val.f || l.val.l !== i.val.l) {
        cmpTxt = '兩邊不一致！（localStorage 計數 ' + (l.val ? l.val.c : '無') + '，IndexedDB 計數 ' + (i.val ? i.val.c : '無') + '）';
        st = 'bad';
      } else {
        cmpTxt = '一致（計數 ' + l.val.c + '）';
        st = 'ok';
      }
      setVal('st-cmp', cmpTxt, st);
      setVal('store', cmpTxt, st);
    });
  }
  function saveOne() {
    var now = Date.now();
    var l = lsRead();
    var lv = l.ok ? l.val : null;
    var nl = { c: (lv ? lv.c : 0) + 1, f: lv ? lv.f : now, l: now };
    lsWrite(nl);
    return idbRead().then(function (i) {
      var iv = i.ok ? i.val : null;
      var ni = { c: (iv ? iv.c : 0) + 1, f: iv ? iv.f : now, l: now };
      return idbWrite(ni);
    }).then(refreshStorage);
  }
  function writeBoth(obj) {
    lsWrite(obj);
    return idbWrite(obj).then(refreshStorage);
  }
  function initStorage() {
    $('btnSave').addEventListener('click', function () { saveOne(); });
    refreshStorage();
    if (navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(function (granted) {
        var p = navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve('未知');
        return p.then(function (persisted) {
          setVal('persist', 'persist() 回傳 ' + granted + '；persisted() = ' + persisted + (persisted === true ? '' : '（false 代表系統隨時可清掉資料）'),
            persisted === true ? 'ok' : 'warn');
        });
      }).catch(function (e) { setVal('persist', 'persist 呼叫失敗：' + errName(e), 'bad'); });
    } else {
      setVal('persist', '不支援 navigator.storage.persist（舊 iOS 沒有）', 'warn');
    }
  }

  // ---------------------------------------------------------------- 7. QR
  var PREFIX = 'EM3P0:';
  function bestSave() {
    var a = cur.ls, b = cur.idb;
    if (a && b) return a.c >= b.c ? a : b;
    return a || b || null;
  }
  function encodePayload(o) {
    return PREFIX + btoa(unescape(encodeURIComponent(JSON.stringify({ c: o.c, f: o.f, l: o.l }))));
  }
  function decodePayload(text) {
    var i = text.indexOf(PREFIX);
    if (i < 0) throw new Error('沒有 ' + PREFIX + ' 開頭');
    var b64 = text.slice(i + PREFIX.length).replace(/\s+/g, '');
    var o = JSON.parse(decodeURIComponent(escape(atob(b64))));
    if (typeof o.c !== 'number' || typeof o.f !== 'number' || typeof o.l !== 'number' || o.c < 0) throw new Error('內容格式不對');
    return o;
  }
  function showQR() {
    if (typeof qrcode !== 'function') { setVal('qr', 'qrcode.js 沒載入成功', 'bad'); return; }
    refreshStorage().then(function () {
      var s = bestSave();
      if (!s) { setVal('qr', '還沒有存檔，請先到第 6 項按「存一筆進度」', 'warn'); return; }
      var text = encodePayload(s);
      var qr = qrcode(0, 'M');
      qr.addData(text);
      qr.make();
      var n = qr.getModuleCount();
      var total = n + 8;
      var cssScale = Math.max(4, Math.floor(300 / total));
      var di = Math.max(1, Math.round(window.devicePixelRatio || 1));
      var px = cssScale * di;
      var cv = $('qrCanvas');
      cv.width = total * px;
      cv.height = total * px;
      cv.style.width = (total * cssScale) + 'px';
      cv.style.height = (total * cssScale) + 'px';
      var g = cv.getContext('2d');
      g.fillStyle = '#fff';
      g.fillRect(0, 0, cv.width, cv.height);
      g.fillStyle = '#000';
      for (var r = 0; r < n; r++) {
        for (var c = 0; c < n; c++) {
          if (qr.isDark(r, c)) g.fillRect((c + 4) * px, (r + 4) * px, px, px);
        }
      }
      $('qrText').textContent = text;
      $('qrBox').classList.remove('hide');
      setVal('qr', 'QR 已顯示（計數 ' + s.c + '，' + (total * cssScale) + 'px 見方）', 'ok');
    });
  }

  var scan = { stream: null, timer: null, frames: 0 };
  function stopScan() {
    if (scan.timer) { clearInterval(scan.timer); scan.timer = null; }
    if (scan.stream) {
      try { scan.stream.getTracks().forEach(function (t) { t.stop(); }); } catch (e) {}
      scan.stream = null;
    }
    var v = $('scanVideo');
    try { v.pause(); } catch (e) {}
    v.srcObject = null;
    $('scanBox').classList.add('hide');
  }
  function applyPayload(text, src) {
    var o;
    try { o = decodePayload(text); } catch (e) { setVal('qr', '內容無法解讀：' + errName(e), 'bad'); return; }
    writeBoth(o).then(function () {
      setVal('qr', '已找回：計數 ' + o.c + '（來源：' + src + '，最後存檔 ' + fmtTime(o.l) + '）', 'ok');
    });
  }
  function scanTick() {
    var v = $('scanVideo');
    if (!v.videoWidth || v.readyState < 2) return;
    try {
      var tw = Math.min(v.videoWidth, 640);
      var th = Math.round(v.videoHeight * tw / v.videoWidth);
      var cv = $('scanCanvas');
      cv.width = tw;
      cv.height = th;
      var g = cv.getContext('2d');
      g.drawImage(v, 0, 0, tw, th);
      var img = g.getImageData(0, 0, tw, th);
      scan.frames++;
      var code = jsQR(img.data, tw, th, { inversionAttempts: 'dontInvert' });
      if (code && code.data) {
        if (code.data.indexOf(PREFIX) === 0) {
          stopScan();
          applyPayload(code.data, '相機掃描');
          return;
        }
        setVal('qr', '相機開著，已分析 ' + scan.frames + ' 張；看到別的 QR 碼，已略過', 'warn');
        return;
      }
      setVal('qr', '相機開著，已分析 ' + scan.frames + ' 張，還沒掃到。請對準 QR 碼', 'warn');
    } catch (e) {
      setVal('qr', '分析影像出錯：' + errName(e), 'bad');
    }
  }
  function startScan() {
    if (typeof jsQR !== 'function') { setVal('qr', 'jsQR.js 沒載入成功', 'bad'); return; }
    if (!feat.gum) {
      setVal('qr', '這個環境沒有 getUserMedia，不能開相機（需要 https；從主畫面開在舊 iOS 也可能不行）', 'bad');
      return;
    }
    stopScan();
    scan.frames = 0;
    var v = $('scanVideo');
    v.setAttribute('playsinline', '');
    v.setAttribute('muted', '');
    v.muted = true;
    $('scanBox').classList.remove('hide');
    setVal('qr', '正在要求相機權限…', 'warn');
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(function (stream) {
      scan.stream = stream;
      v.srcObject = stream;
      var p = v.play();
      if (p && p.catch) p.catch(function (e) { setVal('qr', '影片無法播放：' + errName(e), 'bad'); });
      scan.timer = setInterval(scanTick, 200);
      setVal('qr', '相機已開，請對準 QR 碼', 'warn');
    }).catch(function (err) {
      $('scanBox').classList.add('hide');
      setVal('qr', '拿不到相機：' + errName(err), 'bad');
    });
  }
  function initQR() {
    $('btnShowQR').addEventListener('click', showQR);
    $('btnScan').addEventListener('click', startScan);
    $('btnCancelScan').addEventListener('click', function () {
      stopScan();
      setVal('qr', '已取消掃描，相機已關', 'warn');
    });
    $('btnPaste').addEventListener('click', function () {
      var t = $('pasteBox').value;
      if (!t || !t.trim()) { setVal('qr', '輸入框是空的', 'warn'); return; }
      applyPayload(t, '貼上文字');
    });
    var miss = [];
    if (typeof qrcode !== 'function') miss.push('qrcode.js');
    if (typeof jsQR !== 'function') miss.push('jsQR.js');
    if (miss.length) setVal('qr', '沒載入成功：' + miss.join('、'), 'bad');
  }

  // ---------------------------------------------------------------- 8. 離線
  var EXPECT = ['index.html', 'app.js', 'style.css', 'manifest.webmanifest', 'icon-180.png', 'icon-512.png', 'vendor/qrcode.js', 'vendor/jsQR.js'];
  function updateOnline() {
    setVal('online', navigator.onLine ? '有網路' : '沒有網路', navigator.onLine ? '' : 'warn');
  }
  function updateSwStatus() {
    var ctl = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
    setVal('swctl', ctl ? '是（本頁由快取控制）' : '否（第一次載入通常是否；重新整理一次再看）', ctl ? 'ok' : 'warn');
    if (!window.caches) { setVal('swcache', '尚未就緒：此瀏覽器沒有 Cache API', 'bad'); return; }
    caches.keys().then(function (keys) {
      var names = keys.filter(function (k) { return k.indexOf('em3p0-') === 0; });
      if (!names.length) { setVal('swcache', '尚未就緒（還沒有任何快取）', 'warn'); return; }
      var name = names[names.length - 1];
      return caches.open(name).then(function (c) {
        return Promise.all(EXPECT.map(function (p) {
          return c.match(new URL(p, location.href).href).then(function (r) { return r ? null : p; });
        })).then(function (res) {
          var missing = res.filter(function (x) { return x; });
          var ok = !missing.length;
          setVal('swcache', ok ? '已就緒（' + name + '，' + EXPECT.length + ' 個檔案都在）'
                               : '尚未就緒（' + name + ' 缺：' + missing.join('、') + '）', ok ? 'ok' : 'warn');
        });
      });
    }).catch(function (e) { setVal('swcache', '尚未就緒：檢查出錯 ' + errName(e), 'bad'); });
  }
  function initOffline() {
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    $('btnRecheck').addEventListener('click', updateSwStatus);
    if (!feat.sw) {
      setVal('swreg', '不支援 Service Worker', 'bad');
      setVal('swctl', '不支援', 'bad');
      setVal('swcache', '尚未就緒：不支援 Service Worker', 'bad');
      return;
    }
    navigator.serviceWorker.addEventListener('controllerchange', updateSwStatus);
    navigator.serviceWorker.register('sw.js', { scope: './' }).then(function (reg) {
      setVal('swreg', '註冊成功（scope ' + reg.scope + '）', 'ok');
      return navigator.serviceWorker.ready;
    }).then(function () {
      updateSwStatus();
      setTimeout(updateSwStatus, 1500);
      setTimeout(updateSwStatus, 5000);
    }).catch(function (e) {
      setVal('swreg', '註冊失敗：' + errName(e), 'bad');
      updateSwStatus();
    });
    updateSwStatus();
  }

  // ---------------------------------------------------------------- 啟動
  initDevice();
  initMeta();
  initBoard();
  initAudio();
  initStorage();
  initQR();
  initOffline();
})();

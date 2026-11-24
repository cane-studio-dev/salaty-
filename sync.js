/* صلاتي — التخزين المحلي أولاً + طابور المزامنة السحابية (Firebase) */
(function (SL) {
  'use strict';
  const cfg = window.FIREBASE_CONFIG || {};
  const cloudOn = !!(window.firebase && cfg.apiKey && !/PASTE/.test(cfg.apiKey) && !/PASTE/.test(cfg.projectId));
  let db = null, auth = null, authReady = null, unsubs = [], listening = false, flushing = false;

  SL.cloud = { enabled: cloudOn, online: navigator.onLine, pending: 0, lastSync: SL.load('lastSync', 0), error: null };
  SL.cache = Object.assign({ settings: {}, ann: [], wird: [], msgs: [], daysAll: {}, users: [], wirdDone: [], staff: [], staffMsgs: [], actsAll: {}, wirdAll: {}, dhikr: [] }, SL.load('cache', {}));
  const saveCache = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => SL.save('cache', SL.cache), 400); }; })();
  const notify = (() => { let t; return () => { clearTimeout(t); t = setTimeout(() => SL.emit('data'), 120); }; })();
  const status = () => { SL.cloud.pending = outbox().length; SL.emit('status'); };

  /* ---------- الطابور ---------- */
  const outbox = () => SL.load('outbox', []);
  const setOutbox = a => { SL.save('outbox', a); };
  SL.queue = (col, doc, data, opts) => {
    if (SL.demo) return; // وضع المعاينة: لا شيء يُحفظ
    const o = outbox().filter(x => !(x.col === col && x.doc === doc && x.merge === false && !(opts && opts.keep)));
    o.push({ col, doc, data, merge: !(opts && opts.merge === false), t: Date.now(), k: SL.uid() });
    setOutbox(o); status(); SL.flush();
  };
  /** يستبدل أي عملية معلّقة لنفس المستند بلقطة جديدة كاملة (للأنشطة اليومية) */
  SL.queueReplace = (col, doc, data) => {
    if (SL.demo) return;
    const o = outbox().filter(x => !(x.col === col && x.doc === doc && !x.del));
    o.push({ col, doc, data, merge: true, t: Date.now(), k: SL.uid() }); setOutbox(o); status(); SL.flush();
  };
  const same = (a, b) => a.k ? a.k === b.k : (a.t === b.t && a.col === b.col && a.doc === b.doc);
  SL.queueDelete = (col, doc) => { if (SL.demo) return; const o = outbox(); o.push({ col, doc, del: true, t: Date.now(), k: SL.uid() }); setOutbox(o); status(); SL.flush(); };

  const withTimeout = (p, ms) => Promise.race([p, new Promise((_, r) => setTimeout(() => r({ code: 'timeout' }), ms))]);
  SL.ensureAuth = () => {
    if (!cloudOn) return Promise.reject({ code: 'no-cloud' });
    if (auth.currentUser) return Promise.resolve(auth.currentUser);
    authReady = authReady || withTimeout(auth.signInAnonymously().then(c => c.user), 15000).finally(() => { authReady = null; });
    return authReady;
  };

  SL.flush = async function () {
    if (!cloudOn || flushing || !navigator.onLine) return;
    flushing = true;
    try {
      await SL.ensureAuth();
      let o = outbox();
      while (o.length) {
        const op = o[0];
        try {
          const ref = db.collection(op.col).doc(op.doc);
          await withTimeout(op.del ? ref.delete() : ref.set(op.data, { merge: op.merge }), 20000);
          o = outbox().filter(x => !same(x, op)); setOutbox(o);
          SL.cloud.lastSync = Date.now(); SL.save('lastSync', SL.cloud.lastSync); SL.cloud.error = null;
        } catch (e) {
          if (e && (e.code === 'permission-denied' || e.code === 'invalid-argument')) {
            o = outbox().filter(x => !same(x, op)); setOutbox(o); SL.emit('opfailed', { op, e });
          } else { SL.cloud.error = e && e.code || 'network'; break; }
        }
        status();
      }
    } catch (e) { SL.cloud.error = e && e.code || 'auth'; }
    flushing = false; status();
  };

  /* ---------- القراءة والاستماع ---------- */
  const snapMap = s => { const o = {}; s.forEach(d => o[d.id] = d.data()); return o; };
  const snapArr = s => { const a = []; s.forEach(d => a.push(Object.assign({ id: d.id }, d.data()))); return a; };
  const listen = (q, fn) => { unsubs.push(q.onSnapshot(s => { fn(s); saveCache(); notify(); }, e => { SL.cloud.error = e.code; SL.emit('status'); console.warn('listen', e.code); })); };
  const stop = () => { unsubs.forEach(u => { try { u(); } catch (e) {} }); unsubs = []; listening = false; };

  SL.rangeFrom = () => {
    const now = new Date(), cur = SL.cycleOf(now);
    const a = SL.cycleRange(cur - 1).from, b = SL.dkey(SL.addDays(SL.weekStart(now), -7));
    return a < b ? a : b;
  };

  SL.startListening = async function () {
    if (!cloudOn || listening || !navigator.onLine || !SL.me) return;
    try { await SL.ensureAuth(); } catch (e) { return; }
    listening = true;
    const me = SL.me, isStaff = me.role === 'admin' || me.role === 'super';
    const today = SL.dkey();
    listen(db.collection('settings').doc('app'), s => { SL.cache.settings = s.exists ? s.data() : {}; });
    listen(db.collection('announcements').orderBy('ts', 'desc').limit(30), s => { SL.cache.ann = snapArr(s); });
    listen(db.collection('wird').orderBy('date', 'desc').limit(5), s => { SL.cache.wird = snapArr(s); });
    listen(db.collection('days').where('date', '>=', SL.rangeFrom()), s => { SL.cache.daysAll = snapMap(s); });
    listen(db.collection('acts').where('date', '>=', SL.rangeFrom()), s => { SL.cache.actsAll = snapMap(s); });
    listen(db.collection('wirdDone').where('date', '>=', SL.rangeFrom()), s => { SL.cache.wirdAll = snapMap(s); SL.cache.wirdDone = snapArr(s).filter(d => d.date === SL.dkey()); });
    listen(db.collection('dhikr').orderBy('ts', 'desc').limit(100), s => { SL.cache.dhikr = snapArr(s); });
    if (isStaff) {
      listen(db.collection('users'), s => { SL.cache.users = snapArr(s); });
      listen(db.collection('messages').where('to', '==', 'staff'), s => { SL.cache.staffMsgs = snapArr(s); });
      if (me.role === 'super') listen(db.collection('staff'), s => { SL.cache.staff = snapArr(s); });
    } else if (me.sid) {
      listen(db.collection('messages').where('to', 'in', [me.sid, 'all']), s => { SL.cache.msgs = snapArr(s); });
    }
  };
  SL.stopListening = stop;

  /** دمج سجلات الطالب القادمة من السحابة مع المحلية (الأقدم وقتاً يفوز لكل صلاة) */
  SL.pullMine = async function () {
    if (!cloudOn || !navigator.onLine || !SL.me || !SL.me.sid) return;
    try {
      await SL.ensureAuth();
      const s = await withTimeout(db.collection('days').where('sid', '==', SL.me.sid).get(), 20000);
      const mine = SL.load('days', {});
      s.forEach(d => {
        const r = d.data(); const loc = mine[r.date] || (mine[r.date] = {});
        for (const pid in (r.p || {})) if (!loc[pid] || r.p[pid].ts < loc[pid].ts) loc[pid] = r.p[pid];
      });
      SL.save('days', mine);
      const w = await withTimeout(db.collection('wirdDone').where('sid', '==', SL.me.sid).get(), 20000);
      const wd = SL.load('wirdDone', {}); w.forEach(d => { const r = d.data(); if (!wd[r.date]) wd[r.date] = r.ts; }); SL.save('wirdDone', wd);
      const ac = await withTimeout(db.collection('acts').where('sid', '==', SL.me.sid).get(), 20000);
      const loc = SL.load('acts', {});
      ac.forEach(d => { const r = d.data(), l = loc[r.date] || (loc[r.date] = {}); for (const k in (r.z || {})) { const x = r.z[k], y = l[k]; if (!y || (x.n || 0) > (y.n || 0)) l[k] = x; } });
      SL.save('acts', loc);
      SL.emit('data');
    } catch (e) { console.warn('pullMine', e); }
  };

  SL.getOnce = async (q) => { await SL.ensureAuth(); return withTimeout(q.get(), 25000); };
  SL.fs = () => db;
  SL.snapArr = snapArr; SL.snapMap = snapMap;

  /* ---------- تشغيل ---------- */
  SL.cloudInit = function () {
    if (!cloudOn) { SL.emit('status'); return; }
    try {
      firebase.initializeApp(cfg); db = firebase.firestore(); auth = firebase.auth();
      try { db.settings({ ignoreUndefinedProperties: true }); } catch (e) {}
    } catch (e) { console.error(e); SL.cloud.enabled = false; return; }
    const go = () => { SL.cloud.online = true; SL.flush(); SL.startListening(); SL.pullMine(); SL.emit('status'); };
    window.addEventListener('online', go);
    window.addEventListener('offline', () => { SL.cloud.online = false; SL.emit('status'); });
    document.addEventListener('visibilitychange', () => { if (!document.hidden && navigator.onLine) { SL.flush(); SL.startListening(); } });
    setInterval(() => { if (navigator.onLine) SL.flush(); }, 30000);
    if (navigator.onLine) go();
    status();
  };
})(window.SL);

/* صلاتي — النواة: أدوات، تخزين محلي، مواقيت الصلاة، النقاط، الأصوات */
window.SL = window.SL || {};
(function (SL) {
  'use strict';

  /* ---------- أدوات عامة ---------- */
  const LS = 'salaty.';
  SL.load = (k, d) => { try { const v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } };
  SL.save = (k, v) => { try { localStorage.setItem(LS + k, JSON.stringify(v)); } catch (e) {} };
  SL.del = k => { try { localStorage.removeItem(LS + k); } catch (e) {} };

  const pad = n => String(n).padStart(2, '0');
  SL.pad = pad;
  SL.dkey = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  SL.fromKey = k => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
  SL.addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  SL.daysBetween = (a, b) => Math.round((Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) - Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / 864e5);
  SL.n = s => String(s).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  SL.esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  SL.uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  SL.latinDigits = s => String(s || '').replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));
  SL.normPhone = s => {
    let p = SL.latinDigits(s).replace(/\D/g, '');
    if (/^00201[0125]\d{8}$/.test(p)) p = '0' + p.slice(3);
    else if (/^201[0125]\d{8}$/.test(p)) p = '0' + p.slice(2);
    else if (/^1[0125]\d{8}$/.test(p)) p = '0' + p;
    return p;
  };
  SL.validPhone = p => /^01[0125]\d{8}$/.test(p) || (/^\d{10,15}$/.test(p) && !p.startsWith('01'));
  SL.normName = s => String(s || '').trim().replace(/\s+/g, ' ');
  SL.normCode = s => String(s || '').trim().replace(/\s+/g, ' ').toUpperCase();

  SL.fmtTime = (ms, withSec) => {
    const d = new Date(ms); let h = d.getHours(); const m = pad(d.getMinutes()); const ap = h >= 12 ? 'م' : 'ص';
    h = h % 12 || 12; return SL.n(`${h}:${m}${withSec ? ':' + pad(d.getSeconds()) : ''}`) + ' ' + ap;
  };
  SL.fmtDur = ms => {
    const s = Math.max(0, Math.floor(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), x = s % 60;
    return SL.n(`${pad(h)}:${pad(m)}:${pad(x)}`);
  };
  const MONTHS = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
  const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
  SL.monthName = i => MONTHS[i];
  SL.dayName = i => DAYS[i];
  SL.fmtDate = d => `${DAYS[d.getDay()]} ${SL.n(d.getDate())} ${MONTHS[d.getMonth()]} ${SL.n(d.getFullYear())}`;
  SL.fmtShort = k => { const d = SL.fromKey(k); return SL.n(`${d.getDate()}/${d.getMonth() + 1}`); };

  /* ---------- تشفير ---------- */
  const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  SL.sha256 = async s => hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
  SL.hashPin = async (pin, phone) => {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey('raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode('salaty:' + phone), iterations: 100000, hash: 'SHA-256' }, key, 256);
    return hex(bits);
  };
  SL.sidOf = async phone => (await SL.sha256('sid:' + phone)).slice(0, 16);

  /* ---------- الصلوات ---------- */
  SL.PRAYERS = [
    { id: 'fajr', name: 'الفجر', icon: '🌅' },
    { id: 'dhuhr', name: 'الظهر', icon: '☀️' },
    { id: 'asr', name: 'العصر', icon: '🌤️' },
    { id: 'maghrib', name: 'المغرب', icon: '🌇' },
    { id: 'isha', name: 'العشاء', icon: '🌙' }
  ];
  SL.prayerName = id => (SL.PRAYERS.find(p => p.id === id) || {}).name || id;

  SL.CITIES = [
    ['المنوفية (شبين الكوم)', 30.5588, 31.0095], ['القاهرة', 30.0444, 31.2357], ['الجيزة', 30.0131, 31.2089],
    ['الإسكندرية', 31.2001, 29.9187], ['الغربية (طنطا)', 30.7865, 31.0004], ['الدقهلية (المنصورة)', 31.0409, 31.3785],
    ['الشرقية (الزقازيق)', 30.5877, 31.5020], ['القليوبية (بنها)', 30.4660, 31.1848], ['كفر الشيخ', 31.1107, 30.9388],
    ['البحيرة (دمنهور)', 31.0341, 30.4682], ['دمياط', 31.4165, 31.8133], ['بورسعيد', 31.2653, 32.3019],
    ['الإسماعيلية', 30.5965, 32.2715], ['السويس', 29.9668, 32.5498], ['الفيوم', 29.3084, 30.8428],
    ['بني سويف', 29.0661, 31.0994], ['المنيا', 28.1099, 30.7503], ['أسيوط', 27.1809, 31.1837],
    ['سوهاج', 26.5591, 31.6948], ['قنا', 26.1551, 32.7160], ['الأقصر', 25.6872, 32.6396], ['أسوان', 24.0889, 32.8998],
    ['البحر الأحمر (الغردقة)', 27.2579, 33.8116], ['مطروح', 31.3543, 27.2373], ['شمال سيناء (العريش)', 31.1316, 33.7984],
    ['جنوب سيناء (شرم الشيخ)', 27.9158, 34.3300], ['الوادي الجديد (الخارجة)', 25.4390, 30.5586]
  ].map(([name, lat, lng], i) => ({ id: 'c' + i, name, lat, lng }));

  /* ---------- حساب المواقيت (طريقة الهيئة المصرية: فجر ١٩٫٥° وعشاء ١٧٫٥°) ---------- */
  const R = Math.PI / 180;
  const sin = d => Math.sin(d * R), cos = d => Math.cos(d * R), tan = d => Math.tan(d * R);
  const asin = x => Math.asin(x) / R, acos = x => Math.acos(x) / R, atan2 = (y, x) => Math.atan2(y, x) / R, arccot = x => Math.atan(1 / x) / R;
  const fixA = a => { a = a - 360 * Math.floor(a / 360); return a < 0 ? a + 360 : a; };
  const fixH = a => { a = a - 24 * Math.floor(a / 24); return a < 0 ? a + 24 : a; };
  const julian = (y, m, d) => { if (m <= 2) { y -= 1; m += 12; } const A = Math.floor(y / 100), B = 2 - A + Math.floor(A / 4); return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5; };
  const sunPos = jd => {
    const D = jd - 2451545.0, g = fixA(357.529 + 0.98560028 * D), q = fixA(280.459 + 0.98564736 * D);
    const L = fixA(q + 1.915 * sin(g) + 0.020 * sin(2 * g)), e = 23.439 - 0.00000036 * D;
    const RA = fixH(atan2(cos(e) * sin(L), cos(L)) / 15);
    return { decl: asin(sin(e) * sin(L)), eq: q / 15 - RA };
  };
  function computeTimes(date, lat, lng) {
    const jd = julian(date.getFullYear(), date.getMonth() + 1, date.getDate()) - lng / (15 * 24);
    const mid = t => fixH(12 - sunPos(jd + t).eq);
    const ang = (a, t, ccw) => {
      const d = sunPos(jd + t).decl;
      const x = (-sin(a) - sin(d) * sin(lat)) / (cos(d) * cos(lat));
      const T = acos(Math.max(-1, Math.min(1, x))) / 15;
      return mid(t) + (ccw ? -T : T);
    };
    const asr = (f, t) => { const d = sunPos(jd + t).decl; return ang(-arccot(f + tan(Math.abs(lat - d))), t); };
    const h = { fajr: ang(19.5, 5 / 24, true), sunrise: ang(0.833, 6 / 24, true), dhuhr: mid(12 / 24), asr: asr(1, 13 / 24), maghrib: ang(0.833, 18 / 24, false), isha: ang(17.5, 18 / 24, false) };
    const base = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
    const out = {};
    for (const k in h) out[k] = Math.round(base + (h[k] - lng / 15) * 3600000);
    return out;
  }

  SL.settings = Object.assign({ theme: 'light', mute: false, cityId: 'c0', lat: null, lng: null, offsets: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, big: false }, SL.load('settings', {}));
  SL.saveSettings = () => SL.save('settings', SL.settings);
  SL.location = () => {
    const s = SL.settings;
    if (s.cityId === 'gps' && s.lat != null) return { name: 'موقعي الحالي', lat: s.lat, lng: s.lng };
    return SL.CITIES.find(c => c.id === s.cityId) || SL.CITIES[0];
  };
  SL.timesFor = date => {
    const loc = SL.location(); const t = computeTimes(date, loc.lat, loc.lng);
    for (const p of SL.PRAYERS) t[p.id] += (SL.settings.offsets[p.id] || 0) * 60000;
    return t;
  };

  /** حالة كل صلاة الآن: upcoming | open | closed | done */
  SL.prayerStates = (now, doneToday) => {
    const t = SL.timesFor(new Date(now)); const W = (window.APP_CFG.windowMin || 90) * 60000;
    return SL.PRAYERS.map(p => {
      const at = t[p.id], end = at + W, rec = doneToday && doneToday[p.id];
      let st = rec ? 'done' : now < at ? 'upcoming' : now <= end ? 'open' : 'closed';
      return { ...p, at, end, st, rec };
    });
  };
  /** الصلاة القادمة (قد تكون فجر الغد) */
  SL.nextPrayer = now => {
    const d = new Date(now); const t = SL.timesFor(d);
    for (const p of SL.PRAYERS) if (t[p.id] > now) return { ...p, at: t[p.id] };
    const t2 = SL.timesFor(SL.addDays(d, 1)); return { ...SL.PRAYERS[0], at: t2.fajr, tomorrow: true };
  };
  SL.currentOpen = (now) => SL.prayerStates(now, null).find(p => p.st === 'open');

  /* ---------- النقاط ولوحة الشرف ---------- */
  SL.speedBonus = m => m <= 10 ? 5 : m <= 20 ? 4 : m <= 35 ? 3 : m <= 50 ? 2 : m <= 70 ? 1 : 0;
  SL.recPoints = r => 10 + SL.speedBonus(Math.max(0, r.delay || 0)) + (r.where === 'mosque' ? 3 : 0);
  /** يجمع مستندات الأيام إلى ترتيب طلاب. docs: {id: {sid,name,date,p}} */
  SL.aggregate = (docs, fromKey, toKey) => {
    const m = {};
    for (const id in docs) {
      const d = docs[id]; if (!d || !d.date || d.date < fromKey || d.date > toKey) continue;
      const s = m[d.sid] || (m[d.sid] = { sid: d.sid, name: d.name, pts: 0, cnt: 0, mosque: 0, delaySum: 0, first: Infinity });
      s.name = d.name || s.name;
      for (const pid in (d.p || {})) {
        const r = d.p[pid]; if (!r) continue;
        s.pts += SL.recPoints(r); s.cnt++; s.delaySum += Math.max(0, r.delay || 0);
        if (r.where === 'mosque') s.mosque++;
        if (r.ts < s.first) s.first = r.ts;
      }
    }
    return Object.values(m).sort((a, b) => b.pts - a.pts || b.cnt - a.cnt || a.first - b.first);
  };
  /* نقاط باقي الأنشطة: التسبيح/الأذكار/الأدعية/الورد */
  SL.WIRD_PTS = 10;
  SL.actPts = (key, e) => {
    if (!e) return 0; const g = e.g || 1, n = e.n || 0, k = key.charAt(0);
    if (k === 't') return e.done ? 8 : Math.floor(8 * Math.min(1, n / g));
    if (k === 'a') return e.done ? 6 : Math.floor(6 * Math.min(1, n / g));
    if (k === 'u') return Math.min(n, 5);
    return 0;
  };
  /** ترتيب شامل: الصلاة + التسبيح + الأذكار + الأدعية + الورد */
  SL.aggregateAll = (days, acts, wirds, from, to) => {
    const m = {}; SL.aggregate(days, from, to).forEach(s => { m[s.sid] = Object.assign({ dh: 0, ad: 0, du: 0, wd: 0 }, s); });
    const mk = (sid, name) => m[sid] || (m[sid] = { sid, name, pts: 0, cnt: 0, mosque: 0, delaySum: 0, first: Infinity, dh: 0, ad: 0, du: 0, wd: 0 });
    for (const id in acts) {
      const d = acts[id]; if (!d || !d.date || d.date < from || d.date > to) continue; const s = mk(d.sid, d.name);
      for (const k in (d.z || {})) { const e = d.z[k]; s.pts += SL.actPts(k, e); if (k[0] === 't' && e.done) s.dh++; if (k[0] === 'a' && e.done) s.ad++; if (k[0] === 'u') s.du += e.n || 0; }
    }
    for (const id in wirds) { const d = wirds[id]; if (!d || !d.date || d.date < from || d.date > to) continue; const s = mk(d.sid, d.name); s.wd++; s.pts += SL.WIRD_PTS; }
    return Object.values(m).sort((a, b) => b.pts - a.pts || b.cnt - a.cnt || a.first - b.first);
  };
  const EPOCH = new Date(2024, 0, 1);
  SL.cycleOf = d => Math.floor(SL.daysBetween(EPOCH, d) / 10);
  SL.cycleRange = i => ({ from: SL.dkey(SL.addDays(EPOCH, i * 10)), to: SL.dkey(SL.addDays(EPOCH, i * 10 + 9)) });
  SL.weekStart = d => SL.addDays(d, -((d.getDay() + 1) % 7)); // الأسبوع يبدأ السبت
  SL.fajrHero = (docs, dateKey) => {
    let best = null;
    for (const id in docs) {
      const d = docs[id]; if (!d || d.date !== dateKey || !d.p || !d.p.fajr) continue;
      if (!best || d.p.fajr.ts < best.ts) best = { name: d.name, sid: d.sid, ts: d.p.fajr.ts, where: d.p.fajr.where };
    }
    return best;
  };

  /* ---------- الأصوات (Web Audio — بدون ملفات) ---------- */
  let ctx = null;
  const ac = () => { try { ctx = ctx || new (window.AudioContext || window.webkitAudioContext)(); if (ctx.state === 'suspended') ctx.resume(); } catch (e) {} return ctx; };
  const tone = (f, t0, dur, type = 'triangle', vol = 0.18) => {
    const c = ac(); if (!c) return; const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.value = f; o.connect(g); g.connect(c.destination);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol, t0 + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.start(t0); o.stop(t0 + dur + 0.05);
  };
  const applause = (t0, dur, vol = 0.22) => {
    const c = ac(); if (!c) return;
    const len = Math.floor(c.sampleRate * dur), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) {
      const x = i / len, clap = Math.random() < 0.012 ? 1 : 0.18;
      d[i] = (Math.random() * 2 - 1) * clap * Math.min(1, x * 12) * (1 - x * 0.85);
    }
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1800; f.Q.value = 0.6;
    const g = c.createGain(); g.gain.value = vol; s.connect(f); f.connect(g); g.connect(c.destination); s.start(t0);
  };
  let arVoice = null;
  const pickVoice = () => { try { arVoice = (speechSynthesis.getVoices() || []).find(v => /^ar/i.test(v.lang)) || null; } catch (e) {} };
  try { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; } catch (e) {}
  SL.sound = {
    play(kind) {
      if (SL.settings.mute) return; const c = ac(); if (!c) return; const t = c.currentTime + 0.02;
      if (kind === 'tap') { tone(660, t, 0.08, 'sine', 0.08); return; }
      if (kind === 'tick') { tone(880, t, 0.05, 'sine', 0.06); return; }
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => tone(f, t + i * 0.09, 0.45, 'triangle', 0.16));
      tone(1318.5, t + 0.4, 0.6, 'sine', 0.08);
      applause(t + 0.1, kind === 'wird' ? 1.3 : 1.7);
      setTimeout(() => {
        try { if (arVoice && !SL.settings.mute) { const u = new SpeechSynthesisUtterance(kind === 'wird' ? 'ما شاء الله' : 'أحسنت'); u.voice = arVoice; u.lang = arVoice.lang; u.volume = 0.9; speechSynthesis.cancel(); speechSynthesis.speak(u); } } catch (e) {}
      }, 450);
    },
    unlock() { ac(); }
  };

  /* ---------- أحداث بسيطة ---------- */
  const H = {};
  SL.on = (e, f) => (H[e] = H[e] || []).push(f);
  SL.emit = (e, a) => (H[e] || []).forEach(f => { try { f(a); } catch (x) { console.error(x); } });
})(window.SL);

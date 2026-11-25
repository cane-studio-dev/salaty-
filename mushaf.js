/* صلاتي — المصحف الشريف الموحّد + الورد المرتبط بالقراءة (٦٠٤ صفحة) */
(function (SL) {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const E = SL.esc, N = SL.n, ui = SL.ui;
  const Q = SL.quran = {};
  const cs = () => SL.cache.settings || {};

  /* ---------- تحميل بيانات المصحف (مرة واحدة ثم تُخزَّن للأوفلاين) ---------- */
  let loading = null;
  Q.ready = () => !!window.QURAN;
  Q.load = () => loading || (loading = new Promise((res, rej) => {
    if (window.QURAN) return res(window.QURAN);
    const s = document.createElement('script'); s.src = 'quran.js';
    s.onload = () => res(window.QURAN); s.onerror = () => { loading = null; rej(new Error('quran')); }; document.head.appendChild(s);
  }));
  const bs = (arr, x) => { let lo = 0, hi = arr.length - 1, r = 0; while (lo <= hi) { const m = (lo + hi) >> 1; if (arr[m] <= x) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
  Q.surahOf = aid => bs(window.QURAN.sf, aid) + 1;
  Q.ayahNo = aid => aid - window.QURAN.sf[Q.surahOf(aid) - 1] + 1;
  Q.pageOf = aid => bs(window.QURAN.pg, aid) + 1;
  Q.pageSpan = p => [window.QURAN.pg[p - 1], (window.QURAN.pg[p] || 6237) - 1];
  Q.juzOf = p => bs(window.QURAN.jz, window.QURAN.pg[p - 1]) + 1;
  Q.sName = s => window.QURAN.n[s - 1];
  Q.aid = (s, a) => window.QURAN.sf[s - 1] + a - 1;
  Q.describe = (fa, la) => {
    const s1 = Q.surahOf(fa), s2 = Q.surahOf(la), a1 = Q.ayahNo(fa), a2 = Q.ayahNo(la), p1 = Q.pageOf(fa), p2 = Q.pageOf(la), np = p2 - p1 + 1;
    const where = s1 === s2 ? `سورة ${Q.sName(s1)} — من الآية ${N(a1)} إلى الآية ${N(a2)}` : `من سورة ${Q.sName(s1)} (آية ${N(a1)}) إلى سورة ${Q.sName(s2)} (آية ${N(a2)})`;
    return { s1, s2, a1, a2, p1, p2, np, text: `${where}\nالصفحات ${N(p1)}–${N(p2)} (${N(np)} ${np === 1 ? 'صفحة' : np === 2 ? 'صفحتان' : np < 11 ? 'صفحات' : 'صفحة'})` };
  };

  /* ---------- الموضع وتقدّم الورد ---------- */
  const getPos = () => SL.load('mpos', null);
  const wirdToday = () => (SL.cache.wird || []).find(w => w.date === SL.dkey()) || null;
  const wdMap = () => SL.demo ? SL._wd : SL.load('wirdDone', {});
  const wprog = () => { const p = SL.load('wprog', null); return p && p.date === SL.dkey() ? p : { date: SL.dkey(), max: 0 }; };
  const savePos = (aid, page) => {
    const s = Q.surahOf(aid), pos = { aid, page, s, sn: Q.sName(s), ay: Q.ayahNo(aid), ts: Date.now() };
    SL.save('mpos', pos); if (SL.actSet && !SL.demo) SL.actSet('mp', { n: 0, aid, page, sn: pos.sn, ay: pos.ay, ts: pos.ts, title: 'آخر موضع' }); return pos;
  };
  const remaining = tw => { const r = tw.range, mx = Math.max(wprog().max, r.p1 - 1); return Math.max(0, r.p2 - Math.min(mx, r.p2)); };
  const posLine = p => `سورة ${E(p.sn)} — آية ${N(p.ay)} — صفحة ${N(p.page)}`;

  /* ---------- التلاوة الصوتية (آية بآية — تحتاج إنترنت) ---------- */
  const RECITERS = [['Alafasy_128kbps', 'مشاري العفاسي'], ['Abdul_Basit_Murattal_192kbps', 'عبد الباسط عبد الصمد (مرتل)'], ['Husary_128kbps', 'محمود خليل الحصري'], ['Minshawy_Murattal_128kbps', 'محمد صديق المنشاوي (مرتل)'], ['Abdurrahmaan_As-Sudais_192kbps', 'عبد الرحمن السديس'], ['Saood_ash-Shuraym_128kbps', 'سعود الشريم'], ['Maher_AlMuAyqali_128kbps', 'ماهر المعيقلي'], ['Ghamadi_40kbps', 'سعد الغامدي'], ['Hudhaify_128kbps', 'علي الحذيفي'], ['Abu_Bakr_Ash-Shaatree_128kbps', 'أبو بكر الشاطري'], ['Muhammad_Ayyoub_128kbps', 'محمد أيوب']];
  const rec = () => { const r = SL.load('mrec', RECITERS[0][0]); return RECITERS.some(x => x[0] === r) ? r : RECITERS[0][0]; };
  const p3 = n => String(n).padStart(3, '0');
  let au = null, playA = 0;
  const markPlay = () => { $$('.ay.play').forEach(x => x.classList.remove('play')); const t = $(`.ay[data-a="${playA}"]`); if (t) { t.classList.add('play'); t.scrollIntoView({ block: 'center', behavior: 'smooth' }); } };
  const stopAudio = () => { if (au) { au.onended = au.onerror = null; au.pause(); au.removeAttribute('src'); au = null; } playA = 0; $$('.ay.play').forEach(x => x.classList.remove('play')); const b = $('#mPlay'); if (b) b.textContent = '▶'; };
  const playAyah = a => {
    if (!R || a > 6236) return stopAudio();
    const pg = Q.pageOf(a); if (pg !== R.page) { R.auto = true; go(pg); R.auto = false; }
    playA = a; markPlay(); R.tapped = a; paintBars();
    if (!au) { au = new Audio(); au.preload = 'auto'; au.onended = () => playAyah(playA + 1); au.onerror = () => { ui.toast('تعذّر تشغيل الصوت — التلاوة تحتاج اتصالاً بالإنترنت'); stopAudio(); }; }
    au.src = `https://everyayah.com/data/${rec()}/${p3(Q.surahOf(a))}${p3(Q.ayahNo(a))}.mp3`;
    const pr = au.play(); if (pr && pr.catch) pr.catch(() => { ui.toast('تعذّر تشغيل التلاوة — تأكد من اتصال الإنترنت'); stopAudio(); });
    $('#mPlay').textContent = '⏸'; try { new Audio().src = `https://everyayah.com/data/${rec()}/${p3(Q.surahOf(Math.min(6236, a + 1)))}${p3(Q.ayahNo(Math.min(6236, a + 1)))}.mp3`; } catch (e) {}
  };
  const togglePlay = () => { if (au && !au.paused) { au.pause(); $('#mPlay').textContent = '▶'; return; } if (au && au.src && playA) { au.play().catch(() => {}); $('#mPlay').textContent = '⏸'; return; } playAyah(R.tapped || R.cur); };
  const pickRec = () => { ui.sheet(`<h2 style="margin:0 0 10px">🎙️ اختر القارئ</h2><div class="hint" style="margin-bottom:10px">التلاوة تُبثّ من الإنترنت آية بآية.</div>${RECITERS.map(r => `<button class="ixr" data-r="${r[0]}"><span class="grow">${r[1]}</span>${rec() === r[0] ? '<b>✓</b>' : ''}</button>`).join('')}`); $$('[data-r]', $('#overlay')).forEach(b => b.onclick = () => { SL.save('mrec', b.dataset.r); const was = playA; ui.close(); if (was) playAyah(was); else ui.toast('تم اختيار القارئ ✓'); }); };

  /* ---------- القارئ ---------- */
  let R = null;
  const fs = () => Math.max(18, Math.min(40, +SL.load('mfs', 26) || 26));
  const pageHTML = p => {
    const [a0, a1] = Q.pageSpan(p), t = window.QURAN.t, rg = R.range; let h = '', lastS = 0;
    for (let a = a0; a <= a1; a++) {
      const s = Q.surahOf(a), i = Q.ayahNo(a);
      if (i === 1) { h += `<div class="mban"><span>سورة ${E(Q.sName(s))}</span></div>`; if (s !== 1 && s !== 9) h += '<div class="mbsm">بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ</div>'; }
      lastS = s; const inR = rg && a >= rg.fa && a <= rg.la;
      h += `<span class="ay${inR ? ' in' : ''}${rg && a === rg.fa ? ' st' : ''}${rg && a === rg.la ? ' en' : ''}" data-a="${a}">${rg && a === rg.fa ? '<b class="tag">بداية الورد ◂</b>' : ''}${t[a - 1]}<i class="no">۝${N(i)}</i>${rg && a === rg.la ? '<b class="tag">▸ نهاية الورد</b>' : ''}</span> `;
    }
    return h;
  };
  const curAyah = () => {
    const body = $('#mBody'); if (!body) return R.cur;
    const top = body.getBoundingClientRect().top + 90; const els = $$('.ay', body);
    for (const e of els) { if (e.getBoundingClientRect().bottom > top) return +e.dataset.a; }
    return R.cur;
  };
  const paintBars = () => {
    const a = R.tapped || R.cur, s = Q.surahOf(a), p = R.page, rg = R.range, tw = wirdToday(), done = !!wdMap()[SL.dkey()];
    $('#mWhere').innerHTML = `سورة <b>${E(Q.sName(s))}</b> — آية <b>${N(Q.ayahNo(a))}</b> — صفحة <b>${N(p)}</b>`;
    $('#mSub').textContent = `الجزء ${N(Q.juzOf(p))}` + (rg ? ` · ورد اليوم: صفحة ${N(Math.min(Math.max(p - rg.p1 + 1, 0), rg.p2 - rg.p1 + 1))} من ${N(rg.p2 - rg.p1 + 1)}` : '');
    const pct = rg ? Math.max(0, Math.min(100, (p - rg.p1 + 1) / (rg.p2 - rg.p1 + 1) * 100)) : p / 604 * 100; $('#mProg').style.width = pct + '%';
    const f = $('#mFoot'); if (!rg) { f.innerHTML = `<span class="muted small">تصفّح المصحف — الصفحة ${N(p)} من ٦٠٤</span>`; return; }
    if (done) f.innerHTML = '<span class="badge ok">✓ أتممت ورد اليوم</span>';
    else if (p >= rg.p2) f.innerHTML = '<button class="btn block" id="mDone">أتممت قراءة الورد اليومي ✅</button>';
    else f.innerHTML = `<span class="small">متبقي ${N(rg.p2 - p)} ${rg.p2 - p === 1 ? 'صفحة' : rg.p2 - p === 2 ? 'صفحتان' : 'صفحات'} على نهاية الورد</span>`;
    const d = $('#mDone'); if (d) d.onclick = complete;
    void tw;
  };
  const go = (p, keepScroll) => {
    if (!R.auto) stopAudio(); p = Math.max(1, Math.min(604, p)); R.page = p; R.tapped = null; const sp = Q.pageSpan(p), rf = R.range && R.range.fa >= sp[0] && R.range.fa <= sp[1] && p === R.range.p1 ? R.range.fa : 0; R.cur = rf || sp[0];
    $('#mPage').innerHTML = pageHTML(p); $('#mHead').innerHTML = `<span>${'سورة ' + E(Q.sName(Q.surahOf(Q.pageSpan(p)[0])))}</span><span>الجزء ${N(Q.juzOf(p))}</span>`;
    $('#mNum').textContent = N(p); if (!keepScroll) $('#mBody').scrollTop = 0; if (rf) { const t = $(`.ay[data-a="${rf}"]`); if (t) t.scrollIntoView({ block: 'start' }); }
    if (R.range && p >= R.range.p1) { const w = wprog(); if (p > w.max) SL.save('wprog', { date: SL.dkey(), max: Math.min(p, R.range.p2) }); }
    savePos(R.cur, p); paintBars();
  };
  const complete = () => {
    const btn = $('#mDone'), rg = R.range; if (!rg) return;
    SL.doWirdDone(btn); savePos(rg.la, rg.p2);
    if (SL.actSet && !SL.demo) { const e = SL.actGet().q || { n: 0 }, add = rg.p2 - rg.p1 + 1; if (!e.cnt) SL.actSet('q', { n: Math.min(604, (e.n || 0) + add), g: Math.max(1, +cs().quranGoal || 5), ts: Date.now(), done: e.done || (Math.min(604, (e.n || 0) + add) >= Math.max(1, +cs().quranGoal || 5) ? Date.now() : 0), title: 'القرآن', cnt: 1 }); }
    ui.toast('تقبّل الله منك، أتممت ورد اليوم 🤍'); paintBars();
  };
  const index = () => {
    const Qd = window.QURAN; ui.sheet(`<h2 style="margin:0 0 10px">فهرس المصحف</h2>
      <div class="seg"><button data-ix="s" class="on">السور</button><button data-ix="j">الأجزاء</button><button data-ix="p">صفحة</button></div>
      <div id="ixBody" style="margin-top:12px"></div>`);
    const body = $('#ixBody', $('#overlay')), jump = p => { ui.close(); go(p); };
    const show = k => {
      $$('[data-ix]', $('#overlay')).forEach(b => b.classList.toggle('on', b.dataset.ix === k));
      if (k === 's') { body.innerHTML = `<input type="text" id="ixQ" placeholder="ابحث عن سورة…" style="margin-bottom:8px"><div class="ixl" id="ixL" style="max-height:52vh;overflow:auto"></div>`;
        const draw = q => { $('#ixL').innerHTML = Qd.n.map((n, i) => ({ n, i })).filter(x => !q || x.n.includes(q) || String(x.i + 1) === SL.latinDigits(q)).map(x => `<button class="ixr" data-p="${Q.pageOf(Qd.sf[x.i])}"><b class="num">${N(x.i + 1)}</b><span class="grow">${E(x.n)}</span><span class="muted small">${N(Qd.c[x.i])} آية · ص ${N(Q.pageOf(Qd.sf[x.i]))}</span></button>`).join('') || '<div class="empty">لا نتائج</div>'; };
        draw(''); $('#ixQ').oninput = e => draw(e.target.value.trim()); }
      else if (k === 'j') body.innerHTML = `<div class="ixg">${Qd.jz.map((a, i) => `<button class="ixr" data-p="${Q.pageOf(a)}" style="flex-direction:column"><b>الجزء ${N(i + 1)}</b><span class="muted small">ص ${N(Q.pageOf(a))}</span></button>`).join('')}</div>`;
      else body.innerHTML = `<div class="row"><input type="number" id="ixN" min="1" max="604" placeholder="رقم الصفحة (١–٦٠٤)" inputmode="numeric" class="grow"><button class="btn" id="ixGo">اذهب</button></div>`;
      $$('[data-p]', body).forEach(b => b.onclick = () => jump(+b.dataset.p));
      const g = $('#ixGo'); if (g) { g.onclick = () => { const n = parseInt(SL.latinDigits($('#ixN').value)); if (n >= 1 && n <= 604) jump(n); else ui.toast('اكتب رقماً من ١ إلى ٦٠٤'); }; $('#ixN').focus(); }
    };
    $$('[data-ix]', $('#overlay')).forEach(b => b.onclick = () => show(b.dataset.ix)); show('s');
  };
  const close = () => {
    if (!R) return; stopAudio(); try { savePos(R.tapped || curAyah(), R.page); } catch (e) {}
    $('#mushaf') && $('#mushaf').remove(); document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; R = null; SL.render(true);
  };
  const onKey = e => { if (!R) return; if (e.key === 'ArrowLeft') go(R.page + 1); else if (e.key === 'ArrowRight') go(R.page - 1); else if (e.key === 'Escape' && !$('#overlay.on')) close(); };
  Q.open = async (opts = {}) => {
    ui.toast('جارٍ فتح المصحف…', 1500);
    try { await Q.load(); } catch (e) { return ui.toast('تعذّر تحميل المصحف — اتصل بالإنترنت مرة واحدة ثم يعمل بدون نت'); }
    const tw = wirdToday(), range = opts.wird && tw && tw.range ? tw.range : null;
    R = { range, page: 1, cur: 1, tapped: null };
    let page = opts.page; if (!page && opts.aid) page = Q.pageOf(opts.aid);
    if (!page && range) { const w = wprog(); page = w.max >= range.p1 ? Math.min(w.max, range.p2) : range.p1; }
    if (!page) page = (getPos() || {}).page || 1;
    const el = document.createElement('div'); el.id = 'mushaf';
    el.innerHTML = `<div class="mtop"><button class="mx" id="mClose" aria-label="إغلاق">✕</button><div class="grow"><div id="mWhere" class="mwh"></div><div id="mSub" class="muted small"></div></div><button class="mx" id="mIdx" aria-label="فهرس">☰</button></div>
      <div class="mpr"><i id="mProg"></i></div>
      <div id="mBody"><div class="mframe"><div class="mhead" id="mHead"></div><div class="mtext" id="mPage"></div><div class="mnum"><span id="mNum"></span></div></div></div>
      <div class="mbar"><button class="mx" id="mPrev" aria-label="الصفحة السابقة">›</button><div class="grow center" id="mFoot"></div><button class="mx" id="mNext" aria-label="الصفحة التالية">‹</button></div>
      <div class="mfz"><button class="mx" id="mPlay" aria-label="تشغيل التلاوة">▶</button><button class="mx" id="mRec" aria-label="القارئ">🎙️</button><button class="mx" id="mFp">أ+</button><button class="mx" id="mFm">أ−</button></div>`;
    document.body.appendChild(el); document.body.style.overflow = 'hidden'; document.documentElement.style.setProperty('--mfs', fs() + 'px');
    $('#mClose').onclick = close; $('#mIdx').onclick = index; $('#mPrev').onclick = () => go(R.page - 1); $('#mNext').onclick = () => go(R.page + 1);
    const fz = d => { SL.save('mfs', Math.max(18, Math.min(40, fs() + d))); document.documentElement.style.setProperty('--mfs', fs() + 'px'); };
    $('#mPlay').onclick = togglePlay; $('#mRec').onclick = pickRec;
    $('#mFp').onclick = () => fz(2); $('#mFm').onclick = () => fz(-2);
    const body = $('#mBody'); let tx = 0, ty = 0, st = 0;
    body.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; st = Date.now(); }, { passive: true });
    body.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; if (Math.abs(dx) > 70 && Math.abs(dy) < 45 && Date.now() - st < 700) go(R.page + (dx > 0 ? 1 : -1)); }, { passive: true });
    let sT; body.addEventListener('scroll', () => { clearTimeout(sT); sT = setTimeout(() => { if (!R || R.tapped) return; R.cur = curAyah(); paintBars(); }, 120); }, { passive: true });
    body.addEventListener('click', e => { const a = e.target.closest('.ay'); if (!a || !R) return; R.tapped = +a.dataset.a; $$('.ay.sel', body).forEach(x => x.classList.remove('sel')); a.classList.add('sel'); savePos(R.tapped, R.page); paintBars(); });
    document.addEventListener('keydown', onKey);
    go(page);
    if (opts.aid) { const t = $(`.ay[data-a="${opts.aid}"]`); if (t) { t.scrollIntoView({ block: 'center' }); t.classList.add('sel'); R.tapped = opts.aid; paintBars(); } }
  };

  /* ---------- كروت الطالب ---------- */
  SL.act.mOpenWird = () => Q.open({ wird: true });
  SL.act.mOpenPos = () => { const p = getPos(); Q.open(p ? { aid: p.aid } : { page: 1 }); };
  SL.act.mBrowse = () => Q.open({ page: (getPos() || {}).page || 1 });
  SL.mushafBrowse = () => {
    const p = getPos();
    return `<div class="card" style="padding:14px"><div class="row" style="margin-bottom:8px"><h3 class="grow" style="margin:0">📖 المصحف الشريف</h3></div>
      ${p ? `<div class="small" style="margin-bottom:10px">آخر موضع: <b>${posLine(p)}</b></div>` : '<div class="small muted" style="margin-bottom:10px">اقرأ القرآن كاملاً (٦٠٤ صفحة) بالرسم العثماني، ويعمل بدون إنترنت.</div>'}
      <div class="row"><button class="btn grow" data-act="mOpenPos">${p ? 'متابعة القراءة' : 'ابدأ القراءة'}</button><button class="btn sec grow" data-act="mBrowse">تصفّح المصحف</button></div></div>`;
  };
  SL.mushafCard = () => {
    const tw = wirdToday(), done = !!wdMap()[SL.dkey()], p = getPos(); let h = '';
    if (tw && tw.range) {
      const rm = remaining(tw), tot = tw.range.p2 - tw.range.p1 + 1, pct = done ? 100 : Math.round((tot - rm) / tot * 100);
      h += `<div class="row" style="margin-bottom:6px"><h3 class="grow" style="margin:0">📖 ورد اليوم</h3>${done ? '<span class="badge ok">✓ مكتمل</span>' : `<span class="badge acc">متبقي ${N(rm)} ${rm === 1 ? 'صفحة' : rm === 2 ? 'صفحتان' : 'صفحات'}</span>`}</div>
        <div class="small muted" style="white-space:pre-line;margin-bottom:8px">${E(tw.text.split('\n').slice(0, 2).join('\n'))}</div><div class="bar"><i style="width:${pct}%"></i></div>
        ${done ? '' : `<button class="btn block" style="margin-top:10px" data-act="mOpenWird">${wprog().max >= tw.range.p1 ? 'تابع قراءة الورد' : 'ابدأ قراءة الورد اليومي'}</button>`}`;
    } else if (tw) h += `<div class="row"><h3 class="grow" style="margin:0">📖 ورد اليوم</h3>${done ? '<span class="badge ok">✓ مكتمل</span>' : '<span class="badge acc">متاح</span>'}</div><div class="small muted" style="margin:6px 0 0;white-space:pre-line">${E(String(tw.text).slice(0, 120))}</div><button class="btn sec block" style="margin-top:10px" data-act="goTab" data-t="wird">فتح الورد</button>`;
    else h += '<div class="row"><h3 class="grow" style="margin:0">📖 ورد اليوم</h3><span class="badge">لم يُنشر بعد</span></div>';
    h += `<div class="mc-pos">${p ? `<div class="small" style="margin:12px 0 8px">آخر موضع توقفت عنده: <b>${posLine(p)}</b></div>` : '<div class="small muted" style="margin:12px 0 8px">لم تبدأ القراءة في المصحف بعد.</div>'}<div class="row"><button class="btn ${p ? '' : 'sec'} grow" data-act="mOpenPos">${p ? 'متابعة القراءة' : 'ابدأ القراءة'}</button><button class="btn sec grow" data-act="mBrowse">تصفّح المصحف</button></div></div>`;
    return `<div class="card" style="padding:14px">${h}</div>`;
  };
  SL.act.goTab = el => { SL.tab = el.dataset.t; SL.render(true); window.scrollTo(0, 0); };

  /* ---------- لوحة الإدارة: نشر الورد بالصفحات أو السورة والآيات ---------- */
  SL.wMode = 'text';
  SL.wirdComposer = () => {
    const today = SL.dkey(), m = SL.wMode, seg = (k, t) => `<button data-act="wMode" data-k="${k}" class="${m === k ? 'on' : ''}">${t}</button>`;
    let body = '';
    if (m !== 'text' && !Q.ready()) { Q.load().then(() => { if (SL.tab === 'admin' && SL.aTab === 'wird') SL.render(true); }).catch(() => {}); body = '<div class="empty">جارٍ تحميل المصحف…</div>'; }
    else if (m === 'pages') body = `<div class="row"><label class="f grow">من صفحة<input type="number" id="wP1" min="1" max="604" value="1" inputmode="numeric" data-wp></label><label class="f grow">إلى صفحة<input type="number" id="wP2" min="1" max="604" value="2" inputmode="numeric" data-wp></label></div>`;
    else if (m === 'surah') body = `<label class="f">السورة<select id="wS" data-wp>${window.QURAN.n.map((n, i) => `<option value="${i + 1}">${i + 1}. ${E(n)}</option>`).join('')}</select></label><div class="row"><label class="f grow">من آية<input type="number" id="wA1" min="1" value="1" inputmode="numeric" data-wp></label><label class="f grow">إلى آية<input type="number" id="wA2" min="1" value="7" inputmode="numeric" data-wp></label></div>`;
    return `<div class="card"><h2>📖 نشر ورد يومي</h2><div class="col">
      <div class="seg">${seg('text', 'نص حر')}${seg('pages', 'بالصفحات')}${seg('surah', 'سورة وآيات')}</div>
      <label class="f">التاريخ<input type="date" id="wDate" value="${today}" min="${today}"></label>
      <label class="f">العنوان<input type="text" id="wTitle" placeholder="مثال: ورد اليوم" maxlength="80"></label>
      ${body}${m !== 'text' ? '<div class="duaitem" id="wPrev" style="white-space:pre-line;min-height:48px;font-size:16px"></div>' : ''}
      <label class="f">${m === 'text' ? 'نص الورد' : 'ملاحظة للطلاب (اختياري)'}<textarea id="wText" placeholder="${m === 'text' ? 'اكتب الورد: آيات، أذكار، صفحات من المصحف…' : 'مثال: بتدبّر وتركيز'}"></textarea></label>
      <button class="btn" data-act="wirdPub">نشر الورد</button></div></div>`;
  };
  SL.act.wMode = el => { SL.wMode = el.dataset.k; SL.render(true); };
  const wRange = () => {
    if (!Q.ready()) return null; const m = SL.wMode, g = id => parseInt(SL.latinDigits(($('#' + id) || {}).value)) || 0;
    if (m === 'pages') { let a = g('wP1'), b = g('wP2'); if (a < 1 || b > 604 || a > b) return { err: 'تأكد: الصفحات من ١ إلى ٦٠٤ وأن البداية قبل النهاية' }; return { fa: window.QURAN.pg[a - 1], la: (window.QURAN.pg[b] || 6237) - 1 }; }
    if (m === 'surah') { const s = g('wS'), a = g('wA1'), b = g('wA2'), c = window.QURAN.c[s - 1] || 0; if (!s || a < 1 || b > c || a > b) return { err: `سورة ${Q.sName(s)} فيها ${N(c)} آية — تأكد من النطاق` }; return { fa: Q.aid(s, a), la: Q.aid(s, b) }; }
    return null;
  };
  document.addEventListener('input', e => {
    if (!e.target.hasAttribute || !e.target.hasAttribute('data-wp')) return; const r = wRange(), p = $('#wPrev'); if (!p || !r) return;
    p.textContent = r.err || Q.describe(r.fa, r.la).text;
  });
  document.addEventListener('change', e => { if (e.target.id === 'wS') { const c = window.QURAN.c[+e.target.value - 1]; $('#wA1').value = 1; $('#wA2').value = Math.min(c, 10); $('#wA2').max = c; $('#wA1').max = c; } });
  SL.act.wirdPub = () => {
    const date = ($('#wDate') || {}).value || SL.dkey(), title = (($('#wTitle') || {}).value || '').trim() || 'ورد اليوم', note = (($('#wText') || {}).value || '').trim(), v = { date, title, by: SL.me.name, ts: Date.now() };
    if (SL.wMode === 'text') { if (!note) return ui.toast('اكتب نص الورد'); v.text = note; }
    else {
      const r = wRange(); if (!r) return ui.toast('اختر نطاق الورد'); if (r.err) return ui.toast(r.err);
      const d = Q.describe(r.fa, r.la); v.range = { fa: r.fa, la: r.la, p1: d.p1, p2: d.p2 }; v.text = d.text + (note ? '\n' + note : '');
    }
    SL.queue('wird', date, v, { merge: false });
    SL.cache.wird = (SL.cache.wird || []).filter(w => w.date !== date).concat([Object.assign({ id: date }, v)]);
    ui.toast('تم نشر الورد ✓ — ظهر لكل الطلاب'); SL.render(true);
  };
})(window.SL);

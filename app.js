/* صلاتي — الواجهة: الدخول، القفل، الصفحات الرئيسية للطالب */
(function (SL) {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const E = SL.esc, N = SL.n;
  const root = $('#root');
  const CFG = window.APP_CFG;
  SL.isStandalone = () => { try { return matchMedia('(display-mode: standalone)').matches || navigator.standalone === true; } catch (e) { return false; } };
  const isIOS = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

  SL.me = SL.load('me', null);
  SL.tab = SL.load('tab', 'home');
  SL.demo = false; SL._dd = {}; SL._wd = {};
  SL.pages = {}; SL.act = {};
  const isStaff = () => !!SL.me && !SL.demo && (SL.me.role === 'admin' || SL.me.role === 'super');
  const meEff = () => SL.demo ? { name: 'طالب تجريبي', sid: 'demo', role: 'student', phone: '0000' } : SL.me;
  SL.isStaff = isStaff; SL.meEff = meEff;
  const getDays = () => SL.demo ? SL._dd : SL.load('days', {});
  const putDays = d => { if (!SL.demo) SL.save('days', d); };
  const getWD = () => SL.demo ? SL._wd : SL.load('wirdDone', {});

  /* ---------- أدوات الواجهة ---------- */
  const ui = SL.ui = {};
  let toastT;
  ui.toast = (m, ms = 2800) => { const t = $('#toast'); t.textContent = m; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); };
  ui.sheet = (html, o = {}) => {
    const ov = $('#overlay'); ov.innerHTML = `<div class="sheet ${o.mid ? 'mid' : ''}" role="dialog">${o.mid ? '' : '<div class="grab"></div>'}${html}</div>`;
    ov.classList.add('on'); ov.onclick = e => { if (e.target === ov && !o.sticky) ui.close(); }; return $('.sheet', ov);
  };
  ui.close = () => { const ov = $('#overlay'); ov.classList.remove('on'); ov.innerHTML = ''; const f = SL._onClose; SL._onClose = null; if (f) f(); };
  ui.confirm = (msg, ok = 'تأكيد', danger = false) => new Promise(res => {
    ui.sheet(`<p style="font-size:17px;line-height:1.8;margin:6px 0 16px">${msg}</p><div class="row"><button class="btn ${danger ? 'bad' : ''} grow" id="cOk">${ok}</button><button class="btn sec grow" id="cNo">إلغاء</button></div>`, { mid: true, sticky: true });
    $('#cOk').onclick = () => { ui.close(); res(true); }; $('#cNo').onclick = () => { ui.close(); res(false); };
  });
  ui.sparkle = (el) => {
    const r = (el || document.body).getBoundingClientRect(); const em = ['✨', '🌟', '🤍', '🎉', '⭐'];
    for (let i = 0; i < 9; i++) { const s = document.createElement('div'); s.className = 'sparkle'; s.textContent = em[i % em.length]; s.style.left = (r.left + r.width / 2 + (Math.random() - .5) * 160) + 'px'; s.style.top = (r.top + r.height / 2 + (Math.random() - .5) * 30) + 'px'; s.style.animationDelay = (i * 60) + 'ms'; document.body.appendChild(s); setTimeout(() => s.remove(), 1700); }
  };
  ui.copy = async t => { try { await navigator.clipboard.writeText(t); ui.toast('تم النسخ ✓'); } catch (e) { ui.toast('تعذّر النسخ'); } };
  const v = s => ($(s) || {}).value || '';

  /* ---------- الثيمات ---------- */
  SL.THEMES = [
    { id: 'light', name: 'فاتح كلاسيكي', c: 'linear-gradient(135deg,#fff,#dfe9df)', tc: '#0f6b50' },
    { id: 'dark', name: 'داكن فخم', c: 'linear-gradient(135deg,#0a0a0c,#d9b25c)', tc: '#0a0a0c' },
    { id: 'winter', name: 'شتوي دافئ', c: 'linear-gradient(135deg,#f0e2cb,#8c4a2f)', tc: '#8c4a2f' },
    { id: 'dawn', name: 'الفجر الهادئ', c: 'linear-gradient(135deg,#8fa8ff,#c9a6f0,#ffd1e3)', tc: '#6f6fe0' },
    { id: 'emerald', name: 'المسجد الزمردي', c: 'linear-gradient(135deg,#0f6d50,#d9b660)', tc: '#06382a' },
    { id: 'night', name: 'قراءة ليلية', c: 'linear-gradient(135deg,#1a1612,#c9a46a)', tc: '#1a1612' }
  ];
  SL.applyTheme = () => {
    const t = SL.THEMES.find(x => x.id === SL.settings.theme) || SL.THEMES[0];
    document.documentElement.dataset.theme = t.id; document.body.classList.toggle('big', !!SL.settings.big);
    const m = $('#themeColor'); if (m) m.content = t.tc;
  };
  SL.act.themeNext = () => {
    const i = SL.THEMES.findIndex(x => x.id === SL.settings.theme); const t = SL.THEMES[(i + 1) % SL.THEMES.length];
    SL.settings.theme = t.id; SL.saveSettings(); SL.applyTheme(); ui.toast('🎨 ' + t.name); if (SL.tab === 'settings') render();
  };

  /* ---------- حالة المزامنة ---------- */
  const syncChip = () => {
    const c = SL.cloud;
    if (!c.enabled) return '<span class="chip">💾 محلي</span>';
    if (!navigator.onLine) return `<span class="chip warn">📴 بدون إنترنت${c.pending ? ' · ' + N(c.pending) + ' بانتظار' : ''}</span>`;
    if (c.pending) return `<span class="chip warn">⏳ ${N(c.pending)} بانتظار المزامنة</span>`;
    if (c.error === 'permission-denied') return '<span class="chip bad">⚠️ صلاحيات Firebase</span>';
    return '<span class="chip ok">☁️ متزامن</span>';
  };

  /* ---------- الغلاف ---------- */
  const NAV_STUDENT = [['home', '🏠', 'الرئيسية'], ['wird', '📖', 'الورد'], ['adhkar', '📿', 'الأذكار'], ['duas', '🤲', 'الأدعية'], ['honor', '🏆', 'الشرف'], ['messages', '💬', 'الرسائل'], ['settings', '⚙️', 'الإعدادات']];
  const NAV_STAFF = [['admin', '🛠️', 'الإدارة'], ['honor', '🏆', 'الشرف'], ['messages', '💬', 'الرسائل'], ['settings', '⚙️', 'الإعدادات']];
  const seenKey = () => isStaff() ? 'smsgSeen' : 'msgSeen';
  const unreadList = () => { const seen = SL.load(seenKey(), 0); return (isStaff() ? SL.cache.staffMsgs : SL.cache.msgs || []).filter(m => m.ts > seen); };
  const unreadCount = () => unreadList().length;
  const paintBadges = () => {
    const n = unreadCount(), h = $('header.top [data-t="messages"]'), nb = $('nav.bottom [data-t="messages"]');
    if (h) { const d = $('.dot', h); if (n) { if (d) d.textContent = N(n); else h.insertAdjacentHTML('beforeend', `<span class="dot">${N(n)}</span>`); } else if (d) d.remove(); }
    if (nb) { const d = $('.dot', nb); if (n) { if (d) d.textContent = N(n); else nb.insertAdjacentHTML('beforeend', `<span class="dot">${N(n)}</span>`); } else if (d) d.remove(); }
  };
  const notifyMsgs = () => {
    if (!SL.me || SL.demo) return; const un = unreadList(); if (!un.length) return; const newest = Math.max(...un.map(m => m.ts)), note = SL.load('msgNote', 0);
    if (newest > note) { SL.save('msgNote', newest); if (SL.tab !== 'messages') { ui.toast('📩 وصلتك رسالة جديدة — افتح «الرسائل»', 5000); try { SL.sound.play('wird'); } catch (e) {} if (navigator.vibrate) navigator.vibrate([80, 40, 80]); } }
  };
  const shell = () => {
    const staff = isStaff(), nav = staff ? NAV_STAFF : NAV_STUDENT;
    if (!nav.some(n => n[0] === SL.tab) && SL.tab !== 'messages' && !(SL.tab === 'videos' && !staff)) SL.tab = nav[0][0];
    const un = unreadCount();
    root.innerHTML = `
      ${SL.demo ? '<div class="preview-bar"><span>👁️ وضع المعاينة — هكذا يرى الطالب التطبيق</span><button class="btn sm sec" data-act="exitPreview">خروج</button></div>' : ''}
      <div id="app">
        <header class="top"><div class="brand"><img src="logo.svg" alt=""><span>صلاتي</span></div>
          <span id="chip">${syncChip()}</span>
          ${!SL.isStandalone() ? '<button class="iconbtn" data-act="install" title="تثبيت التطبيق">⬇️</button>' : ''}
          <button class="iconbtn" data-act="themeNext" title="تبديل المظهر">🎨</button>
          ${staff ? '' : `<button class="iconbtn" data-act="tab" data-t="messages" title="الرسائل">💬${un ? `<span class="dot">${N(un)}</span>` : ''}</button>`}
        </header>
        <main id="page"></main>
        <nav class="bottom"><div class="row">${nav.map(n => `<button data-act="tab" data-t="${n[0]}" class="${SL.tab === n[0] ? 'on' : ''}"><span class="i">${n[1]}</span>${n[2]}${n[0] === 'messages' && un ? `<span class="dot">${N(un)}</span>` : ''}</button>`).join('')}</div>
          <div class="sig"><span class="ar">فريق عمل مبادرة أشبال الفجر</span></div></nav>
      </div>`;
    render();
  };
  function render(noAnim) {
    const p = $('#page'); if (!p) return;
    const fn = SL.pages[SL.tab] || SL.pages.home;
    p.innerHTML = fn(); if (noAnim !== true) { p.style.animation = 'none'; void p.offsetWidth; p.style.animation = ''; }
    $$('nav.bottom button').forEach(b => b.classList.toggle('on', b.dataset.t === SL.tab));
    if (SL.afterRender) SL.afterRender(SL.tab);
  }
  SL.render = render; SL.shell = shell;
  SL.act.tab = el => { SL.tab = el.dataset.t; SL.save('tab', SL.tab); window.scrollTo(0, 0); if (SL.tab === 'messages') { SL.save(seenKey(), Date.now()); } render(); paintBadges(); };
  SL.act.install = async () => {
    const e = SL.installEvt;
    if (e) { e.prompt(); try { await e.userChoice; } catch (x) {} SL.installEvt = null; if (SL.me) shell(); return; }
    const steps = isIOS()
      ? ['افتح التطبيق من متصفح <b>Safari</b>', 'اضغط زر المشاركة <b>⬆️</b> أسفل الشاشة', 'اختر <b>«إضافة إلى الشاشة الرئيسية»</b>', 'اضغط <b>إضافة</b> — وسيظهر شعار صلاتي بين تطبيقاتك']
      : ['افتح التطبيق من متصفح <b>Chrome</b>', 'اضغط على قائمة المتصفح <b>⋮</b> أعلى الشاشة', 'اختر <b>«تثبيت التطبيق»</b> أو <b>«إضافة إلى الشاشة الرئيسية»</b>', 'اضغط <b>تثبيت</b> — وسيظهر شعار صلاتي بين تطبيقاتك'];
    ui.sheet(`<div class="center"><img src="logo.svg" alt="" style="width:72px;height:72px;border-radius:20px"><h2 style="margin:10px 0 4px">ثبّت صلاتي على هاتفك</h2><div class="muted small" style="margin-bottom:12px">يفتح كأي تطبيق ويعمل بدون إنترنت</div></div>
      <div class="col">${steps.map((t, i) => `<div class="msg"><b style="color:var(--accent)">${N(i + 1)}.</b> ${t}</div>`).join('')}</div><button class="btn sec block" style="margin-top:12px" data-act="closeSheet">تمام</button>`);
  };
  SL.act.closeSheet = () => ui.close();
  SL.act.installDismiss = () => { SL.save('installDismissed', Date.now()); render(true); };
  const installCard = () => {
    if (SL.isStandalone() || SL.demo) return '';
    if (Date.now() - SL.load('installDismissed', 0) < 7 * 864e5) return '';
    return `<div class="card row" style="gap:12px"><img src="logo.svg" alt="" style="width:46px;height:46px;border-radius:13px"><div class="grow"><div style="font-weight:700">ثبّت صلاتي على هاتفك</div><div class="small muted">يفتح كتطبيق ويعمل بدون إنترنت</div></div><button class="btn sm" data-act="install">تثبيت</button><button class="iconbtn" style="width:32px;height:32px;font-size:14px" data-act="installDismiss" aria-label="إغلاق">✕</button></div>`;
  };

  /* ---------- تذكرة الصلاة على النبي ﷺ عند كل فتح ---------- */
  const SALAWAT = [
    { t: 'اللهم صلِّ وسلِّم وبارك على نبينا محمد', s: 'قال ﷺ: «من صلّى عليَّ صلاةً صلّى الله عليه بها عشراً»' },
    { t: 'اللهم صلِّ على محمد وعلى آل محمد كما صلّيت على إبراهيم وعلى آل إبراهيم إنك حميدٌ مجيد', s: 'قال ﷺ: «أولى الناس بي يوم القيامة أكثرهم عليَّ صلاة»' },
    { t: 'إِنَّ اللَّهَ وَمَلَائِكَتَهُ يُصَلُّونَ عَلَى النَّبِيِّ ۚ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا', s: 'سورة الأحزاب — آية ٥٦' }
  ];
  SL.showSalawat = () => {
    if (!SL.me || SL.demo || $('#lock')) return;
    try { if (sessionStorage.getItem('salawat') === '1') return; sessionStorage.setItem('salawat', '1'); } catch (e) {}
    const r = SALAWAT[Math.floor(Math.random() * SALAWAT.length)]; let n = 0;
    ui.sheet(`<div class="dua"><div class="cat">تذكرة</div><div style="font-family:Amiri,serif;font-size:34px;font-weight:700;margin:2px 0 10px">صلِّ على محمد ﷺ</div><div class="tx" style="font-size:21px">${E(r.t)}</div><div class="small" style="opacity:.85;margin-top:10px;line-height:1.8">${E(r.s)}</div></div>
      <button class="btn block" id="slBtn" style="margin-top:14px">اللهم صلِّ وسلِّم عليه <span id="slN" class="num"></span></button><button class="btn sec block" id="slClose" style="margin-top:10px">متابعة</button>`, { mid: true });
    $('#slBtn').onclick = () => { n++; SL.sound.play('tick'); $('#slN').textContent = '· ' + N(n); if (navigator.vibrate) navigator.vibrate(20); };
    $('#slClose').onclick = ui.close;
  };


  /* ---------- الصفحة الرئيسية ---------- */
  const allDays = () => {
    const d = Object.assign({}, SL.cache.daysAll), me = SL.me;
    if (me && me.sid && !SL.demo && !isStaff()) {
      const mine = SL.load('days', {});
      for (const k in mine) { const id = `${me.sid}_${k}`; const cur = d[id] || { sid: me.sid, name: me.name, date: k, p: {} }; d[id] = Object.assign({}, cur, { p: Object.assign({}, cur.p, mine[k]) }); }
    }
    return d;
  };
  const cs = () => SL.cache.settings || {};
  const human = ms => { const m = Math.max(0, Math.round(ms / 60000)); const h = Math.floor(m / 60), r = m % 60; return h ? `${N(h)} ساعة${r ? ' و' + N(r) + ' دقيقة' : ''}` : `${N(r)} دقيقة`; };

  function weeklyWinner(docs) {
    const now = new Date(), ws = SL.weekStart(now), A = allActs(), W = allWird();
    const prev = SL.aggregateAll(docs, A, W, SL.dkey(SL.addDays(ws, -7)), SL.dkey(SL.addDays(ws, -1)));
    if (prev.length) return { w: prev[0], label: 'تهنئة الأسبوع الماضي' };
    const cur = SL.aggregateAll(docs, A, W, SL.dkey(ws), SL.dkey(now));
    if (cur.length) return { w: cur[0], label: 'متصدّر هذا الأسبوع حتى الآن' };
    return null;
  }
  function heroCards(docs, compact) {
    let h = ''; const S = cs(); const today = SL.dkey(), me = meEff();
    (SL.cache.ann || []).filter(a => a.kind === 'honor' && a.show !== false).slice(0, 3).forEach(a => {
      h += `<div class="card celebrate${compact ? ' cmp' : ''}"><div class="tt">${E(a.title || 'تكريم')}</div><div class="who">${E(a.text)}</div></div>`;
    });
    if (S.showWeekly !== false) {
      const w = S.weeklyOverride && S.weeklyOverride.name ? { w: { name: S.weeklyOverride.name, cnt: null }, label: 'تهنئة الأسبوع', msg: S.weeklyOverride.msg } : weeklyWinner(docs);
      if (w) h += `<div class="card celebrate${compact ? ' cmp' : ''}"><div class="tt">${E(w.label)}</div><div class="who">${E(w.w.name)}</div><div>${w.msg ? E(w.msg) : (w.w.cnt != null ? `حصد ${N(w.w.pts)} نقطة بين الصلاة والذكر والورد — بارك الله فيه وزاده حرصاً 🤍` : '')}</div></div>`;
    }
    if (S.showFajrHero !== false) {
      let hero = SL.fajrHero(docs, today), lab = 'بطل فجر اليوم';
      if (!hero) { hero = SL.fajrHero(docs, SL.dkey(SL.addDays(new Date(), -1))); lab = 'بطل فجر أمس'; }
      if (hero) h += `<div class="card hero-fajr${compact ? ' cmp' : ''}"><div class="e">🌅</div><div><div class="small" style="opacity:.85">${lab}</div><div style="font-family:Amiri,serif;font-size:24px;font-weight:700">${E(hero.name)}</div><div class="small" style="opacity:.9">أول من سجّل الفجر ${hero.where === 'mosque' ? 'في المسجد 🕌' : 'في البيت 🏠'} · ${SL.fmtTime(hero.ts)}</div></div></div>`;
    }
    return compact && h ? `<div class="cardrow">${h}</div>` : h;
  }
  const prayerRow = s => {
    let right = '';
    if (s.st === 'done') right = `<span class="badge ${s.rec.sus ? 'bad' : 'ok'}">${s.rec.sus ? '⚠️ مسجد — غير صادق' : '✓ ' + (s.rec.where === 'mosque' ? 'في المسجد 🕌' : 'في البيت 🏠')}</span><div class="tm">${SL.fmtTime(s.rec.ts)}${s.rec.delay != null ? ' · بعد ' + N(s.rec.delay) + ' د' : ''}</div>`;
    else if (s.st === 'open') right = `<button class="btn sm" data-act="pray" data-p="${s.id}">سجّلت صلاتي ✓</button><div class="tm">يُغلق بعد <b class="num" data-cd="win" data-at="${s.end}">${SL.fmtDur(s.end - Date.now())}</b></div>`;
    else if (s.st === 'upcoming') right = `<span class="badge">بعد <span class="num" data-cd="until" data-at="${s.at}">${SL.fmtDur(s.at - Date.now())}</span></span>`;
    else right = '<span class="badge bad">فاتت · أُغلق التسجيل</span>';
    return `<div class="prow ${s.st}" ${s.st === 'done' ? `data-act="dua" data-p="${s.id}" style="cursor:pointer"` : ''}><div class="ic">${s.icon}</div><div><div class="nm">${s.name}</div><div class="tm num">${SL.fmtTime(s.at)}</div></div><div class="go">${right}</div></div>`;
  };
  SL.pages.home = () => {
    const now = Date.now(), me = meEff(), days = getDays(), today = days[SL.dkey(new Date(now))] || {};
    const states = SL.prayerStates(now, today), next = SL.nextPrayer(now), open = states.find(s => s.st === 'open');
    const hr = new Date(now).getHours(), g = hr < 5 ? 'ليلة طيبة' : hr < 12 ? 'صباح الخير' : hr < 17 ? 'طاب يومك' : 'مساء الخير';
    const first = me.name.split(' ')[0], doneN = states.filter(s => s.st === 'done').length;
    const soon = next.at - now <= 25 * 60000;
    const wird = (SL.cache.wird || []).find(w => w.date === SL.dkey()), wdone = getWD()[SL.dkey()];
    const loc = SL.location();
    return `
      ${SL.aboutCard ? SL.aboutCard() : ''}<div class="card hero"><div class="big">${g} يا ${E(first)}، تقبّل الله طاعتك 🤍</div>
        <div class="sub">${SL.fmtDate(new Date(now))} · ${E(loc.name)}</div>
        <div class="countdown"><div><div class="small" style="opacity:.85">الصلاة القادمة</div><div style="font-weight:700;font-size:20px">${next.icon} ${next.name}${next.tomorrow ? ' (غداً)' : ''} <span class="small num" style="opacity:.8">${SL.fmtTime(next.at)}</span></div></div><div class="t num" data-cd="until" data-at="${next.at}">${SL.fmtDur(next.at - now)}</div></div>
        ${soon ? `<div class="wudu">🚿 اقترب موعد صلاة ${next.name} — تجهّز بالوضوء وتوجّه إلى المسجد 🕌</div>` : open ? `<div class="wudu">✨ حان وقت ${open.name} — صلِّ ثم سجّلها (التسجيل متاح حتى ${SL.fmtTime(open.end)})</div>` : `<div class="wudu">⏳ ${next.name} بعد ${human(next.at - now)} — لا تنسَ أذكارك 🌿</div>`}
        <div class="sub">أتممت اليوم <b>${N(doneN)}</b> من ٥ صلوات</div></div>
      ${installCard()}${heroCards(allDays(), true)}
      <div class="plist">${states.map(prayerRow).join('')}</div>
      ${SL.extrasHome ? SL.extrasHome() : ''}${SL.amalHome ? SL.amalHome() : ''}${SL.videosHome ? SL.videosHome() : ''}${SL.mushafCard ? SL.mushafCard() : ''}${dhikrBoard()}${sduaCards()}${quranCard()}
      <div class="card"><div class="row"><h3 class="grow">📖 ورد اليوم</h3>${wdone ? '<span class="badge ok">✓ أتممته</span>' : wird ? '<span class="badge acc">جديد</span>' : ''}</div>
        ${wird ? `<div class="muted small" style="margin-bottom:8px">${E(wird.title || '')}</div><button class="btn block ${wdone ? 'sec' : ''}" data-act="tab" data-t="wird">${wdone ? 'عرض الورد' : 'اقرأ الورد وسجّل إتمامه'}</button>` : '<div class="empty" style="padding:6px">لم تنشر الإدارة ورد اليوم بعد.</div>'}</div>
      ${(SL.cache.ann || []).filter(a => a.kind !== 'honor' && a.show !== false).slice(0, 8).map(a => { const k = POST_KINDS[a.kind] || POST_KINDS.announce, hd = a.kind === 'hadith'; return `<div class="card post-${a.kind || 'announce'}"><div class="row"><h3 class="grow">${k[0]} ${E(a.title || k[1])}</h3><span class="badge">${k[1]}</span></div><div style="${hd ? "font-family:'Amiri Quran','Amiri',serif;font-size:22px;line-height:2.1;text-align:center;padding:6px 4px" : 'line-height:1.9'};white-space:pre-wrap">${E(a.text)}</div>${a.src ? `<div class="small muted" style="margin-top:6px;text-align:center">${E(a.src)}</div>` : ''}${a.img ? `<img class="annimg" src="${a.img}" alt="" data-act="annZoom" data-i="${E(a.id)}">` : ''}<div class="small muted" style="margin-top:8px">${SL.fmtShort(SL.dkey(new Date(a.ts)))}</div></div>`; }).join('')}
      <div class="small muted center" style="padding:4px 12px;line-height:1.8">المواقيت محسوبة بطريقة الهيئة المصرية العامة للمساحة وهي تقريبية — يمكنك ضبط الدقائق من الإعدادات لتطابق مسجدك.<br>كل صلاة تُسجَّل بوقتها الحقيقي حتى لو كنت بدون إنترنت.</div>`;
  };

  /* تسجيل صلاة */
  SL.act.pray = el => {
    const pid = el.dataset.p, now = Date.now();
    const lastSeen = SL.load('lastSeen', 0);
    if (!SL.demo && now < lastSeen - 5 * 60000) { ui.toast('⚠️ ساعة هاتفك تبدو متأخرة. فعّل الضبط التلقائي للوقت ثم حاول مرة أخرى.', 5000); return; }
    const st = SL.prayerStates(now, getDays()[SL.dkey(new Date(now))] || {}).find(s => s.id === pid);
    if (!st || st.st !== 'open') { ui.toast('أُغلق تسجيل هذه الصلاة'); render(); return; }
    SL.sound.unlock();
    ui.sheet(`<h2 style="margin:0 0 4px;text-align:center">${st.icon} صلاة ${st.name}</h2><p class="muted center" style="margin:0 0 8px">أين صلّيتها؟ تقبّل الله منك</p><div class="small muted center" style="line-height:1.8;margin:0 0 14px">${E(SL.prayerVirtue ? SL.prayerVirtue(pid) : '')}</div>
      <div class="where"><button data-act="prayWhere" data-p="${pid}" data-w="mosque"><span>🕌</span>في المسجد</button><button data-act="prayWhere" data-p="${pid}" data-w="home"><span>🏠</span>في البيت</button></div>`, { mid: true });
  };
  SL.act.prayWhere = el => {
    const pid = el.dataset.p, where = el.dataset.w, now = Date.now(), dk = SL.dkey(new Date(now));
    const days = getDays(), today = days[dk] || (days[dk] = {});
    const st = SL.prayerStates(now, today).find(s => s.id === pid);
    if (!st || st.st !== 'open') { ui.close(); ui.toast('أُغلق تسجيل هذه الصلاة'); render(); return; }
    const rec = { ts: now, where, delay: Math.max(0, Math.round((now - st.at) / 60000)) };
    if (where === 'mosque' && rec.delay < 20) {
      if (!el.dataset.force) { ui.sheet(`<h2 style="margin:0 0 8px">⚠️ تنبيه</h2><p style="line-height:1.9;margin:0 0 14px">صلاة الجماعة في المسجد بتبدأ عند الإقامة، أي بعد الأذان بحوالي ٢٠ دقيقة، وأنت بتسجّل بعد <b>${N(rec.delay)}</b> دقيقة بس، فتسجيل «في المسجد» الآن غير صحيح غالباً. لو صليت في البيت سجّلها «في البيت». لو أكّدت المسجد هتتعلّم <b>غير صادق</b> وتظهر للإدارة.</p><div class="col"><button class="btn" data-act="prayWhere" data-p="${pid}" data-w="home">🏠 صليت في البيت</button><button class="btn bad" data-act="prayWhere" data-p="${pid}" data-w="mosque" data-force="1">أؤكد المسجد (غير صادق)</button></button></div>`, { mid: true }); return; }
      rec.sus = true; ui.toast('⚠️ سُجّلت «غير صادق» لأن الجماعة بتبدأ بعد الأذان بـ٢٠ دقيقة — والإدارة هتعرف', 5000);
    }
    today[pid] = rec; putDays(days);
    const me = meEff();
    if (!SL.demo) SL.queue('days', `${me.sid}_${dk}`, { sid: me.sid, name: me.name, date: dk, p: { [pid]: rec }, upd: now });
    SL.sound.play('prayer'); ui.close(); render(); ui.sparkle($('.prow.done'));
    setTimeout(() => openDua(pid), 350);
  };
  SL.act.dua = el => openDua(el.dataset.p);
  const POST_KINDS = { announce: ['📢', 'إعلان'], hadith: ['🌙', 'حديث'], story: ['📖', 'حكاية'], benefit: ['💡', 'فائدة'], photo: ['🖼️', 'صورة'] };
  SL.POST_KINDS = POST_KINDS;
  SL.act.annZoom = el => { const x = (SL.cache.ann || []).find(y => y.id === el.dataset.i); if (x && x.img) ui.sheet(`<img src="${x.img}" style="width:100%;border-radius:14px" alt="">`); };

  /* ---------- سجل الأنشطة: التسبيح، الأذكار، الأدعية ---------- */
  SL._acts = {};
  const actsLocal = () => SL.demo ? SL._acts : SL.load('acts', {});
  const saveActs = o => { if (SL.demo) { SL._acts = o; return; } const ks = Object.keys(o).sort().slice(-10), r = {}; ks.forEach(k => r[k] = o[k]); SL.save('acts', r); };
  SL.actGet = () => actsLocal()[SL.dkey()] || {};
  let pushT;
  const pushActs = () => {
    clearTimeout(pushT); const me = SL.me; if (SL.demo || !me || !me.sid || isStaff()) return;
    const k = SL.dkey(), z = actsLocal()[k] || {}; if (!Object.keys(z).length) return;
    SL.queueReplace('acts', `${me.sid}_${k}`, { sid: me.sid, name: me.name, date: k, z, upd: Date.now() });
  };
  SL.pushActs = pushActs;
  SL.actSet = (key, entry) => { const o = actsLocal(), k = SL.dkey(); (o[k] = o[k] || {})[key] = entry; saveActs(o); clearTimeout(pushT); pushT = setTimeout(pushActs, 1500); };
  SL.markDua = text => {
    const sig = String(text).slice(0, 48), e = SL.actGet().u || { n: 0, l: [], ts: 0, g: 0 };
    if (e.l.includes(sig)) return false; e.l = e.l.concat(sig).slice(-40); e.n = (e.n || 0) + 1; e.ts = Date.now(); SL.actSet('u', e); return true;
  };
  const recordSet = c => {
    const set = window.ADHKAR_DATA[SL.adTab], items = set.items, comp = items.filter((x, j) => (c[j] || 0) >= x.n).length, old = SL.actGet()['a_' + SL.adTab] || {};
    SL.actSet('a_' + SL.adTab, { n: comp, g: items.length, ts: Date.now(), done: comp === items.length ? (old.done || Date.now()) : 0, title: set.name });
  };
  const allActs = () => {
    const d = Object.assign({}, SL.cache.actsAll), me = SL.me;
    if (me && me.sid && !SL.demo && !isStaff()) { const mine = SL.load('acts', {}); for (const k in mine) { const id = `${me.sid}_${k}`; d[id] = { sid: me.sid, name: me.name, date: k, z: Object.assign({}, (d[id] || {}).z, mine[k]) }; } }
    return d;
  };
  const allWird = () => {
    const d = Object.assign({}, SL.cache.wirdAll), me = SL.me;
    if (me && me.sid && !SL.demo && !isStaff()) { const wd = SL.load('wirdDone', {}); for (const k in wd) d[`${me.sid}_${k}`] = { sid: me.sid, name: me.name, date: k, ts: wd[k] }; }
    return d;
  };

  SL.allDays = allDays; SL.allActs = allActs; SL.allWird = allWird;
  const DHIKR_DEFAULT = [
    { id: 'd1', title: 'سبحان الله وبحمده', g: 100, icon: '📿', v: '«كلمتان خفيفتان على اللسان، ثقيلتان في الميزان: سبحان الله وبحمده، سبحان الله العظيم» — متفق عليه' },
    { id: 'd2', title: 'أستغفر الله العظيم وأتوب إليه', g: 100, icon: '🤲', v: '«من لزم الاستغفار جعل الله له من كل همٍّ فرجاً ومن كل ضيقٍ مخرجاً» — رواه أبو داود' },
    { id: 'd3', title: 'اللهم صلِّ وسلِّم على نبينا محمد ﷺ', g: 100, icon: '💚', v: '«من صلى عليّ صلاة صلى الله عليه بها عشراً» — رواه مسلم' },
    { id: 'd4', title: 'لا إله إلا الله وحده لا شريك له', g: 100, icon: '✨', v: '«أفضل ما قلتُ أنا والنبيون من قبلي: لا إله إلا الله وحده لا شريك له» — رواه الترمذي' },
    { id: 'd5', title: 'لا حول ولا قوة إلا بالله', g: 100, icon: '🌿', v: '«لا حول ولا قوة إلا بالله كنز من كنوز الجنة» — متفق عليه' }
  ];
  SL.dhikrTasks = () => {
    const staff = (SL.cache.dhikr || []).filter(x => x.kind === 'dhikr' && x.show !== false && x.title).map(x => ({ id: x.id, title: x.title, text: x.text || '', g: Math.max(1, +x.target || 33), icon: '⭐', staff: true, v: x.virtue || '' }));
    return (cs().showDefaultDhikr === false ? [] : DHIKR_DEFAULT).concat(staff);
  };
  const dhikrRow = t => {
    const e = SL.actGet()['t_' + t.id] || {}, n = e.n || 0, done = !!e.done, p = Math.min(100, Math.round(n / t.g * 100));
    return `<div class="prow ${done ? 'done' : n ? 'prog' : ''}" data-act="dhikrOpen" data-id="${E(t.id)}" style="cursor:pointer"><div class="ic">${t.icon}</div><div class="grow"><div class="nm" style="font-size:15.5px;line-height:1.5">${E(t.title)}</div>${t.v ? `<div class="small muted" style="line-height:1.6">${E(t.v)}</div>` : ''}<div class="tm num">${N(Math.min(n, t.g))}/${N(t.g)}${t.staff ? ' · من الإدارة' : ''}</div><div class="bar"><i style="width:${p}%"></i></div></div><div class="go">${done ? `<span class="badge ok">✓ تم</span><div class="tm num">${SL.fmtTime(e.done)}</div>` : `<span class="badge acc">${n ? 'أكمل' : 'ابدأ'}</span>`}</div></div>`;
  };
  const dhikrBoard = (title = '📿 التسبيح والذكر') => {
    const ts = SL.dhikrTasks(); if (!ts.length) return '';
    const z = SL.actGet(), dn = ts.filter(t => (z['t_' + t.id] || {}).done).length;
    return `<div class="card" style="padding:14px"><div class="row" style="margin-bottom:10px"><h3 class="grow" style="margin:0">${title}</h3><span class="badge ${dn === ts.length ? 'ok' : ''}">${N(dn)}/${N(ts.length)}</span></div><div class="plist">${ts.map(dhikrRow).join('')}</div></div>`;
  };
  /* ---------- القرآن اليومي + أدعية الإدارة (زي الورد) ---------- */
  const quranCard = () => {
    const e = SL.actGet().q || {}, n = e.n || 0, g = Math.max(1, +cs().quranGoal || 5), done = n >= g, p = Math.min(100, Math.round(n / g * 100));
    return `<div class="card" style="padding:14px"><div class="row" style="margin-bottom:8px"><h3 class="grow" style="margin:0">📖 القرآن اليوم</h3><span class="badge ${done ? 'ok' : ''}">${done ? '✓ أتممت الهدف' : N(n) + '/' + N(g) + ' صفحة'}</span></div>
      <div class="bar"><i style="width:${p}%"></i></div>
      <div class="row" style="margin-top:10px"><button class="btn sec grow" data-act="qAdd" data-d="-1">−١</button><button class="btn grow" data-act="qAdd" data-d="1">+١ صفحة</button><button class="btn grow" data-act="qAdd" data-d="5">+٥</button></div></div>`;
  };
  SL.act.qAdd = el => {
    const e = SL.actGet().q || { n: 0 }, g = Math.max(1, +cs().quranGoal || 5), n = Math.max(0, Math.min(604, (e.n || 0) + (+el.dataset.d)));
    const was = (e.n || 0) >= g; SL.actSet('q', { n, g, ts: Date.now(), done: n >= g ? (e.done || Date.now()) : 0, title: 'القرآن' });
    if (!was && n >= g) { SL.sound.play('wird'); ui.toast('ما شاء الله، أتممت وردك من القرآن 🤍'); } else SL.sound.play('tick');
    render(true);
  };
  const sduaCards = () => {
    const z = SL.actGet(), items = (SL.cache.dhikr || []).filter(x => x.kind === 'dua' && x.show !== false && x.text).slice(0, 3); if (!items.length) return '';
    return items.map(x => { const e = z['d_' + x.id] || {}, done = !!e.done; return `<div class="card" style="padding:14px"><div class="row" style="margin-bottom:6px"><h3 class="grow" style="margin:0">🤲 ${E(x.title || 'دعاء من الإدارة')}</h3>${done ? `<span class="badge ok">✓ ${SL.fmtTime(e.done)}</span>` : ''}</div><div class="duaitem" style="margin:0 0 10px">${E(x.text)}</div>${done ? '' : `<button class="btn" data-act="sduaRead" data-id="${E(x.id)}">قرأته ✓</button>`}</div>`; }).join('');
  };
  SL.act.sduaRead = el => {
    const x = (SL.cache.dhikr || []).find(y => y.id === el.dataset.id); if (!x) return; const t = Date.now();
    SL.actSet('d_' + x.id, { n: 1, g: 1, ts: t, done: t, title: x.title || x.text.slice(0, 30) }); SL.markDua(x.text); SL.sound.play('wird'); ui.toast('تقبّل الله 🤍'); render(true);
  };
  SL.act.dhikrOpen = el => {
    const t = SL.dhikrTasks().find(x => x.id === el.dataset.id); if (!t) return; const key = 't_' + t.id; SL.sound.unlock();
    const cur = () => SL.actGet()[key] || { n: 0, g: t.g, ts: 0, done: 0, title: t.title };
    const paint = () => { const e = cur(); $('#tBtn').style.setProperty('--p', Math.min(100, e.n / t.g * 100) + '%'); $('#tN').textContent = N(e.n); $('#tSub').innerHTML = e.done ? `<span class="badge ok">✓ أتممت ${N(t.g)} — تقبّل الله</span>` : `المتبقي ${N(Math.max(0, t.g - e.n))}`; };
    ui.sheet(`<div class="center"><div style="font-size:30px">${t.icon}</div><h2 style="margin:4px 0 2px;font-size:19px;line-height:1.6">${E(t.title)}</h2>${t.text ? `<div class="duaitem" style="margin:8px 0;text-align:center">${E(t.text)}</div>` : ''}${t.v ? `<div class="small muted" style="line-height:1.8;margin:6px 0 4px">✨ ${E(t.v)}</div>` : ''}
      <button class="tbtn" id="tBtn" aria-label="عدّ"><b id="tN">٠</b><small>/ ${N(t.g)}</small></button><div class="muted small" id="tSub" style="min-height:26px"></div>
      <div class="row" style="margin-top:12px"><button class="btn sec grow" id="tReset">تصفير</button><button class="btn grow" id="tClose">تم</button></div></div>`);
    SL._onClose = () => render(true); paint();
    $('#tBtn').onclick = () => {
      const e = cur(); e.n++; e.g = t.g; e.title = t.title; e.ts = Date.now();
      if (!e.done && e.n >= t.g) { e.done = e.ts; SL.actSet(key, e); paint(); SL.sound.play('wird'); ui.sparkle($('#tBtn')); if (navigator.vibrate) navigator.vibrate([60, 40, 60]); }
      else { SL.actSet(key, e); paint(); SL.sound.play('tick'); if (navigator.vibrate) navigator.vibrate(12); }
    };
    $('#tReset').onclick = () => { SL.actSet(key, { n: 0, g: t.g, ts: Date.now(), done: 0, title: t.title }); paint(); };
    $('#tClose').onclick = () => { ui.close(); pushActs(); };
  };

  /* ---------- الأدعية ---------- */
  const hash = s => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
  const staffDuas = () => (SL.cache.dhikr || []).filter(x => x.kind === 'dua' && x.show !== false && x.text).map(x => x.text);
  const allCats = () => { const c = window.DUAS_DATA.slice(), s = staffDuas(); if (s.length) c.push({ id: 'staff', name: 'أدعية من الإدارة', icon: '⭐', items: s }); return c; };
  function duaPool(pid) {
    const cats = window.DUAS_DATA, extra = staffDuas().map(t => ({ t, cat: 'دعاء من الإدارة' }));
    if (pid === 'fajr') { const f = cats.find(c => c.id === 'fajr'); return f.items.map(t => ({ t, cat: 'دعاء الفجر — للأحلام والرزق والتوفيق' })).concat(extra); }
    return cats.filter(c => c.id !== 'fajr').flatMap(c => c.items.map(t => ({ t, cat: c.name }))).concat(extra);
  }
  function seeded(arr, seed) { const a = arr.slice(); let s = seed >>> 0 || 1; const rnd = () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
  function openDua(pid) {
    const key = pid === 'fajr' ? 'fajr' : 'other', me = meEff(), pool = seeded(duaPool(pid), hash(String(me.sid) + key)), st = SL.PRAYERS.find(p => p.id === pid);
    const ptr = SL.load('duaIdx', {}); let i = ptr[key] == null ? 0 : (ptr[key] + 1) % pool.length;
    const keep = () => { if (!SL.demo) { ptr[key] = i % pool.length; SL.save('duaIdx', ptr); } }; keep();
    const first = me.name.split(' ')[0];
    const draw = () => {
      const d = pool[i % pool.length]; SL.markDua(d.t);
      ui.sheet(`<div class="dua"><div class="ok">تقبّل الله منك صلاة ${st.name} يا ${E(first)} 🤍</div><div class="cat">${E(d.cat)}</div><div class="tx">${E(d.t)}</div></div>
        <div class="row" style="margin-top:14px"><button class="btn grow" id="dNext">دعاء آخر 🔄</button><button class="btn sec" id="dCopy">نسخ</button></div>
        <div class="row" style="margin-top:10px"><button class="btn sec grow" id="dLib">مكتبة الأدعية</button><button class="btn sec grow" id="dClose">إغلاق</button></div>`);
      $('#dNext').onclick = () => { i = (i + 1) % pool.length; keep(); SL.sound.play('tick'); draw(); }; $('#dCopy').onclick = () => ui.copy(d.t);
      $('#dClose').onclick = ui.close; $('#dLib').onclick = () => { ui.close(); SL.act.tab({ dataset: { t: 'duas' } }); };
    };
    draw();
  }
  SL.duaCat = 'all'; SL.duaQ = '';
  const duaList = () => {
    const cats = allCats(); let items = [];
    cats.forEach(c => { if (SL.duaCat === 'all' || SL.duaCat === c.id) c.items.forEach(t => items.push({ t, c: c.name })); });
    const q = SL.duaQ.trim(); if (q) items = items.filter(x => x.t.includes(q));
    if (!items.length) return '<div class="empty">لا نتائج</div>';
    return items.slice(0, 80).map((x, i) => `<div class="duaitem">${E(x.t)}<div class="row" style="margin-top:6px;font-family:Tajawal"><span class="small muted grow">${E(x.c)}</span><button class="btn sm" data-act="duaRead" data-i="${i}">قرأته ✓</button><button class="btn sm sec" data-act="copyDua" data-i="${i}">نسخ</button></div></div>`).join('') + (items.length > 80 ? `<div class="empty">يظهر أول ٨٠ دعاء — استخدم البحث أو الأقسام لتصفية أدق (${N(items.length)} دعاء)</div>` : '');
  };
  SL.pages.duas = () => {
    const total = allCats().reduce((a, c) => a + c.items.length, 0);
    return `<div class="card"><h2>🤲 مكتبة الأدعية</h2><div class="muted small" style="margin-bottom:10px">${N(total)} دعاء بدون إنترنت</div>
      <input type="text" id="duaQ" placeholder="ابحث في الأدعية…" value="${E(SL.duaQ)}">
      <div class="chips" style="margin-top:10px"><button data-act="duaCat" data-c="all" class="${SL.duaCat === 'all' ? 'on' : ''}">الكل</button>${allCats().map(c => `<button data-act="duaCat" data-c="${c.id}" class="${SL.duaCat === c.id ? 'on' : ''}">${c.icon} ${c.name.split('—')[0].trim()}</button>`).join('')}</div></div>
      <div class="col" id="duaList">${duaList()}</div>`;
  };
  SL.act.duaCat = el => { SL.duaCat = el.dataset.c; render(); };
  SL.act.duaRead = el => { const it = $$('#duaList .duaitem')[+el.dataset.i]; if (!it) return; const ok = SL.markDua(it.firstChild.textContent); el.textContent = '✓ قُرئ'; el.disabled = true; SL.sound.play('tick'); ui.toast(ok ? 'سُجّل في نشاطك اليوم ✓' : 'سبق أن سجّلته اليوم'); };
  SL.act.copyDua = el => { const items = $$('#duaList .duaitem'); const it = items[+el.dataset.i]; if (it) ui.copy(it.firstChild.textContent); };

  /* ---------- الأذكار ---------- */
  SL.adTab = 'sabah';
  const adGet = () => { const a = SL.load('adhkar', {}); const k = SL.dkey(); if (!a[k]) { for (const x in a) if (x !== k) delete a[x]; a[k] = {}; } return { a, k }; };
  SL.pages.adhkar = () => {
    const D = window.ADHKAR_DATA, { a, k } = adGet(), cur = D[SL.adTab], c = (a[k][SL.adTab] || {});
    return dhikrBoard('📿 تسبيح اليوم') + `<div class="card"><h2>📿 الأذكار</h2><div class="tabs">${Object.keys(D).map(t => `<button data-act="adTab" data-t="${t}" class="${SL.adTab === t ? 'on' : ''}">${D[t].icon} ${D[t].name}</button>`).join('')}</div>
      <div class="hint" style="margin-top:8px">اضغط على الذكر للعدّ. يُحفظ تقدّمك اليوم على هاتفك.</div></div>
      <div class="col">${cur.items.map((it, i) => { const n = c[i] || 0, p = Math.min(100, n / it.n * 100); return `<div class="dh ${n >= it.n ? 'done' : ''}" data-act="dh" data-i="${i}"><div class="tx">${E(it.t)}</div><div class="ct" style="--p:${p}%"><b class="num">${N(Math.min(n, it.n))}/${N(it.n)}</b></div></div>`; }).join('')}</div>
      <button class="btn sec" data-act="adReset">إعادة العدّ لهذا القسم</button>`;
  };
  SL.act.adTab = el => { SL.adTab = el.dataset.t; render(); };
  SL.act.dh = el => {
    const i = +el.dataset.i, it = window.ADHKAR_DATA[SL.adTab].items[i], { a, k } = adGet();
    const c = a[k][SL.adTab] || (a[k][SL.adTab] = {}); if ((c[i] || 0) >= it.n) return;
    c[i] = (c[i] || 0) + 1; SL.save('adhkar', a); recordSet(c); SL.sound.play('tick');
    const n = c[i], ct = $('.ct', el); ct.style.setProperty('--p', Math.min(100, n / it.n * 100) + '%'); $('b', ct).textContent = N(n + '/' + it.n);
    if (n >= it.n) { el.classList.add('done'); if (navigator.vibrate) navigator.vibrate(40); const all = window.ADHKAR_DATA[SL.adTab].items.every((x, j) => (c[j] || 0) >= x.n); if (all) { SL.sound.play('wird'); ui.sparkle(el); ui.toast('ما شاء الله، أتممت ' + window.ADHKAR_DATA[SL.adTab].name + ' 🤍'); } }
  };
  SL.act.adReset = () => { const { a, k } = adGet(); a[k][SL.adTab] = {}; SL.save('adhkar', a); recordSet({}); render(); };

  /* ---------- الورد ---------- */
  SL.pages.wird = () => {
    const today = SL.dkey(), wd = getWD(), list = (SL.cache.wird || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    const tw = list.find(w => w.date === today);
    let h = `<div class="card"><h2>📖 ورد اليوم</h2>`;
    if (tw) {
      const done = wd[today];
      h += `<div class="muted small" style="margin-bottom:8px">${E(tw.title || '')} · ${SL.fmtShort(tw.date)}${tw.by ? ' · من ' + E(tw.by) : ''}</div><div class="duaitem" style="white-space:pre-wrap">${E(tw.text)}</div>
        ${done ? `<div class="badge ok" style="margin-top:12px">✓ أتممت الورد ${SL.fmtTime(done)}</div>` : tw.range ? '<button class="btn block" style="margin-top:14px" data-act="mOpenWird">ابدأ قراءة الورد اليومي 📖</button><div class="hint" style="margin-top:8px">يُسجَّل الإتمام تلقائياً من داخل المصحف عند الوصول لنهاية الورد.</div>' : '<button class="btn block" style="margin-top:14px" data-act="wirdDone">أتممت الورد ✓</button>'}`;
    } else h += '<div class="empty">لم تنشر الإدارة ورد اليوم بعد. تابعنا لاحقاً 🌿</div>';
    h += '</div>' + (SL.mushafBrowse ? SL.mushafBrowse() : '');
    const older = list.filter(w => w.date !== today).slice(0, 4);
    if (older.length) h += `<div class="card"><h3>أوراد سابقة</h3><div class="col">${older.map(w => `<div class="msg"><div class="meta"><b>${E(w.title || 'ورد')}</b><span>${SL.fmtShort(w.date)} ${wd[w.date] ? '· ✓ أتممته' : ''}</span></div><div style="white-space:pre-wrap;font-family:Amiri,serif;font-size:18px;line-height:1.9">${E(w.text)}</div></div>`).join('')}</div></div>`;
    return h;
  };
  SL.doWirdDone = el => {
    const today = SL.dkey(), me = meEff(), now = Date.now(); SL.sound.unlock();
    if (SL.demo) SL._wd[today] = now; else { const wd = SL.load('wirdDone', {}); if (wd[today]) return; wd[today] = now; SL.save('wirdDone', wd); SL.queue('wirdDone', `${me.sid}_${today}`, { sid: me.sid, name: me.name, date: today, ts: now }); }
    SL.sound.play('wird'); if (el) ui.sparkle(el); render();
  };
  SL.act.wirdDone = el => SL.doWirdDone(el);

  /* ---------- لوحة الشرف ---------- */
  SL.honorPrev = false;
  SL.pages.honor = () => {
    const S = cs(), docs = allDays(), now = new Date(), cur = SL.cycleOf(now), idx = SL.honorPrev ? cur - 1 : cur, rng = SL.cycleRange(idx);
    const board = SL.aggregateAll(docs, allActs(), allWird(), rng.from, rng.to).slice(0, 5), me = meEff(), left = SL.daysBetween(now, SL.fromKey(SL.cycleRange(cur).to)) + 1;
    const medals = ['🥇', '🥈', '🥉', '4', '5'];
    let h = heroCards(docs);
    if (S.showBoard === false) return h + '<div class="card empty">لوحة الشرف مخفية مؤقتاً من الإدارة.</div>';
    h += `<div class="card"><div class="row"><h2 class="grow">🏆 لوحة الشرف</h2><span class="chip">${SL.honorPrev ? 'الدورة السابقة' : 'تتجدد بعد ' + N(left) + ' يوم'}</span></div>
      <div class="seg" style="margin:6px 0 12px"><button data-act="honorSw" data-p="0" class="${!SL.honorPrev ? 'on' : ''}">الدورة الحالية</button><button data-act="honorSw" data-p="1" class="${SL.honorPrev ? 'on' : ''}">الدورة السابقة</button></div>
      <div class="hint" style="margin-bottom:10px">من ${SL.fmtShort(rng.from)} إلى ${SL.fmtShort(rng.to)} · النقاط = الصلاة (التزام + سرعة + مسجد) + التسبيح + الأذكار + الأدعية + القرآن + الورد</div>
      ${board.length ? `<div class="podium">${board.map((b, i) => `<div class="hrow ${b.sid === me.sid ? 'me' : ''}"><div class="rk">${medals[i]}</div><div><div class="nm">${E(b.name)}${b.sid === me.sid ? ' (أنت)' : ''}</div><div class="small muted">${N(b.cnt)} صلاة · ${N(b.dh)} تسبيح · ${N(b.ad)} أذكار · ${N(b.du)} دعاء · ${N(b.qr)} صفحة قرآن · ${N(b.wd)} ورد</div></div><div class="pt num">${N(b.pts)}<div class="small muted" style="font-weight:400">نقطة</div></div></div>`).join('')}</div>` : '<div class="empty">لا توجد بيانات بعد في هذه الدورة. ابدأ بتسجيل صلواتك لتكون أول المتصدرين 🌟</div>'}</div>`;
    return h;
  };
  SL.act.honorSw = el => { SL.honorPrev = el.dataset.p === '1'; render(); };

  /* ---------- الرسائل ---------- */
  SL.pages.messages = () => {
    if (isStaff()) return SL.pages.staffMessages();
    const me = meEff(), msgs = (SL.cache.msgs || []).slice().sort((a, b) => b.ts - a.ts), sent = SL.load('sent', []);
    return `<div class="card"><h2>💬 رسالة إلى الإدارة</h2><div class="col"><textarea id="mText" placeholder="اكتب رسالتك للمدرس / الإدارة…" maxlength="600"></textarea><button class="btn" data-act="sendToStaff">إرسال</button></div>
      ${sent.length ? `<div class="hint" style="margin-top:8px">آخر ما أرسلت: ${E(sent[0].text.slice(0, 60))}${sent[0].text.length > 60 ? '…' : ''}</div>` : ''}</div>
      <div class="card"><h3>الرسائل الواردة</h3><div class="col">${msgs.length ? msgs.map(m => `<div class="msg"><div class="meta"><b>${E(m.fromName || 'الإدارة')}</b><span>${m.to === 'all' ? 'للجميع · ' : 'خاصة · '}${SL.fmtShort(SL.dkey(new Date(m.ts)))} ${SL.fmtTime(m.ts)}</span></div><div style="line-height:1.9;white-space:pre-wrap">${E(m.text)}</div></div>`).join('') : '<div class="empty">لا توجد رسائل.</div>'}</div></div>`;
  };
  SL.act.sendToStaff = el => {
    const t = v('#mText').trim(); if (!t) return ui.toast('اكتب رسالتك أولاً');
    if (SL.demo) { ui.toast('وضع المعاينة: لن تُرسل الرسالة'); return; }
    const me = SL.me, id = SL.uid(); SL.queue('messages', id, { from: me.sid, fromName: me.name, to: 'staff', text: t, ts: Date.now() }, { merge: false });
    const sent = SL.load('sent', []); sent.unshift({ id, text: t, ts: Date.now() }); SL.save('sent', sent.slice(0, 20));
    ui.toast('تم الإرسال — سيصل للإدارة عند توفر الاتصال ✓'); render();
  };

  /* ---------- الإعدادات ---------- */
  SL.pages.settings = () => {
    const s = SL.settings, me = meEff(), loc = SL.location();
    return `<div class="card"><div class="row"><div style="font-size:36px">${isStaff() ? (SL.me.role === 'super' ? '👑' : '🎓') : '🙂'}</div><div class="grow"><div style="font-weight:700;font-size:18px">${E(SL.me.role === 'super' ? 'الإدارة العليا' : me.name)}</div><div class="small muted">${isStaff() ? (SL.me.role === 'super' ? 'الإدارة العليا' : 'مدرس / مشرف') : 'طالب'} · <span class="num">${E(me.phone)}</span></div></div>${syncChip()}</div></div>
      <div class="card"><h3>🎨 المظهر</h3><div class="themes">${SL.THEMES.map(t => `<button data-act="setTheme" data-t="${t.id}" class="${s.theme === t.id ? 'on' : ''}"><i style="background:${t.c}"></i>${t.name}</button>`).join('')}</div>
        <div class="setrow" style="margin-top:8px"><span>تكبير الخط</span><label class="switch"><input type="checkbox" data-chg="big" ${s.big ? 'checked' : ''}><i></i></label></div>
        <div class="setrow"><span>الأصوات التشجيعية 🔊</span><label class="switch"><input type="checkbox" data-chg="sound" ${s.mute ? '' : 'checked'}><i></i></label></div>
        <div class="setrow"><span class="small muted">لو ما سمعتش صوت: ارفع صوت الوسائط في الهاتف ثم جرّب</span><button class="btn sm sec" data-act="soundTest">▶ تجربة الصوت</button></div></div>
      <div class="card"><h3>🕋 المواقيت</h3><label class="f">المدينة<select data-chg="city">${SL.CITIES.map(c => `<option value="${c.id}" ${s.cityId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}${s.cityId === 'gps' ? '<option value="gps" selected>موقعي الحالي (GPS)</option>' : ''}</select></label>
        <button class="btn sec block" style="margin-top:10px" data-act="gps">📍 استخدم موقعي الحالي</button>
        <div class="hint" style="margin:10px 0 6px">ضبط يدوي بالدقائق ليطابق مسجدك (من −١٠ إلى +١٠):</div>
        <div class="grid" style="display:grid;grid-template-columns:repeat(5,1fr);gap:6px">${SL.PRAYERS.map(p => `<label class="f small center">${p.name}<input type="number" min="-10" max="10" data-off="${p.id}" value="${s.offsets[p.id] || 0}" style="padding:8px 2px;text-align:center"></label>`).join('')}</div>
        <div class="hint" style="margin-top:8px">الموقع الحالي: ${E(loc.name)}</div></div>
      <div class="card"><h3>📲 التطبيق</h3><div class="col">
        ${SL.installEvt ? '<button class="btn" data-act="install">تثبيت التطبيق على هاتفي ⬇️</button>' : '<div class="hint">لتثبيت التطبيق: من متصفح Chrome اختر «تثبيت التطبيق»، ومن Safari على الآيفون: زر المشاركة ثم «إضافة إلى الشاشة الرئيسية».</div>'}
        <div class="hint">آخر مزامنة: ${SL.cloud.lastSync ? SL.fmtTime(SL.cloud.lastSync) + ' · ' + SL.fmtShort(SL.dkey(new Date(SL.cloud.lastSync))) : 'لم تتم بعد'}${SL.cloud.enabled ? '' : ' (السحابة غير مفعّلة — راجع ملف config.js)'}</div>
        <button class="btn sec" data-act="syncNow">🔄 مزامنة الآن</button>
        ${SL.me.role === 'super' && !SL.demo ? '<button class="btn sec" data-act="preview">👁️ معاينة كطالب</button>' : ''}
        ${SL.demo ? '' : '<button class="btn bad" data-act="logout">تسجيل الخروج</button>'}</div></div>`;
  };
  SL.act.setTheme = el => { SL.settings.theme = el.dataset.t; SL.saveSettings(); SL.applyTheme(); render(); };
  SL.act.gps = () => {
    if (!navigator.geolocation) return ui.toast('الموقع غير مدعوم على جهازك');
    ui.toast('جارٍ تحديد موقعك…');
    navigator.geolocation.getCurrentPosition(p => { SL.settings.cityId = 'gps'; SL.settings.lat = p.coords.latitude; SL.settings.lng = p.coords.longitude; SL.saveSettings(); ui.toast('تم تحديد موقعك ✓'); render(); }, () => ui.toast('تعذّر تحديد الموقع — اختر مدينتك من القائمة'), { timeout: 12000 });
  };
  SL.act.syncNow = async () => { ui.toast('جارٍ المزامنة…'); await SL.flush(); SL.startListening(); SL.pullMine(); setTimeout(() => ui.toast(SL.cloud.pending ? 'ما زال هناك عناصر بانتظار الاتصال' : 'تمت المزامنة ✓'), 1200); };
  SL.act.logout = async () => {
    const pend = SL.load('outbox', []).length;
    if (!await ui.confirm(`هل تريد تسجيل الخروج؟${pend ? `<br><b style="color:var(--bad)">يوجد ${N(pend)} عنصر لم تتم مزامنته وسيضيع!</b>` : ''}`, 'خروج', true)) return;
    ['me', 'days', 'wirdDone', 'outbox', 'cache', 'sent', 'msgSeen', 'adhkar', 'lastSeen', 'acts', 'duaIdx'].forEach(SL.del); sessionStorage.clear(); location.reload();
  };
  SL.act.preview = () => { SL.demo = true; SL._dd = {}; SL._wd = {}; SL.tab = 'home'; SL.stopListening(); shell(); window.scrollTo(0, 0); };
  SL.act.soundTest = () => { SL.settings.mute = false; SL.saveSettings(); SL.sound.test(); ui.toast('🔊 لو سمعت التصفيق فالصوت شغال'); };
  SL.act.exitPreview = () => { SL.demo = false; SL.tab = 'admin'; shell(); SL.startListening(); };

  document.addEventListener('change', e => {
    const t = e.target, k = t.dataset && t.dataset.chg;
    if (t.dataset && t.dataset.off) { SL.settings.offsets[t.dataset.off] = Math.max(-10, Math.min(10, parseInt(t.value) || 0)); SL.saveSettings(); return; }
    if (!k) return;
    if (k === 'big') { SL.settings.big = t.checked; SL.saveSettings(); SL.applyTheme(); }
    if (k === 'sound') { SL.settings.mute = !t.checked; SL.saveSettings(); if (t.checked) SL.sound.play('tap'); }
    if (k === 'city') { SL.settings.cityId = t.value; SL.saveSettings(); ui.toast('تم تحديث المدينة والمواقيت ✓'); }
  });
  document.addEventListener('input', e => { if (e.target.id === 'duaQ') { SL.duaQ = e.target.value; $('#duaList').innerHTML = duaList(); } });

  /* ---------- الدخول والتسجيل ---------- */
  SL.authMode = 'new'; SL.staffReg = false;
  function authView() {
    const login = SL.authMode === 'login', st = SL.staffReg;
    root.innerHTML = `<div class="auth">
      <div class="logo"><img src="logo.svg" alt=""><h1>صلاتي</h1><p>رفيقك في الصلاة والأذكار والورد</p></div>
      <div class="seg"><button data-act="authMode" data-m="new" class="${!login ? 'on' : ''}">حساب جديد</button><button data-act="authMode" data-m="login" class="${login ? 'on' : ''}">تسجيل دخول</button></div>
      <div class="card col">
        ${!login || st ? `<label class="f">الاسم الكامل<input type="text" id="aName" placeholder="مثال: محمد أحمد علي" autocomplete="name"></label>` : ''}
        <label class="f">رقم التليفون<input type="tel" id="aPhone" placeholder="01xxxxxxxxx" inputmode="numeric" autocomplete="tel" value="${E(SL.load('lastPhone', ''))}"></label>
        ${!login ? `<label class="check"><input type="checkbox" id="aWallet"><span>رقمي عليه محفظة إلكترونية (اختياري — للجوائز المستقبلية)</span></label>
          <label class="f">المدينة<select id="aCity">${SL.CITIES.map(c => `<option value="${c.id}" ${SL.settings.cityId === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}</select></label>` : ''}
        <label class="f">رمز القفل السري (PIN) ${st ? '— اختياري' : ''}<input type="password" id="aPin" inputmode="numeric" maxlength="4" placeholder="٤ أرقام" autocomplete="off"></label>
        ${!login ? `<label class="f">أعد كتابة الرمز<input type="password" id="aPin2" inputmode="numeric" maxlength="4" placeholder="٤ أرقام" autocomplete="off"></label>
          <div class="hint">هذا الرمز يمنع أي شخص آخر من فتح التطبيق على هاتفك والعبث بحسابك.</div>` : ''}
        <label class="check"><input type="checkbox" id="aShow"><span>إظهار الرمز</span></label>
        <label class="check"><input type="checkbox" id="aStaff" ${st ? 'checked' : ''}><span>أنا مدرس / مشرف</span></label>
        ${st ? '<label class="f">رمز الإشراف<input type="password" id="aCode" placeholder="رمز الإشراف" autocomplete="off"></label>' : ''}
        <button class="btn block" id="aGo" data-act="${login && !st ? 'doLogin' : 'doRegister'}">${login ? 'دخول' : 'إنشاء الحساب'}</button>
        <div class="hint center">${SL.cloud.enabled ? '' : '⚠️ السحابة غير مفعّلة — التطبيق يعمل محلياً حتى تضيف إعدادات Firebase.'}</div>
      </div>
      ${SL.isStandalone() ? '' : '<button class="btn sec" data-act="install">📲 ثبّت التطبيق على هاتفك</button>'}</div>`;
  }
  SL.act.authMode = el => { SL.authMode = el.dataset.m; authView(); };
  document.addEventListener('change', e => { if (e.target.id === 'aShow') { ['#aPin', '#aPin2'].forEach(s => { const i = $(s); if (i) i.type = e.target.checked ? 'text' : 'password'; }); return; }
  if (e.target.id === 'aStaff') { SL.staffReg = e.target.checked; const keep = { n: v('#aName'), p: v('#aPhone') }; authView(); if ($('#aName')) $('#aName').value = keep.n; $('#aPhone').value = keep.p; } });

  const why = e => {
    const c = String((e && (e.code || e.message)) || e || '');
    if (/operation-not-allowed|admin-restricted/.test(c)) return 'فعّل الدخول المجهول: Firebase ← Authentication ← Sign-in method ← Anonymous ← Enable';
    if (/api-key/.test(c)) return 'مفتاح API في config.js غير صحيح — انسخه من Firebase بالنسخ واللصق';
    if (/unauthorized-domain/.test(c)) return 'أضف cane-studio-dev.github.io في Firebase ← Authentication ← Settings ← Authorized domains';
    if (/permission-denied|not-found/.test(c)) return 'تأكد أنك أنشأت Firestore Database ونشرت القواعد (Rules) ثم Publish';
    if (/network|timeout|unavailable/.test(c)) return 'تعذّر الاتصال بـ Firebase — تأكد من الإنترنت ومن إنشاء Firestore';
    return 'خطأ غير متوقع: ' + c;
  };
  const enter = () => { sessionStorage.setItem('unlocked', '1'); SL.save('me', SL.me); SL.tab = isStaff() ? 'admin' : 'home'; SL.save('lastPhone', SL.me.phone); SL.shell(); SL.startListening(); setTimeout(SL.showSalawat, 700); SL.pullMine(); SL.flush(); };
  async function staffAuth(name, phone, code, pin, cityId) {
    if (!SL.cloud.enabled) throw 'حساب الإدارة يتطلب ربط التطبيق بـ Firebase أولاً (راجع ملف README).';
    if (!navigator.onLine) throw 'تسجيل الإدارة يحتاج اتصالاً بالإنترنت.';
    if (!code) throw 'أدخل رمز الإشراف.';
    const isSuper = name.trim().toUpperCase() === CFG.adminName, role = isSuper ? 'super' : 'admin';
    const proof = await SL.sha256(code), u = await SL.ensureAuth();
    try { await SL.fs().collection('staff').doc(u.uid).set({ name, phone, role, proof, ts: Date.now() }); }
    catch (e) { throw e && e.code === 'permission-denied' ? 'رمز الإشراف غير صحيح، أو لم تُنشر القواعد (Rules) بعد.' : why(e); }
    return { role, name, phone, sid: await SL.sidOf(phone), cityId, pinHash: pin ? await SL.hashPin(pin, phone) : null, createdAt: Date.now() };
  }
  SL.act.doRegister = async el => {
    const login = SL.authMode === 'login', st = SL.staffReg;
    const name = SL.normName(v('#aName')), phone = SL.normPhone(v('#aPhone')), pin = SL.latinDigits(v('#aPin')).trim(), pin2 = SL.latinDigits(v('#aPin2')).trim();
    const code = SL.normCode(v('#aCode')), wallet = !!($('#aWallet') || {}).checked, cityId = v('#aCity') || SL.settings.cityId;
    const bad = m => ui.toast(m, 8000);
    if (name.length < 3) return bad('اكتب اسمك الكامل');
    if (!st && name.split(' ').length < 2) return bad('اكتب الاسم الكامل (اسمين على الأقل)');
    if (!SL.validPhone(phone)) return bad('رقم التليفون غير صحيح — اكتبه بالشكل 01xxxxxxxxx');
    if (!st && !/^\d{4}$/.test(pin)) return bad('الرمز السري لازم يكون ٤ أرقام');
    if (st && pin && !/^\d{4}$/.test(pin)) return bad('الرمز السري لازم يكون ٤ أرقام');
    if (!login && pin !== pin2) return bad('الرمزان غير متطابقين');
    el.disabled = true; const old = el.textContent; el.textContent = 'لحظة…';
    try {
      let me;
      if (st) me = await staffAuth(name, phone, code, pin, cityId);
      else {
        const sid = await SL.sidOf(phone), pinHash = await SL.hashPin(pin, phone);
        if (SL.cloud.enabled && navigator.onLine) {
          try { const ex = await SL.getOnce(SL.fs().collection('users').doc(phone)); if (ex.exists) throw 'هذا الرقم مسجّل بالفعل — استخدم «تسجيل دخول».'; } catch (e) { if (typeof e === 'string') throw e; }
        }
        me = { role: 'student', name, phone, sid, cityId, wallet, pinHash, createdAt: Date.now() };
        SL.queue('users', phone, { name, phone, sid, pinHash, wallet, cityId, role: 'student', ts: Date.now() }, { merge: false });
      }
      SL.me = me; SL.settings.cityId = cityId; SL.saveSettings(); enter();
      ui.toast(`أهلاً بك يا ${name.split(' ')[0]} 🤍`);
    } catch (e) { bad(typeof e === 'string' ? e : why(e)); el.disabled = false; el.textContent = old; }
  };
  SL.act.doLogin = async el => {
    const phone = SL.normPhone(v('#aPhone')), pin = SL.latinDigits(v('#aPin')).trim();
    if (!SL.validPhone(phone)) return ui.toast('رقم التليفون غير صحيح — اكتبه بالشكل 01xxxxxxxxx'); if (!/^\d{4}$/.test(pin)) return ui.toast('اكتب الرمز السري (٤ أرقام)');
    if (!SL.cloud.enabled) return ui.toast('تسجيل الدخول من جهاز آخر يتطلب تفعيل Firebase', 4000);
    if (!navigator.onLine) return ui.toast('تسجيل الدخول يحتاج اتصالاً بالإنترنت', 4000);
    const lf = SL.load('loginFail', { n: 0, until: 0 });
    if (Date.now() < lf.until) return ui.toast('محاولات كثيرة خاطئة — حاول بعد ' + N(Math.ceil((lf.until - Date.now()) / 1000)) + ' ثانية', 4000);
    el.disabled = true; const old = el.textContent; el.textContent = 'لحظة…';
    try {
      const d = await SL.getOnce(SL.fs().collection('users').doc(phone));
      if (!d.exists) throw 'لا يوجد حساب بهذا الرقم';
      const u = d.data(); if (u.pinHash !== await SL.hashPin(pin, phone)) { lf.n++; if (lf.n >= 5) { lf.until = Date.now() + 60000; lf.n = 0; } SL.save('loginFail', lf); throw 'الرمز السري غير صحيح'; }
      SL.save('loginFail', { n: 0, until: 0 });
      SL.me = { role: 'student', name: u.name, phone, sid: u.sid, cityId: u.cityId || SL.settings.cityId, wallet: !!u.wallet, pinHash: u.pinHash, createdAt: u.ts };
      if (u.cityId) { SL.settings.cityId = u.cityId; SL.saveSettings(); } enter();
    } catch (e) { ui.toast(typeof e === 'string' ? e : why(e), 8000); el.disabled = false; el.textContent = old; }
  };

  /* ---------- قفل التطبيق ---------- */
  let lockBusy = false;
  SL.showLock = () => {
    if (!SL.me || !SL.me.pinHash) return false;
    if (sessionStorage.getItem('unlocked') === '1') return false;
    let buf = ''; const lk = document.createElement('div'); lk.id = 'lock';
    lk.innerHTML = `<img src="logo.svg" alt=""><div style="font-family:Amiri,serif;font-size:26px">أهلاً ${E(SL.me.name.split(' ')[0])}</div><div class="small" style="opacity:.8" id="lkMsg">أدخل الرمز السري</div><div class="dots" id="lkDots"><i></i><i></i><i></i><i></i></div>
      <div class="pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-k="${n}">${N(n)}</button>`).join('')}<button data-k="x" style="font-size:20px">مسح</button><button data-k="0">${N(0)}</button><button data-k="" style="visibility:hidden"></button></div>
      <button class="btn sec sm" id="lkOut" style="background:rgba(255,255,255,.1);color:#f6e3a1;border:0">نسيت الرمز؟ تسجيل الخروج</button>`;
    document.body.appendChild(lk);
    const dots = () => $$('#lkDots i').forEach((d, i) => d.classList.toggle('on', i < buf.length));
    const fails = SL.load('lkFail', { n: 0, until: 0 });
    lk.onclick = async e => {
      const b = e.target.closest('button[data-k]'); if (!b || lockBusy) return; const k = b.dataset.k; SL.sound.unlock();
      if (Date.now() < fails.until) { $('#lkMsg').textContent = 'حاول بعد ' + N(Math.ceil((fails.until - Date.now()) / 1000)) + ' ثانية'; return; }
      if (k === 'x') buf = ''; else if (k !== '') buf += k; dots();
      if (buf.length === 4) {
        lockBusy = true; const ok = (await SL.hashPin(buf, SL.me.phone)) === SL.me.pinHash; lockBusy = false;
        if (ok) { SL.save('lkFail', { n: 0, until: 0 }); sessionStorage.setItem('unlocked', '1'); lk.remove(); if (SL.afterUnlock) SL.afterUnlock(); }
        else { fails.n++; if (fails.n >= 5) { fails.until = Date.now() + 30000; fails.n = 0; } SL.save('lkFail', fails); buf = ''; dots(); $('#lkMsg').textContent = 'رمز غير صحيح'; $('#lkDots').classList.add('shake'); setTimeout(() => $('#lkDots').classList.remove('shake'), 450); if (navigator.vibrate) navigator.vibrate(150); }
      }
    };
    $('#lkOut').onclick = () => SL.act.logout();
    return true;
  };

  /* ---------- التفويض العام للنقرات ---------- */
  document.addEventListener('click', e => {
    const a = e.target.closest('[data-act]'); if (!a) return;
    const f = SL.act[a.dataset.act]; if (f) { SL.sound.unlock(); f(a, e); }
  });

  /* ---------- مؤقت الثانية: عدّادات + إعادة رسم عند تغيّر الحالة ---------- */
  let sig = '';
  setInterval(() => {
    const now = Date.now(); SL.save('lastSeen', Math.max(SL.load('lastSeen', 0), now));
    $$('[data-cd]').forEach(el => { const at = +el.dataset.at; el.textContent = SL.fmtDur(at - now); });
    if (SL.tab === 'home' && $('#page') && !$('#overlay.on')) {
      const s = SL.prayerStates(now, getDays()[SL.dkey(new Date(now))] || {}).map(x => x.st).join(',') + SL.dkey(new Date(now));
      if (sig && s !== sig) render(true); sig = s;
    }
  }, 1000);

  SL.on('status', () => { const c = $('#chip'); if (c) c.innerHTML = syncChip(); if (SL.tab === 'settings' && !$('#overlay.on')) render(); });
  SL.on('data', () => {
    notifyMsgs(); paintBadges();
    if ($('#overlay.on')) return; const ae = document.activeElement;
    if (ae && /INPUT|TEXTAREA|SELECT/.test(ae.tagName) && $('#page') && $('#page').contains(ae)) return;
    if (SL.me && $('#page') && ['home', 'honor', 'wird', 'messages', 'admin'].includes(SL.tab)) { if (SL.tab === 'admin' && SL.adminBusy) return; render(true); }
  });
  SL.on('opfailed', ({ op }) => { if (op.col === 'users') ui.toast('تعذّر إنشاء حسابك على السحابة (الرقم مسجّل مسبقاً؟). سجّل الدخول بالحساب الأصلي.', 6000); });

  SL.authView = authView;
  SL.start = () => {
    SL.applyTheme();
    try { const t = new URLSearchParams(location.search).get('tab'); if (t && NAV_STUDENT.some(n => n[0] === t)) SL.tab = t; } catch (e) {}
    if (!SL.me) { authView(); return; }
    if (SL.showLock()) { shell(); } else shell();
  };
})(window.SL);

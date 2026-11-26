/* صلاتي — لوحات الإدارة: المدرس (Admin) والإدارة العليا (Super Admin) */
(function (SL) {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const E = SL.esc, N = SL.n, ui = SL.ui, pad = SL.pad;
  const v = s => ($(s) || {}).value || '';
  const db = () => SL.fs();

  Object.defineProperty(SL, 'adminBusy', { get() { return $$('#page input[type=text],#page textarea').some(x => x.value && x.id !== 'stSearch'); } });
  SL.aTab = 'students'; SL.aDate = null; SL.aQ = '';

  const users = () => (SL.cache.users || []).filter(u => u.role !== 'admin' && u.role !== 'super');
  const settings = () => SL.cache.settings || {};
  const bySid = () => { const m = {}; users().forEach(u => m[u.sid] = u); return m; };
  const dayDocs = dk => { const m = {}; for (const id in SL.cache.daysAll) { const d = SL.cache.daysAll[id]; if (d.date === dk) m[d.sid] = d; } return m; };
  const cell = (r, closed) => r ? `<span class="cell ${r.where === 'mosque' ? 'm' : 'h'}" title="${SL.fmtTime(r.ts)}">${r.where === 'mosque' ? 'م' : 'ب'}</span>` : `<span class="cell ${closed ? 'x' : 'n'}">${closed ? '✗' : '–'}</span>`;
  const noCloud = () => !SL.cloud.enabled ? '<div class="card empty">⚠️ لوحة الإدارة تحتاج ربط التطبيق بـ Firebase (راجع README).</div>' : '';

  const TABS = () => { const t = [['students', '👥 متابعة الطلاب'], ['acts', '📿 التسبيح والأدعية'], ['wird', '📖 الورد'], ['posts', '📢 الإعلانات'], ['report', '🧾 التقرير الشهري']]; if (SL.me.role === 'super') t.push(['super', '👑 الإدارة العليا']); return t; };

  SL.pages.admin = () => {
    const tabs = `<div class="tabs">${TABS().map(t => `<button data-act="aTab" data-t="${t[0]}" class="${SL.aTab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div>`;
    const fn = { students: tStudents, acts: tActs, wird: tWird, posts: tPosts, report: tReport, super: tSuper }[SL.aTab] || tStudents;
    return noCloud() + tabs + fn();
  };
  SL.act.aTab = el => { SL.aTab = el.dataset.t; SL.render(); };

  /* ---------- متابعة الطلاب (بطاقات) ---------- */
  SL.aFilter = 'all'; SL.aSort = 'name';
  const ctx = () => {
    const dk = SL.aDate || SL.dkey(), docs = dayDocs(dk), us = users(), now = Date.now(), isToday = dk === SL.dkey();
    const t = SL.timesFor(SL.fromKey(dk)), W = (window.APP_CFG.windowMin || 90) * 60000;
    const state = id => !isToday ? 'closed' : now < t[id] ? 'upcoming' : now <= t[id] + W ? 'open' : 'closed';
    const wdSet = new Set((SL.cache.wirdDone || []).map(w => w.sid));
    return { dk, docs, us, now, isToday, t, W, state, wdSet, openP: isToday ? SL.PRAYERS.find(p => state(p.id) === 'open') : null };
  };
  const pOf = (C, u) => (C.docs[u.sid] || {}).p || {};
  const visible = C => {
    const q = SL.aQ.trim(), F = SL.aFilter;
    let l = C.us.filter(u => !q || u.name.includes(q) || u.phone.includes(q));
    if (F === 'openMiss' && C.openP) l = l.filter(u => !pOf(C, u)[C.openP.id]);
    if (F === 'fajrMiss') l = l.filter(u => !pOf(C, u).fajr);
    if (F === 'noWird') l = l.filter(u => !C.wdSet.has(u.sid));
    if (F === 'full') l = l.filter(u => SL.PRAYERS.every(p => pOf(C, u)[p.id]));
    const cnt = u => SL.PRAYERS.filter(p => pOf(C, u)[p.id]).length;
    if (SL.aSort === 'most') l.sort((a, b) => cnt(b) - cnt(a) || a.name.localeCompare(b.name, 'ar'));
    else if (SL.aSort === 'least') l.sort((a, b) => cnt(a) - cnt(b) || a.name.localeCompare(b.name, 'ar'));
    else l.sort((a, b) => a.name.localeCompare(b.name, 'ar'));
    return l;
  };
  const pcell = (C, u, p) => {
    const r = pOf(C, u)[p.id], st = C.state(p.id);
    if (r) return `<div class="pc ${r.sus ? 's' : r.where === 'mosque' ? 'm' : 'h'}"><small>${p.name}</small><i>${r.sus ? '⚠️' : r.where === 'mosque' ? '🕌' : '🏠'}</i><em class="num">${SL.fmtTime(r.ts)}</em></div>`;
    if (st === 'closed') return `<div class="pc x"><small>${p.name}</small><i>✗</i><em>فاتت</em></div>`;
    if (st === 'open') return `<div class="pc o"><small>${p.name}</small><i>⏳</i><em>جارية</em></div>`;
    return `<div class="pc n"><small>${p.name}</small><i>–</i><em class="num">${SL.fmtTime(C.t[p.id])}</em></div>`;
  };
  const zOf = (C, u) => ((SL.cache.actsAll || {})[`${u.sid}_${C.dk}`] || {}).z || {};
  const zSum = z => { let dh = 0, ad = 0, du = 0, qr = 0, sd = 0, last = 0; for (const k in z) { const e = z[k] || {}; if (k[0] === 't' && e.done) dh++; if (k[0] === 'a' && e.done) ad++; if (k[0] === 'u') du += e.n || 0; if (k === 'q') qr += e.n || 0; if (k[0] === 'd' && e.done) sd++; if ((e.ts || 0) > last) last = e.ts; } return { dh, ad, du, qr, sd, last }; };
  const actChips = (C, u) => { const s = zSum(zOf(C, u)), nt = SL.dhikrTasks().length, sus = Object.values(pOf(C, u)).filter(r => r && r.sus).length; return `<div class="acts">${sus ? `<span class="chip" style="background:var(--bad);color:#fff">⚠️ ${N(sus)} مسجد غير صادق</span>` : ''}<span class="chip ${s.dh ? 'on' : ''}">📿 ${N(s.dh)}/${N(nt)} تسبيح</span><span class="chip ${s.ad ? 'on' : ''}">🌅 ${N(s.ad)}/${N(3)} أذكار</span><span class="chip ${s.du ? 'on' : ''}">🤲 ${N(s.du)} دعاء</span><span class="chip ${s.qr ? 'on' : ''}">📖 ${N(s.qr)} صفحة</span></div>`; };
  const actDetail = (C, u) => {
    const z = zOf(C, u), tasks = SL.dhikrTasks(), sets = window.ADHKAR_DATA, ue = z.u;
    const line = (label, e, g, doneTs) => `<div class="setrow"><span>${label}</span>${e ? `<span><b class="num">${N(e.n || 0)}/${N(g)}</b> <span class="muted small num">${e.done ? '✓ ' + SL.fmtTime(e.done) : 'آخر نشاط ' + SL.fmtTime(e.ts)}</span></span>` : '<span class="muted">–</span>'}</div>`;
    const sduas = (SL.cache.dhikr || []).filter(x => x.kind === 'dua' && x.show !== false), qe = z.q, qg = Math.max(1, +(settings().quranGoal) || 5);
    const extra = `<div class="hint" style="margin:12px 0 6px">📖 القرآن اليوم${z.mp ? ` — آخر موضع: سورة ${E(z.mp.sn)} آية ${N(z.mp.ay)} صفحة ${N(z.mp.page)}` : ''}</div><div class="card" style="box-shadow:none;padding:6px 14px"><div class="setrow"><span>عدد الصفحات</span>${qe ? `<span><b class="num">${N(qe.n || 0)}/${N(qg)}</b> <span class="muted small num">${qe.done ? '✓ ' + SL.fmtTime(qe.done) : 'آخر نشاط ' + SL.fmtTime(qe.ts)}</span></span>` : '<span class="muted">–</span>'}</div></div>${sduas.length ? `<div class="hint" style="margin:12px 0 6px">🤲 أدعية الإدارة</div><div class="card" style="box-shadow:none;padding:6px 14px">${sduas.map(x => { const e = z['d_' + x.id]; return `<div class="setrow"><span>${E(x.title || (x.text || '').slice(0, 30))}</span>${e && e.done ? `<span class="muted small num">✓ ${SL.fmtTime(e.done)}</span>` : '<span class="muted">–</span>'}</div>`; }).join('')}</div>` : ''}`;
    return extra + `<div class="hint" style="margin:12px 0 6px">📿 التسبيح والذكر</div><div class="card" style="box-shadow:none;padding:6px 14px">${tasks.map(t => line(`${t.icon} ${E(t.title)}`, z['t_' + t.id], t.g)).join('') || '<div class="empty">لا توجد أذكار</div>'}</div>
      <div class="hint" style="margin:12px 0 6px">🌅 الأذكار</div><div class="card" style="box-shadow:none;padding:6px 14px">${Object.keys(sets).map(k => line(`${sets[k].icon} ${sets[k].name}`, z['a_' + k], (z['a_' + k] || {}).g || sets[k].items.length)).join('')}</div>
      <div class="hint" style="margin:12px 0 6px">🤲 الأدعية التي قرأها (${N(ue ? ue.n || 0 : 0)})</div>${ue && ue.l && ue.l.length ? `<div class="card" style="box-shadow:none;padding:8px 14px;font-family:Amiri,serif;line-height:2;font-size:16px">${ue.l.slice(-8).reverse().map(t => '• ' + E(t) + '…').join('<br>')}<div class="muted small" style="font-family:Tajawal">آخر قراءة ${SL.fmtTime(ue.ts)}</div></div>` : '<div class="muted small">لم يقرأ أدعية اليوم.</div>'}`;
  };
  function tStudents() {
    const C = ctx(), list = visible(C), total = C.us.length;
    const per = SL.PRAYERS.map(p => ({ p, n: C.us.filter(u => pOf(C, u)[p.id]).length, st: C.state(p.id) }));
    const FL = [['all', 'الكل']]; if (C.openP) FL.push(['openMiss', `لم يسجّلوا ${C.openP.name}`]); FL.push(['fajrMiss', 'لم يصلّوا الفجر']); if (C.isToday) FL.push(['noWird', 'لم يُتمّوا الورد']); FL.push(['full', 'أتمّوا الخمس']);
    if (!FL.some(f => f[0] === SL.aFilter)) SL.aFilter = 'all';
    const mosque = C.us.reduce((a, u) => a + SL.PRAYERS.filter(p => (pOf(C, u)[p.id] || {}).where === 'mosque').length, 0);
    return `<div class="card" style="padding:14px"><div class="row" style="margin-bottom:10px"><h2 class="grow" style="margin:0;font-size:18px">متابعة الطلاب</h2><span class="chip">${SL.fmtShort(C.dk)}${C.isToday ? ' · اليوم' : ''}</span></div>
      <div class="pstrip">${per.map(x => `<div class="${x.st === 'open' ? 'on' : ''}"><small>${x.p.name}</small><b class="num">${N(x.n)}<span>/${N(total)}</span></b><em>${x.st === 'open' ? 'جارية الآن' : x.st === 'upcoming' ? 'لم تحن' : 'انتهت'}</em></div>`).join('')}</div>
      <div class="hint" style="margin-top:8px">🕌 مسجد · 🏠 بيت · ✗ فاتت · ⏳ جارية · الرقم تحت كل صلاة = وقت تسجيلها${C.isToday ? ' · 📖 ' + N(C.wdSet.size) + ' أتمّوا الورد' : ''}</div></div>
    <div class="card" style="padding:12px"><input type="text" id="stSearch" placeholder="🔍 ابحث بالاسم أو الرقم" value="${E(SL.aQ)}">
      <div class="row" style="margin-top:8px"><input type="date" id="aDate" class="grow" aria-label="اليوم" value="${C.dk}" min="${SL.rangeFrom()}" max="${SL.dkey()}" style="padding:10px"><select id="aSort" aria-label="ترتيب" style="padding:10px;width:auto"><option value="name" ${SL.aSort === 'name' ? 'selected' : ''}>أبجدي</option><option value="most" ${SL.aSort === 'most' ? 'selected' : ''}>الأكثر التزاماً</option><option value="least" ${SL.aSort === 'least' ? 'selected' : ''}>الأقل التزاماً</option></select></div>
      <div class="chips" style="margin-top:8px">${FL.map(f => `<button data-act="aFilter" data-f="${f[0]}" class="${SL.aFilter === f[0] ? 'on' : ''}">${f[1]}</button>`).join('')}<button data-act="admCopy" style="border-color:var(--accent);color:var(--accent)">📋 نسخ الأسماء (${N(list.length)})</button>${C.openP ? `<button data-act="admRemind" style="border-color:var(--accent);color:var(--accent)">🔔 ذكّر الجميع بـ${C.openP.name}</button>` : ''}</div></div>
        <div class="col">${list.length ? list.map(u => { const p = pOf(C, u), c = SL.PRAYERS.filter(x => p[x.id]).length; return `<div class="scard" data-act="stuInfo" data-s="${u.sid}"><div class="sh"><div class="av">${E(u.name.trim().charAt(0))}</div><div class="grow"><div class="sn">${E(u.name)}</div><div class="small muted num">${E(u.phone)}</div></div>${C.isToday ? `<span class="badge ${C.wdSet.has(u.sid) ? 'ok' : ''}">📖 ${C.wdSet.has(u.sid) ? 'أتمّ' : 'لم يُتم'}</span>` : ''}<div class="sc ${c === 5 ? 'full' : ''}"><b class="num">${N(c)}</b>/${N(5)}</div></div><div class="pg">${SL.PRAYERS.map(x => pcell(C, u, x)).join('')}</div>${actChips(C, u)}</div>`; }).join('') : `<div class="card empty">${total ? 'لا يوجد طلاب بهذا الفلتر.' : 'لا يوجد طلاب مسجّلون بعد. شارك رابط التطبيق معهم 🌿'}</div>`}</div>`;
  }
  document.addEventListener('change', e => { if (e.target.id === 'aDate') { SL.aDate = e.target.value; SL.render(); } if (e.target.id === 'aSort') { SL.aSort = e.target.value; SL.render(true); } });
  document.addEventListener('input', e => { if (e.target.id === 'stSearch') { SL.aQ = e.target.value; const pos = e.target.selectionStart; SL.render(true); const i = $('#stSearch'); if (i) { i.focus(); try { i.setSelectionRange(pos, pos); } catch (x) {} } } });
  SL.act.aFilter = el => { SL.aFilter = el.dataset.f; SL.render(true); };
  SL.act.admCopy = () => { const C = ctx(), l = visible(C); if (!l.length) return ui.toast('لا أسماء للنسخ'); ui.copy(l.map((u, i) => `${i + 1}. ${u.name}`).join('\n')); };
  SL.act.admRemind = () => {
    const C = ctx(); if (!C.openP) return;
    SL.queue('messages', SL.uid(), { from: 'staff', fromName: SL.me.role === 'super' ? 'الإدارة' : SL.me.name, to: 'all', text: `🔔 تذكير: صلاة ${C.openP.name} ما زال تسجيلها متاحاً حتى ${SL.fmtTime(C.t[C.openP.id] + C.W)}. تقبّل الله طاعتكم 🤍`, ts: Date.now() }, { merge: false });
    ui.toast('أُرسل التذكير للجميع ✓');
  };
  SL.act.stuInfo = el => {
    const u = bySid()[el.dataset.s]; if (!u) return; const C = ctx(), p = pOf(C, u);
    const rng = SL.cycleRange(SL.cycleOf(new Date())), a = SL.aggregate(SL.cache.daysAll, rng.from, rng.to).find(x => x.sid === u.sid) || { pts: 0, cnt: 0, mosque: 0 };
    const rows = SL.PRAYERS.map(x => { const r = p[x.id], st = C.state(x.id); return `<div class="setrow"><span>${x.icon} ${x.name} <span class="muted small num">(${SL.fmtTime(C.t[x.id])})</span></span>${r ? `<span><b>${r.where === 'mosque' ? '🕌 مسجد' : '🏠 بيت'}</b> <span class="muted small num">${SL.fmtTime(r.ts)} · بعد ${N(r.delay || 0)} د</span></span>` : `<span class="muted">${st === 'closed' ? '✗ فاتت' : st === 'open' ? '⏳ جارية' : '–'}</span>`}</div>`; }).join('');
    const week = [...Array(7)].map((_, k) => { const d = SL.addDays(new Date(), -k), dd = dayDocs(SL.dkey(d))[u.sid], n = dd ? SL.PRAYERS.filter(x => (dd.p || {})[x.id]).length : 0; return `<div class="wk ${n === 5 ? 'full' : n ? 'part' : ''}"><b class="num">${N(n)}</b><small>${SL.dayName(d.getDay())}</small></div>`; }).join('');
    ui.sheet(`<h2 style="margin:0">${E(u.name)}</h2><div class="muted num" style="margin-bottom:10px">${E(u.phone)}${u.wallet ? ' · 💳 محفظة إلكترونية' : ''}</div>
      <div class="card" style="box-shadow:none;padding:6px 14px">${rows}</div>
      ${actDetail(C, u)}
      <div class="hint" style="margin:12px 0 6px">آخر ٧ أيام (عدد الصلوات)</div><div class="wkrow">${week}</div>
      <div class="stat" style="margin-top:12px"><div><b>${N(a.cnt)}</b>صلاة بالدورة</div><div><b>${N(a.mosque)}</b>في المسجد</div><div><b>${N(a.pts)}</b>نقطة</div></div>
      <div class="hint" style="margin:10px 0">ورد اليوم: ${C.wdSet.has(u.sid) ? '✓ أتمّه' : 'لم يُتمّه بعد'}</div>
      <div class="row"><button class="btn grow" data-act="msgTo" data-s="${u.sid}">✉️ مراسلة</button><a class="btn sec" href="tel:${E(u.phone)}">📞 اتصال</a><button class="btn sec" data-act="closeSheet">إغلاق</button></div>`);
  };
  SL.act.msgTo = el => { ui.close(); SL.msgTarget = el.dataset.s; SL.tab = 'messages'; SL.shell(); };

  /* ---------- التسبيح والأدعية (إدارة + متابعة) ---------- */
  SL.actKind = 'dhikr';
  function tActs() {
    const C = ctx(), us = C.us, S = settings(), items = (SL.cache.dhikr || []).slice(), tasks = SL.dhikrTasks(), isD = SL.actKind === 'dhikr';
    const rows = us.map(u => { const z = zOf(C, u), s = zSum(z); return { u, s }; }).sort((x, y) => (y.s.dh + y.s.ad + y.s.du) - (x.s.dh + x.s.ad + x.s.du) || x.u.name.localeCompare(y.u.name, 'ar'));
    return `<div class="card"><h2 style="margin:0 0 10px;font-size:18px">📿 إنجاز اليوم لكل ذكر</h2><div class="col">${tasks.length ? tasks.map(t => { const n = us.filter(u => (zOf(C, u)['t_' + t.id] || {}).done).length, p = us.length ? Math.round(n / us.length * 100) : 0; return `<div class="msg"><div class="meta" style="margin:0"><b>${t.icon} ${E(t.title)}</b><span class="num">${N(n)}/${N(us.length)}</span></div><div class="bar"><i style="width:${p}%"></i></div></div>`; }).join('') : '<div class="empty">لا توجد أذكار مفعّلة.</div>'}</div>
      <div class="setrow" style="margin-top:8px"><span>إظهار التسبيحات الافتراضية (٥ أذكار × ١٠٠)</span><label class="switch"><input type="checkbox" data-aset="showDefaultDhikr" ${S.showDefaultDhikr !== false ? 'checked' : ''}><i></i></label></div></div>
    <div class="card"><h2 style="margin:0 0 10px;font-size:18px">📖 القرآن اليومي</h2>
      <div class="row"><label class="f grow" style="margin:0">الهدف اليومي (صفحات)<input type="number" id="qGoal" value="${Math.max(1, +S.quranGoal || 5)}" min="1" max="100" inputmode="numeric"></label><button class="btn sm" data-act="qGoalSave" style="align-self:flex-end">حفظ</button></div>
      <div class="hint" style="margin-top:8px">${N(us.filter(u => (zOf(C, u).q || {}).n >= (+S.quranGoal || 5)).length)} من ${N(us.length)} حققوا الهدف اليوم · إجمالي ${N(us.reduce((t, u) => t + ((zOf(C, u).q || {}).n || 0), 0))} صفحة</div></div>
    ${items.some(x => x.kind === 'dua') ? `<div class="card"><h2 style="margin:0 0 10px;font-size:18px">🤲 قراءة أدعية الإدارة اليوم</h2><div class="col">${items.filter(x => x.kind === 'dua').map(x => { const who = us.filter(u => (zOf(C, u)['d_' + x.id] || {}).done); return `<div class="msg"><div class="meta" style="margin:0"><b>${E(x.title || (x.text || '').slice(0, 30))}</b><span class="num">${N(who.length)}/${N(us.length)}</span></div><div class="bar"><i style="width:${us.length ? Math.round(who.length / us.length * 100) : 0}%"></i></div><div class="muted small" style="margin-top:6px">${who.length ? who.map(u => E(u.name)).join('، ') : 'لم يقرأه أحد بعد'}</div></div>`; }).join('')}</div></div>` : ''}
    <div class="card"><h2 style="margin:0 0 10px;font-size:18px">➕ إضافة للطلاب</h2><div class="col">
      <div class="seg"><button data-act="actKind" data-k="dhikr" class="${isD ? 'on' : ''}">ذكر / تسبيح</button><button data-act="actKind" data-k="dua" class="${!isD ? 'on' : ''}">دعاء</button></div>
      <input type="text" id="xTitle" placeholder="${isD ? 'اسم الذكر (مثال: سبحان الله العظيم)' : 'عنوان الدعاء (اختياري)'}" maxlength="80">
      <textarea id="xText" placeholder="${isD ? 'نص يظهر داخل العدّاد (اختياري)' : 'نص الدعاء… يظهر في مكتبة الأدعية وبعد الصلاة'}" style="min-height:70px"></textarea>
      ${isD ? '<label class="f">العدد المطلوب<input type="number" id="xTarget" value="33" min="1" max="10000" inputmode="numeric"></label>' : ''}
      <button class="btn" data-act="actPub">نشر للجميع</button></div></div>
    <div class="card"><h3>المضاف من الإدارة (${N(items.length)})</h3><div class="col">${items.length ? items.map(x => `<div class="msg"><div class="meta"><b>${x.kind === 'dua' ? '🤲 دعاء' : '📿 ذكر'}${x.title ? ' — ' + E(x.title) : ''}</b><span class="num">${x.kind === 'dhikr' ? N(x.target) + ' مرة' : ''}</span></div>${x.text ? `<div class="small" style="white-space:pre-wrap;max-height:70px;overflow:hidden">${E(x.text)}</div>` : ''}<div class="row" style="margin-top:8px"><button class="btn sm sec" data-act="actToggle" data-i="${x.id}" data-v="${x.show === false ? 1 : 0}">${x.show === false ? 'إظهار' : 'إخفاء'}</button><button class="btn sm bad" data-act="actDel" data-i="${x.id}">حذف</button></div></div>`).join('') : '<div class="empty">لم تضف شيئاً بعد.</div>'}</div></div>
    <div class="card"><h3>📊 نشاط الطلاب اليوم</h3><div class="hint" style="margin-bottom:8px">تسبيح مكتمل · أذكار مكتملة · أدعية قرأها — اضغط على الاسم في «متابعة الطلاب» للتفاصيل.</div>
      <div class="scroll"><table class="tbl"><thead><tr><th>الطالب</th><th>📿</th><th>🌅</th><th>🤲</th><th>📖</th><th>آخر نشاط</th></tr></thead><tbody>${rows.length ? rows.map(r => `<tr data-act="stuInfo" data-s="${r.u.sid}" style="cursor:pointer"><td>${E(r.u.name)}</td><td>${N(r.s.dh)}</td><td>${N(r.s.ad)}</td><td>${N(r.s.du)}</td><td>${N(r.s.qr)}</td><td class="num">${r.s.last ? SL.fmtTime(r.s.last) : '–'}</td></tr>`).join('') : '<tr><td colspan="6" class="empty">لا يوجد طلاب</td></tr>'}</tbody></table></div></div>`;
  }
  SL.act.qGoalSave = () => { const g = Math.max(1, Math.min(100, parseInt(SL.latinDigits(v('#qGoal'))) || 5)); SL.queue('settings', 'app', { quranGoal: g }); SL.cache.settings = Object.assign({}, settings(), { quranGoal: g }); ui.toast('تم حفظ الهدف ✓'); SL.render(true); };
  SL.act.actKind = el => { SL.actKind = el.dataset.k; SL.render(true); };
  SL.act.actPub = () => {
    const kind = SL.actKind, title = v('#xTitle').trim(), text = v('#xText').trim(), target = Math.max(1, Math.min(10000, parseInt(SL.latinDigits(v('#xTarget'))) || 33));
    if (kind === 'dhikr' && !title) return ui.toast('اكتب اسم الذكر'); if (kind === 'dua' && !text) return ui.toast('اكتب نص الدعاء');
    const id = SL.uid(), d = { kind, title, text, target: kind === 'dhikr' ? target : null, show: true, by: SL.me.name, ts: Date.now() };
    SL.queue('dhikr', id, d, { merge: false }); SL.cache.dhikr = [Object.assign({ id }, d)].concat(SL.cache.dhikr || []);
    ui.toast(kind === 'dhikr' ? 'أُضيف الذكر ✓ وظهر لكل الطلاب' : 'أُضيف الدعاء ✓ وظهر في المكتبة وبعد الصلاة'); SL.render(true);
  };
  SL.act.actToggle = el => { const show = el.dataset.v === '1'; SL.queue('dhikr', el.dataset.i, { show }); const x = (SL.cache.dhikr || []).find(y => y.id === el.dataset.i); if (x) x.show = show; SL.render(true); };
  SL.act.actDel = async el => { if (!await ui.confirm('حذف هذا العنصر نهائياً؟', 'حذف', true)) return; SL.queueDelete('dhikr', el.dataset.i); SL.cache.dhikr = (SL.cache.dhikr || []).filter(y => y.id !== el.dataset.i); SL.render(true); };

  /* ---------- الورد ---------- */
  function tWird() {
    const today = SL.dkey(), list = (SL.cache.wird || []).slice().sort((a, b) => b.date.localeCompare(a.date));
    const done = SL.cache.wirdDone || [], doneSids = new Set(done.map(d => d.sid)), pending = users().filter(u => !doneSids.has(u.sid));
    return `${SL.wirdComposer()}
      <div class="card"><h3>✅ أتمّوا ورد اليوم (${N(done.length)})</h3><div class="col">${done.length ? done.sort((a, b) => a.ts - b.ts).map(d => `<div class="msg" style="padding:8px 12px"><div class="meta" style="margin:0"><b>${E(d.name)}</b><span>${SL.fmtTime(d.ts)}</span></div></div>`).join('') : '<div class="empty">لم يُتمّ أحد الورد بعد.</div>'}</div></div>
      <div class="card"><h3>⏳ لم يُتمّوه (${N(pending.length)})</h3><div class="small muted" style="line-height:2">${pending.map(u => E(u.name)).join(' · ') || '—'}</div></div>
      <div class="card"><h3>الأوراد المنشورة</h3><div class="col">${list.length ? list.map(w => `<div class="msg"><div class="meta"><b>${E(w.title || 'ورد')}</b><span>${SL.fmtShort(w.date)}</span></div><div class="small" style="white-space:pre-wrap;max-height:90px;overflow:hidden">${E(w.text)}</div><button class="btn sm bad" style="margin-top:8px" data-act="wirdDel" data-d="${w.date}">حذف</button></div>`).join('') : '<div class="empty">لا توجد أوراد.</div>'}</div></div>`;
  }
  SL.act.wirdPub = () => {
    const date = v('#wDate') || SL.dkey(), title = v('#wTitle').trim(), text = v('#wText').trim();
    if (!text) return ui.toast('اكتب نص الورد');
    SL.queue('wird', date, { date, title, text, by: SL.me.name, ts: Date.now() }, { merge: false });
    ui.toast('تم نشر الورد ✓'); $('#wText').value = ''; $('#wTitle').value = '';
    SL.cache.wird = (SL.cache.wird || []).filter(w => w.date !== date).concat([{ id: date, date, title, text, by: SL.me.name, ts: Date.now() }]); SL.render();
  };
  SL.act.wirdDel = async el => { if (!await ui.confirm('حذف هذا الورد؟', 'حذف', true)) return; SL.queueDelete('wird', el.dataset.d); SL.cache.wird = (SL.cache.wird || []).filter(w => w.date !== el.dataset.d); SL.render(); };

  /* ---------- الإعلانات والتكريمات ---------- */
  function tPosts() {
    const S = settings(), ann = (SL.cache.ann || []);
    const sw = (k, label, def = true) => `<div class="setrow"><span>${label}</span><label class="switch"><input type="checkbox" data-aset="${k}" ${S[k] !== false && (S[k] !== undefined || def) ? 'checked' : ''}><i></i></label></div>`;
    return `<div class="card"><h3>👁️ التحكم في الظهور للجميع</h3>${sw('showFajrHero', 'بطل الفجر اليومي')}${sw('showWeekly', 'بطاقة تهنئة الأسبوع')}${sw('showBoard', 'لوحة الشرف (أفضل ٥)')}
        <div class="hint" style="margin-top:8px">تهنئة الأسبوع تُحسب تلقائياً (أكثر طالب التزاماً). يمكنك استبدالها يدوياً:</div>
        <div class="col" style="margin-top:8px"><input type="text" id="woName" placeholder="اسم الطالب المكرَّم (اتركه فارغاً للتلقائي)" value="${E((S.weeklyOverride || {}).name || '')}"><input type="text" id="woMsg" placeholder="رسالة التهنئة / الجائزة" value="${E((S.weeklyOverride || {}).msg || '')}"><button class="btn sec" data-act="woSave">حفظ التهنئة اليدوية</button></div></div>
      <div class="card"><h2>📢 نشر إعلان أو تكريم</h2><div class="col">
        <div class="seg" style="flex-wrap:wrap">${[['announce', 'إعلان'], ['hadith', '🌙 حديث'], ['story', '📖 حكاية'], ['benefit', '💡 فائدة'], ['photo', '🖼️ صورة'], ['honor', 'تكريم 🏆']].map(k => `<button data-act="postKind" data-k="${k[0]}" class="${SL.postKind === k[0] ? 'on' : ''}">${k[1]}</button>`).join('')}</div>
        <input type="text" id="pTitle" placeholder="${SL.postKind === 'honor' ? 'عنوان التكريم (مثال: تكريم خاص)' : SL.postKind === 'hadith' ? 'عنوان (مثال: حديث اليوم)' : SL.postKind === 'story' ? 'عنوان الحكاية' : SL.postKind === 'benefit' ? 'عنوان الفائدة' : 'العنوان'}" maxlength="80">
        <textarea id="pText" placeholder="${SL.postKind === 'honor' ? 'اسم المكرَّم وكلمة التكريم…' : SL.postKind === 'hadith' ? 'نص الحديث الشريف…' : SL.postKind === 'story' ? 'اكتب الحكاية…' : SL.postKind === 'photo' ? 'تعليق على الصورة (اختياري)' : 'النص…'}"></textarea>
        ${SL.postKind === 'hadith' ? '<input type="text" id="pSrc" placeholder="المصدر (مثال: رواه البخاري ومسلم)" maxlength="120">' : ''}
        <label class="btn sec" style="text-align:center;cursor:pointer">🖼️ إرفاق صورة (اختياري)<input type="file" id="pImg" accept="image/*" hidden></label><img id="pImgPrev" class="annimg" style="display:none" alt="">
        <button class="btn" data-act="postPub">نشر للجميع</button></div></div>
      <div class="card"><h3>المنشورات</h3><div class="col">${ann.length ? ann.map(a => `<div class="msg"><div class="meta"><b>${a.kind === 'honor' ? '🏆' : ((SL.POST_KINDS || {})[a.kind] || ['📢'])[0]} ${E(a.title || '')}</b><span>${SL.fmtShort(SL.dkey(new Date(a.ts)))}</span></div><div class="small" style="white-space:pre-wrap">${E(a.text)}</div>${a.img ? `<img class="annimg" src="${a.img}" alt="">` : ''}
        <div class="row" style="margin-top:8px"><button class="btn sm sec" data-act="postToggle" data-i="${a.id}" data-v="${a.show === false ? 1 : 0}">${a.show === false ? 'إظهار' : 'إخفاء'}</button><button class="btn sm bad" data-act="postDel" data-i="${a.id}">حذف</button></div></div>`).join('') : '<div class="empty">لا توجد منشورات.</div>'}</div></div>`;
  }
  SL.postKind = 'announce';
  SL.act.postKind = el => { SL.postKind = el.dataset.k; SL.render(); };
  let pImg = '';
  const shrink = file => new Promise((res, rej) => { const fr = new FileReader(); fr.onerror = rej; fr.onload = () => { const im = new Image(); im.onerror = rej; im.onload = () => { const k = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/jpeg', .72)); }; im.src = fr.result; }; fr.readAsDataURL(file); });
  document.addEventListener('change', async e => { if (e.target.id !== 'pImg') return; const f = e.target.files[0]; if (!f) return; try { pImg = await shrink(f); const p = $('#pImgPrev'); p.src = pImg; p.style.display = 'block'; } catch (x) { pImg = ''; ui.toast('تعذّر قراءة الصورة'); } });
  SL.act.postPub = () => {
    const title = v('#pTitle').trim(), text = v('#pText').trim(); if (!text && !pImg) return ui.toast('اكتب النص أو أرفق صورة');
    if (pImg.length > 700000) { pImg = ''; return ui.toast('الصورة كبيرة، اختر صورة أصغر'); }
    const id = SL.uid(), a = { title, text, kind: SL.postKind, show: true, by: SL.me.name, ts: Date.now() }; const src = ($('#pSrc') || {}).value; if (src && src.trim()) a.src = src.trim(); if (pImg) a.img = pImg; pImg = '';
    SL.queue('announcements', id, a, { merge: false }); SL.cache.ann = [Object.assign({ id }, a)].concat(SL.cache.ann || []); ui.toast('تم النشر ✓'); SL.render();
  };
  SL.act.postToggle = el => { const show = el.dataset.v === '1'; SL.queue('announcements', el.dataset.i, { show }); const a = (SL.cache.ann || []).find(x => x.id === el.dataset.i); if (a) a.show = show; SL.render(); };
  SL.act.postDel = async el => { if (!await ui.confirm('حذف هذا المنشور؟', 'حذف', true)) return; SL.queueDelete('announcements', el.dataset.i); SL.cache.ann = (SL.cache.ann || []).filter(x => x.id !== el.dataset.i); SL.render(); };
  SL.act.woSave = () => { const name = v('#woName').trim(), msg = v('#woMsg').trim(); SL.queue('settings', 'app', { weeklyOverride: name ? { name, msg } : { name: '', msg: '' } }); SL.cache.settings = Object.assign({}, settings(), { weeklyOverride: { name, msg } }); ui.toast('تم الحفظ ✓'); };
  document.addEventListener('change', e => { const k = e.target.dataset && e.target.dataset.aset; if (!k) return; SL.queue('settings', 'app', { [k]: e.target.checked }); SL.cache.settings = Object.assign({}, settings(), { [k]: e.target.checked }); ui.toast('تم التحديث ✓'); if (SL.aTab === 'acts') SL.render(true); });

  /* ---------- الرسائل (للإدارة) ---------- */
  SL.pages.staffMessages = () => {
    const us = users().sort((a, b) => a.name.localeCompare(b.name, 'ar')), inbox = (SL.cache.staffMsgs || []).slice().sort((a, b) => b.ts - a.ts), tgt = SL.msgTarget || 'all';
    return `${noCloud()}<div class="card"><h2>✉️ إرسال رسالة</h2><div class="col"><label class="f">إلى<select id="mTo"><option value="all" ${tgt === 'all' ? 'selected' : ''}>👥 جميع الطلاب</option>${us.map(u => `<option value="${u.sid}" ${tgt === u.sid ? 'selected' : ''}>${E(u.name)}</option>`).join('')}</select></label>
        <textarea id="mText" placeholder="اكتب رسالتك…" maxlength="600"></textarea><button class="btn" data-act="staffSend">إرسال</button></div></div>
      <div class="card"><h3>📥 رسائل الطلاب (${N(inbox.length)})</h3><div class="col">${inbox.length ? inbox.map(m => `<div class="msg"><div class="meta"><b>${E(m.fromName)}</b><span>${SL.fmtShort(SL.dkey(new Date(m.ts)))} ${SL.fmtTime(m.ts)}</span></div><div style="white-space:pre-wrap;line-height:1.8">${E(m.text)}</div><div class="row" style="margin-top:8px"><button class="btn sm sec" data-act="msgTo" data-s="${m.from}">رد</button>${SL.me.role === 'super' ? `<button class="btn sm bad" data-act="msgDel" data-i="${m.id}">حذف</button>` : ''}</div></div>`).join('') : '<div class="empty">لا توجد رسائل واردة.</div>'}</div></div>`;
  };
  SL.act.staffSend = () => {
    const to = v('#mTo'), text = v('#mText').trim(); if (!text) return ui.toast('اكتب الرسالة');
    SL.queue('messages', SL.uid(), { from: 'staff', fromName: SL.me.role === 'super' ? 'الإدارة' : SL.me.name, to, text, ts: Date.now() }, { merge: false });
    $('#mText').value = ''; SL.msgTarget = null; ui.toast(to === 'all' ? 'أُرسلت للجميع ✓' : 'أُرسلت ✓');
  };
  SL.act.msgDel = async el => { if (!await ui.confirm('حذف الرسالة؟', 'حذف', true)) return; SL.queueDelete('messages', el.dataset.i); SL.cache.staffMsgs = (SL.cache.staffMsgs || []).filter(m => m.id !== el.dataset.i); SL.render(); };

  /* ---------- التقرير الشهري ---------- */
  const monthRange = ym => { const [y, m] = ym.split('-').map(Number); return { from: `${ym}-01`, to: `${ym}-${pad(new Date(y, m, 0).getDate())}`, y, m }; };
  function tReport() {
    const us = users().sort((a, b) => a.name.localeCompare(b.name, 'ar')), ym = SL.rpMonth || SL.dkey().slice(0, 7);
    return `<div class="card"><h2>🧾 كشف شهري</h2><div class="col">
      <label class="f">الشهر<input type="month" id="rpMonth" value="${ym}"></label>
      <label class="f">الطالب<select id="rpStu"><option value="all">كل الطلاب</option>${us.map(u => `<option value="${u.sid}">${E(u.name)}</option>`).join('')}</select></label>
      <label class="check"><input type="checkbox" id="rpDetail"><span>تفصيل يومي لكل طالب (صفحة لكل طالب في الطباعة)</span></label>
      <button class="btn" data-act="rpBuild">عرض الكشف</button></div></div><div id="rpOut"></div>`;
  }
  let REP = null;
  SL.act.rpBuild = async el => {
    const ym = v('#rpMonth'); if (!ym) return ui.toast('اختر الشهر'); SL.rpMonth = ym;
    if (!SL.cloud.enabled || !navigator.onLine) return ui.toast('الكشف الشهري يحتاج اتصالاً بالإنترنت', 4000);
    el.disabled = true; el.textContent = 'جارٍ التجميع…';
    try {
      const { from, to, y, m } = monthRange(ym), sel = v('#rpStu'), detail = $('#rpDetail').checked, rng = c => db().collection(c).where('date', '>=', from).where('date', '<=', to);
      const [dS, wS, wdS, acS] = await Promise.all([SL.getOnce(rng('days')), SL.getOnce(rng('wird')), SL.getOnce(rng('wirdDone')), SL.getOnce(rng('acts'))]);
      const days = SL.snapArr(dS), wirds = SL.snapArr(wS), wds = SL.snapArr(wdS), acts = SL.snapArr(acS);
      let us = users(); if (!us.length) { const uS = await SL.getOnce(db().collection('users')); us = SL.snapArr(uS).filter(u => u.role === 'student'); }
      if (sel !== 'all') us = us.filter(u => u.sid === sel);
      const now = Date.now(), todayK = SL.dkey(), dates = []; for (let d = new Date(y, m - 1, 1); SL.dkey(d) <= to && SL.dkey(d) <= todayK; d = SL.addDays(d, 1)) dates.push(SL.dkey(d));
      const W = (window.APP_CFG.windowMin || 90) * 60000, expectedFor = dk => dk < todayK ? 5 : SL.PRAYERS.filter(p => SL.timesFor(SL.fromKey(dk))[p.id] + W < now).length;
      const dm = {}; days.forEach(d => { (dm[d.sid] = dm[d.sid] || {})[d.date] = d.p || {}; });
      const acm = {}; acts.forEach(d => { const s = acm[d.sid] || (acm[d.sid] = { dh: 0, ad: 0, du: 0, qr: 0 }), z = zSum(d.z || {}); s.dh += z.dh; s.ad += z.ad; s.du += z.du; s.qr += z.qr; });
      const wdm = {}; wds.forEach(w => { (wdm[w.sid] = wdm[w.sid] || {})[w.date] = w.ts; });
      const wirdTotal = wirds.filter(w => w.date <= todayK).length;
      const exp = dates.reduce((a, d) => a + expectedFor(d), 0);
      const rows = us.map(u => {
        let done = 0, mosque = 0, home = 0; const per = {};
        dates.forEach(dk => { const p = (dm[u.sid] || {})[dk] || {}; per[dk] = p; SL.PRAYERS.forEach(x => { if (p[x.id]) { done++; p[x.id].where === 'mosque' ? mosque++ : home++; } }); });
        const wdn = Object.keys(wdm[u.sid] || {}).length;
        return { u, done, mosque, home, missed: Math.max(0, exp - done), wird: wdn, per, act: acm[u.sid] || { dh: 0, ad: 0, du: 0, qr: 0 } };
      }).sort((a, b) => b.done - a.done);
      REP = { ym, y, m, dates, rows, exp, wirdTotal, detail, wdm, expectedFor };
      drawReport();
    } catch (e) { ui.toast('تعذّر تجميع الكشف — تحقق من الاتصال'); console.error(e); }
    el.disabled = false; el.textContent = 'عرض الكشف';
  };
  const mname = R => `${SL.monthName(R.m - 1)} ${N(R.y)}`;
  const pc = (r) => r ? (r.where === 'mosque' ? 'م' : 'ب') : '✗';
  function reportHtml(R, forPrint) {
    const sum = `<table class="tbl"><thead><tr><th>الطالب</th><th>الهاتف</th><th>الصلوات</th><th>المسجد</th><th>البيت</th><th>النواقص</th><th>الورد</th><th>التسبيح</th><th>الأذكار</th><th>الأدعية</th><th>صفحات القرآن</th></tr></thead><tbody>${R.rows.map(r => `<tr><td>${E(r.u.name)}</td><td class="num">${E(r.u.phone)}</td><td><b>${N(r.done)}</b>/${N(R.exp)}</td><td>${N(r.mosque)}</td><td>${N(r.home)}</td><td>${N(r.missed)}</td><td>${N(r.wird)}/${N(R.wirdTotal)}</td><td>${N(r.act.dh)}</td><td>${N(r.act.ad)}</td><td>${N(r.act.du)}</td><td>${N(r.act.qr)}</td></tr>`).join('')}</tbody></table>`;
    const head = `<h1>صلاتي — كشف شهر ${mname(R)}</h1><div style="margin-bottom:8px;font-size:12px">المتوقع حتى اليوم: ${N(R.exp)} صلاة لكل طالب · أوراد الشهر: ${N(R.wirdTotal)} · أُعدّ بواسطة ${E(SL.me.name)} بتاريخ ${SL.fmtDate(new Date())}</div>`;
    let h = head + sum;
    if (R.detail || forPrint === 'detail') R.rows.forEach(r => {
      h += `<div class="${forPrint ? 'pb' : ''}" style="margin-top:14px"><h3 style="margin:0">${E(r.u.name)} — ${N(r.done)} صلاة · نواقص ${N(r.missed)} · ورد ${N(r.wird)}</h3><table class="tbl"><thead><tr><th>اليوم</th>${SL.PRAYERS.map(p => `<th>${p.name}</th>`).join('')}<th>ورد</th></tr></thead><tbody>${R.dates.map(dk => { const p = r.per[dk] || {}, ex = R.expectedFor(dk); return `<tr><td>${SL.fmtShort(dk)}</td>${SL.PRAYERS.map((x, i) => `<td>${p[x.id] ? pc(p[x.id]) : (i < ex ? '✗' : '–')}</td>`).join('')}<td>${(R.wdm[r.u.sid] || {})[dk] ? '✓' : ''}</td></tr>`; }).join('')}</tbody></table></div>`;
    });
    return h;
  }
  function drawReport() {
    const R = REP; if (!R) return;
    $('#rpOut').innerHTML = `<div class="card"><div class="row wrap" style="margin-bottom:10px"><button class="btn grow" data-act="rpPrint">🖨️ طباعة / حفظ PDF</button><button class="btn sec grow" data-act="rpCsv">📊 Excel (CSV)</button></div><div class="scroll" style="max-height:none">${reportHtml(R)}</div></div>`;
  }
  SL.act.rpPrint = () => { $('#printArea').innerHTML = reportHtml(REP, true); setTimeout(() => window.print(), 150); };
  SL.act.rpCsv = () => {
    const R = REP, q = s => '"' + String(s).replace(/"/g, '""') + '"', L = [];
    L.push(['الطالب', 'الهاتف', 'التاريخ', ...SL.PRAYERS.map(p => p.name), 'الورد'].map(q).join(','));
    R.rows.forEach(r => R.dates.forEach(dk => { const p = r.per[dk] || {}, ex = R.expectedFor(dk); L.push([r.u.name, r.u.phone, dk, ...SL.PRAYERS.map((x, i) => p[x.id] ? (p[x.id].where === 'mosque' ? 'مسجد ' : 'بيت ') + SL.fmtTime(p[x.id].ts) : (i < ex ? 'فاتت' : '')), (R.wdm[r.u.sid] || {})[dk] ? 'تم' : ''].map(q).join(',')); }));
    L.push(''); L.push(['الملخص', '', '', 'الصلوات', 'المسجد', 'البيت', 'النواقص', 'الورد', 'التسبيح', 'الأذكار', 'الأدعية', 'صفحات القرآن'].map(q).join(','));
    R.rows.forEach(r => L.push([r.u.name, r.u.phone, '', r.done, r.mosque, r.home, r.missed, r.wird, r.act.dh, r.act.ad, r.act.du, r.act.qr].map(q).join(',')));
    const blob = new Blob(['﻿' + L.join('\r\n')], { type: 'text/csv;charset=utf-8' }), a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = `salaty-${R.ym}.csv`; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 800);
  };

  /* ---------- الإدارة العليا ---------- */
  function tSuper() {
    const us = users().sort((a, b) => a.name.localeCompare(b.name, 'ar')), staff = {};
    (SL.cache.staff || []).forEach(s => { if (!staff[s.phone] || s.ts > staff[s.phone].ts) staff[s.phone] = s; });
    const teachers = Object.values(staff).filter(s => s.role === 'admin');
    return `<div class="card"><h2>👑 الإدارة العليا</h2><div class="col"><button class="btn" data-act="preview">👁️ معاينة كطالب</button><button class="btn sec" data-act="tab" data-t="messages">✉️ رسالة عامة / خاصة</button></div></div>
      <div class="card"><h3>👩‍🏫 لوحات المدرسين (${N(teachers.length)})</h3><div class="col">${teachers.length ? teachers.map(t => `<div class="msg"><div class="meta"><b>${E(t.name)}</b><span class="num">${E(t.phone)}</span></div><button class="btn sm bad" data-act="staffDel" data-p="${E(t.phone)}">إزالة لوحة التحكم</button></div>`).join('') : '<div class="empty">لا يوجد مدرسون مسجّلون.</div>'}</div></div>
      <div class="card"><h3>🎓 حسابات الطلاب (${N(us.length)})</h3><div class="col">${us.length ? us.map(u => `<div class="msg"><div class="meta"><b>${E(u.name)}</b><span class="num">${E(u.phone)}</span></div><div class="row wrap"><button class="btn sm sec" data-act="stuEdit" data-s="${u.sid}">تعديل</button><button class="btn sm sec" data-act="stuPin" data-s="${u.sid}">رمز جديد</button><button class="btn sm bad" data-act="stuDel" data-s="${u.sid}">حذف</button></div></div>`).join('') : '<div class="empty">لا يوجد طلاب.</div>'}</div></div>`;
  }
  SL.act.staffDel = async el => {
    if (!await ui.confirm('إزالة لوحة تحكم هذا المدرس؟ سيفقد صلاحيات الإدارة فوراً.', 'إزالة', true)) return;
    const p = el.dataset.p, ds = (SL.cache.staff || []).filter(s => s.phone === p && s.role === 'admin'); ds.forEach(d => SL.queueDelete('staff', d.id));
    SL.cache.staff = (SL.cache.staff || []).filter(s => !(s.phone === p && s.role === 'admin')); SL.render(); ui.toast('تمت الإزالة');
  };
  SL.act.stuEdit = el => {
    const u = bySid()[el.dataset.s]; if (!u) return;
    ui.sheet(`<h3>تعديل حساب الطالب</h3><div class="col"><label class="f">الاسم<input type="text" id="eName" value="${E(u.name)}"></label><label class="check"><input type="checkbox" id="eWallet" ${u.wallet ? 'checked' : ''}><span>رقمه عليه محفظة إلكترونية</span></label><div class="hint">رقم الهاتف لا يُعدَّل — لتغييره احذف الحساب وليسجّل من جديد.</div><button class="btn" id="eSave">حفظ</button></div>`);
    $('#eSave').onclick = () => { const name = SL.normName(v('#eName')); if (name.length < 3) return ui.toast('الاسم قصير'); SL.queue('users', u.phone, { name, wallet: $('#eWallet').checked }); u.name = name; u.wallet = $('#eWallet').checked; ui.close(); ui.toast('تم الحفظ ✓ (اسمه في لوحة الشرف يتحدث مع صلاته القادمة)'); SL.render(); };
  };
  SL.act.stuPin = el => {
    const u = bySid()[el.dataset.s]; if (!u) return;
    ui.sheet(`<h3>رمز سري جديد للطالب</h3><div class="col"><div class="muted">${E(u.name)}</div><input type="password" id="nPin" inputmode="numeric" maxlength="4" placeholder="٤ أرقام"><div class="hint">يُستخدم الرمز عند تسجيل دخوله من جهاز جديد. القفل على جهازه الحالي لا يتغيّر.</div><button class="btn" id="nSave">تعيين</button></div>`);
    $('#nSave').onclick = async () => { const p = SL.latinDigits(v('#nPin')).trim(); if (!/^\d{4}$/.test(p)) return ui.toast('٤ أرقام'); SL.queue('users', u.phone, { pinHash: await SL.hashPin(p, u.phone) }); ui.close(); ui.toast('تم تعيين الرمز الجديد ✓'); };
  };
  SL.act.stuDel = async el => {
    const u = bySid()[el.dataset.s]; if (!u) return;
    if (!await ui.confirm(`حذف حساب «${E(u.name)}» وكل سجلاته نهائياً؟`, 'حذف نهائي', true)) return;
    try {
      const [d, w, ac] = await Promise.all([SL.getOnce(db().collection('days').where('sid', '==', u.sid)), SL.getOnce(db().collection('wirdDone').where('sid', '==', u.sid)), SL.getOnce(db().collection('acts').where('sid', '==', u.sid))]);
      d.forEach(x => SL.queueDelete('days', x.id)); w.forEach(x => SL.queueDelete('wirdDone', x.id)); ac.forEach(x => SL.queueDelete('acts', x.id)); SL.queueDelete('users', u.phone);
      SL.cache.users = (SL.cache.users || []).filter(x => x.sid !== u.sid); SL.render(); ui.toast('تم الحذف');
    } catch (e) { ui.toast('تعذّر الحذف — تأكد من الاتصال'); }
  };
})(window.SL);

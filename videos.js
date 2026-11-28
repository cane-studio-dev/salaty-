/* صلاتي — قسم الفيديوهات (رابط يوتيوب/درايف/ملف مباشر أو رفع فيديو) */
(function (SL) {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const E = SL.esc, N = SL.n, ui = SL.ui;
  const val = id => (($('#' + id) || {}).value || '').trim();
  const CATS = ['دروس وموعظة', 'قصص وسيرة', 'تلاوات', 'أذكار وأدعية', 'تعليم الصلاة', 'أخرى'];
  const MAX_MB = 200;

  const vids = () => (SL.cache.dhikr || []).filter(x => x.kind === 'video' && x.show !== false && x.url).sort((a, b) => (b.ts || 0) - (a.ts || 0));
  const ytId = u => { const m = String(u).match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/))([\w-]{11})/); return m ? m[1] : ''; };
  const driveId = u => { const m = String(u).match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/); return m ? m[1] : ''; };
  const isFile = (v) => v.type === 'file' || /\.(mp4|webm|mov|m4v|ogv)(\?|#|$)/i.test(v.url) || /firebasestorage\.googleapis\.com|firebasestorage\.app/.test(v.url);
  const safeUrl = u => /^https:\/\//i.test(u) ? u : '';
  const thumb = v => { const y = ytId(v.url); return y ? `<img src="https://i.ytimg.com/vi/${y}/mqdefault.jpg" alt="" loading="lazy" onerror="this.remove()">` : ''; };
  const kindIcon = v => ytId(v.url) ? '▶️' : isFile(v) ? '🎞️' : driveId(v.url) ? '📁' : '🔗';

  const wrap = (inner, cov) => `<div class="vbox" oncontextmenu="return false">${inner}${cov ? '<div class="vcov t"></div><div class="vcov b"></div>' : ''}<div class="vwm"><img src="logo.svg" alt=""><span>صلاتي</span></div><button class="vfs" data-act="vidFs" aria-label="ملء الشاشة">⛶</button></div>`;
  const player = v => {
    const y = ytId(v.url), d = driveId(v.url), u = safeUrl(v.url);
    if (y) return wrap(`<iframe src="https://www.youtube-nocookie.com/embed/${y}?rel=0&playsinline=1&modestbranding=1&iv_load_policy=3&disablekb=1&fs=0&cc_load_policy=0" allow="encrypted-media" referrerpolicy="strict-origin-when-cross-origin" loading="lazy"></iframe>`, true);
    if (d) return wrap(`<iframe src="https://drive.google.com/file/d/${d}/preview" allow="autoplay" loading="lazy"></iframe>`);
    if (isFile(v) && u) return wrap(`<video src="${E(u)}" controls controlsList="nofullscreen nodownload" disablepictureinpicture playsinline preload="metadata"></video>`);
    return u ? `<a class="btn block" href="${E(u)}" target="_blank" rel="noopener">فتح الرابط 🔗</a>` : '<div class="empty">الرابط غير صالح.</div>';
  };
  SL.act.vidFs = el => {
    const b = el.closest('.vbox'); if (!b) return;
    if (b.classList.contains('full') || document.fullscreenElement) { b.classList.remove('full'); if (document.fullscreenElement) document.exitFullscreen(); return; }
    const f = b.requestFullscreen || b.webkitRequestFullscreen;
    if (f) { try { const r = f.call(b); if (r && r.catch) r.catch(() => b.classList.add('full')); return; } catch (e) { } }
    b.classList.add('full');
  };
  document.addEventListener('fullscreenchange', () => { document.querySelectorAll('.vbox').forEach(x => x.classList.toggle('infs', x === document.fullscreenElement)); });

  const watched = id => !!(SL.actGet()['v_' + id] || {}).done;
  const row = v => `<div class="prow ${watched(v.id) ? 'done' : ''}" data-act="vidOpen" data-id="${E(v.id)}" style="cursor:pointer;align-items:center">${thumb(v) ? `<div class="vth">${thumb(v)}</div>` : `<div class="ic">${kindIcon(v)}</div>`}<div class="grow"><div class="nm" style="font-size:15.5px;line-height:1.5">${E(v.title)}</div><div class="tm">${E(v.cat || '')}${v.desc ? ' · ' + E(v.desc.slice(0, 50)) : ''}</div></div><span class="badge ${watched(v.id) ? 'ok' : 'acc'}">${watched(v.id) ? '✓ شاهدته' : 'شاهد'}</span></div>`;

  SL.pages.videos = () => {
    const all = vids(), cat = SL.vCat || '', list = cat ? all.filter(v => v.cat === cat) : all;
    const cats = CATS.filter(c => all.some(v => v.cat === c));
    return `<div class="card"><h2>🎬 الفيديوهات</h2><div class="hint">دروس ومواعظ وقصص من الإدارة. شاهد الفيديو واضغط «شاهدته» لتحصل على نقاط.</div>
      ${cats.length ? `<div class="tabs" style="margin-top:10px"><button data-act="vidCat" data-c="" class="${!cat ? 'on' : ''}">الكل</button>${cats.map(c => `<button data-act="vidCat" data-c="${E(c)}" class="${cat === c ? 'on' : ''}">${E(c)}</button>`).join('')}</div>` : ''}</div>
      <div class="card" style="padding:8px 14px">${list.length ? list.map(row).join('') : '<div class="empty">لا توجد فيديوهات بعد. ترقّب جديد الإدارة 🌿</div>'}</div>`;
  };
  SL.act.vidCat = el => { SL.vCat = el.dataset.c; SL.render(true); };
  SL.act.vidOpen = el => {
    const v = vids().find(x => x.id === el.dataset.id); if (!v) return;
    const staff = SL.isStaff && SL.isStaff();
    ui.sheet(`<h2 style="margin:0 0 8px;font-size:19px;line-height:1.6">${E(v.title)}</h2>${player(v)}${v.desc ? `<div class="small" style="line-height:1.9;margin-top:10px;white-space:pre-wrap">${E(v.desc)}</div>` : ''}
      ${staff ? '' : `<button class="btn block" style="margin-top:12px" data-act="vidDone" data-id="${E(v.id)}" ${watched(v.id) ? 'disabled' : ''}>${watched(v.id) ? '✓ سجّلت مشاهدتك' : 'شاهدته ✓ (+٣ نقاط)'}</button>`}`);
    SL._onClose = () => SL.render(true);
  };
  SL.act.vidDone = el => {
    const v = vids().find(x => x.id === el.dataset.id); if (!v || watched(v.id)) return;
    const t = Date.now(); SL.actSet('v_' + v.id, { n: 1, g: 1, ts: t, done: t, title: v.title });
    SL.sound.play('wird'); ui.toast('تقبّل الله، سُجّلت مشاهدتك 🤍'); el.disabled = true; el.textContent = '✓ سجّلت مشاهدتك';
  };

  SL.videosHome = () => {
    if (!SL.me || (SL.isStaff && SL.isStaff())) return '';
    const l = vids(); if (!l.length) return '';
    const fresh = l.filter(v => !watched(v.id)), v = (fresh[0] || l[0]);
    return `<div class="card" style="padding:14px"><div class="row"><h3 class="grow" style="margin:0">🎬 الفيديوهات</h3><button class="btn sm sec" data-act="tab" data-t="videos">الكل (${N(l.length)})</button></div><div style="margin-top:6px">${row(v)}</div></div>`;
  };

  /* ---------- الإدارة ---------- */
  const watchers = id => { const s = new Set(), A = SL.allActs(); for (const k in A) { const e = ((A[k] || {}).z || {})['v_' + id]; if (e && e.done) s.add(A[k].sid); } return s.size; };
  const tVideos = () => {
    const all = (SL.cache.dhikr || []).filter(x => x.kind === 'video').sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const hasSt = !!(window.firebase && firebase.storage) && SL.cloud && SL.cloud.enabled;
    return `<div class="card"><h2 style="margin:0 0 10px;font-size:18px">🎬 إضافة فيديو</h2><div class="col">
      <input type="text" id="vTitle" placeholder="عنوان الفيديو" maxlength="100">
      <textarea id="vDesc" placeholder="وصف أو فائدة (اختياري)" style="min-height:60px"></textarea>
      <select id="vCat">${CATS.map(c => `<option>${E(c)}</option>`).join('')}</select>
      <input type="text" inputmode="url" id="vUrl" placeholder="رابط يوتيوب أو درايف أو ملف فيديو (https://…)" dir="ltr" style="text-align:left">
      <div class="muted small center">— أو —</div>
      <label class="btn sec" style="text-align:center;cursor:pointer">📤 رفع فيديو من الجهاز (حتى ${N(MAX_MB)} م.ب)<input type="file" id="vFile" accept="video/*" hidden></label>
      <div class="small muted" id="vFileName">${hasSt ? 'لم يُختر ملف.' : 'الرفع يحتاج إنترنت وتفعيل Firebase Storage — استخدم الرابط حالياً.'}</div>
      <div class="bar" id="vBar" style="display:none"><i style="width:0"></i></div>
      <button class="btn" data-act="vidPub" id="vPub">نشر الفيديو</button></div></div>
    <div class="card"><h3>الفيديوهات المنشورة (${N(all.length)})</h3><div class="col">${all.length ? all.map(v => `<div class="msg"><div class="meta"><b>${kindIcon(v)} ${E(v.title)}</b><span class="num">👁 ${N(watchers(v.id))}</span></div><div class="small muted">${E(v.cat || '')}${v.type === 'file' ? ' · مرفوع' : ''}</div><div class="row" style="margin-top:8px"><button class="btn sm sec" data-act="vidOpen" data-id="${E(v.id)}">معاينة</button><button class="btn sm sec" data-act="vidToggle" data-id="${E(v.id)}" data-v="${v.show === false ? 1 : 0}">${v.show === false ? 'إظهار' : 'إخفاء'}</button><button class="btn sm bad" data-act="vidDel" data-id="${E(v.id)}">حذف</button></div></div>`).join('') : '<div class="empty">لم تنشر فيديو بعد.</div>'}</div></div>`;
  };
  SL.afterRenderHooks = SL.afterRenderHooks || [];
  document.addEventListener('change', e => { if (e.target && e.target.id === 'vFile') { const f = e.target.files[0], n = $('#vFileName'); if (n) n.textContent = f ? `${f.name} — ${(f.size / 1048576).toFixed(1)} م.ب` : 'لم يُختر ملف.'; } });

  const save = (v) => { const id = SL.uid(), x = Object.assign({ kind: 'video', show: true, by: SL.me.name, ts: Date.now() }, v); SL.queue('dhikr', id, x, { merge: false }); SL.cache.dhikr = [Object.assign({ id }, x)].concat(SL.cache.dhikr || []); ui.toast('تم نشر الفيديو ✓'); SL.vCat = ''; SL.render(true); };
  SL.act.vidPub = () => {
    const title = val('vTitle'), url = val('vUrl'), f = ($('#vFile') || {}).files && $('#vFile').files[0], base = { title, desc: val('vDesc'), cat: val('vCat') };
    if (!title) return ui.toast('اكتب عنوان الفيديو');
    if (f) {
      if (!(window.firebase && firebase.storage) || !SL.cloud || !SL.cloud.enabled) return ui.toast('الرفع غير متاح الآن — استخدم الرابط');
      if (f.size > MAX_MB * 1048576) return ui.toast('الملف أكبر من ' + N(MAX_MB) + ' م.ب — استخدم رابط يوتيوب');
      if (!/^video\//.test(f.type)) return ui.toast('اختر ملف فيديو');
      const id = SL.uid(), path = `videos/${id}.${(f.name.split('.').pop() || 'mp4').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'mp4'}`, btn = $('#vPub'), bar = $('#vBar');
      btn.disabled = true; bar.style.display = ''; let task;
      try { task = firebase.app().storage().ref(path).put(f, { contentType: f.type }); } catch (e) { btn.disabled = false; return ui.toast('تعذّر بدء الرفع'); }
      task.on('state_changed', s => { const p = Math.round(s.bytesTransferred / s.totalBytes * 100); bar.firstElementChild.style.width = p + '%'; btn.textContent = `جارٍ الرفع ${N(p)}٪ — لا تغلق الصفحة`; },
        err => { btn.disabled = false; btn.textContent = 'نشر الفيديو'; bar.style.display = 'none'; ui.toast(/unauthorized|permission/i.test(err.code + err.message) ? 'الرفع مرفوض — راجع قواعد Storage' : 'فشل الرفع — تأكد من الإنترنت وتفعيل Storage'); },
        () => task.snapshot.ref.getDownloadURL().then(u => save(Object.assign(base, { url: u, type: 'file', path, size: f.size }))));
      return;
    }
    if (!safeUrl(url)) return ui.toast('الصق رابطاً صحيحاً يبدأ بـ https://');
    save(Object.assign(base, { url, type: 'link' }));
  };
  SL.act.vidToggle = el => { const show = el.dataset.v === '1'; SL.queue('dhikr', el.dataset.id, { show }); const x = (SL.cache.dhikr || []).find(y => y.id === el.dataset.id); if (x) x.show = show; SL.render(true); };
  SL.act.vidDel = el => {
    const x = (SL.cache.dhikr || []).find(y => y.id === el.dataset.id); if (!x || !confirm('حذف هذا الفيديو نهائياً؟')) return;
    SL.queueDelete('dhikr', x.id); SL.cache.dhikr = SL.cache.dhikr.filter(y => y.id !== x.id);
    if (x.path && window.firebase && firebase.storage) { try { firebase.app().storage().ref(x.path).delete().catch(() => {}); } catch (e) { } }
    SL.render(true);
  };
  (SL.xTabs = SL.xTabs || []).push(['videos', '🎬 الفيديوهات', tVideos]);
})(window.SL);

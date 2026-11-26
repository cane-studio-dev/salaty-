/* صلاتي — التحديات (تحددها الإدارة) + مسابقة السؤال اليومي + كروت الإنجاز للمشاركة */
(function (SL) {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const E = SL.esc, N = SL.n, ui = SL.ui;
  const isStaff = () => SL.isStaff && SL.isStaff();
  const items = k => (SL.cache.dhikr || []).filter(x => x.kind === k);
  const students = () => (SL.cache.users || []).filter(u => u.role !== 'admin' && u.role !== 'super');
  const val = id => (($('#' + id) || {}).value || '').trim();

  /* ================= التحديات ================= */
  const METRICS = {
    prayers: ['🕌', 'صلوات مسجّلة (أي صلاة)'], fajr: ['🌅', 'صلوات فجر'], mosque: ['🕌', 'صلوات في المسجد (صادقة)'],
    dhikr: ['📿', 'أذكار تسبيح مكتملة'], adhkar: ['🌤️', 'مجموعات أذكار مكتملة'], duas: ['🤲', 'أدعية مقروءة'],
    quran: ['📖', 'صفحات قرآن'], wird: ['📚', 'أيام إتمام الورد'], quiz: ['❓', 'إجابات صحيحة في المسابقة'], points: ['⭐', 'نقاط']
  };
  const chRange = c => ({ from: c.from, to: SL.dkey(SL.addDays(SL.fromKey(c.from), Math.max(1, +c.days || 7) - 1)) });
  const chStatus = c => { const r = chRange(c), t = SL.dkey(); return t < r.from ? 'soon' : t > r.to ? 'over' : 'on'; };
  const progress = (c, sid, D) => {
    const r = chRange(c), m = c.metric; let n = 0;
    if (m === 'points') { const a = SL.aggregateAll(D.days, D.acts, D.wirds, r.from, r.to).find(x => x.sid === sid); return a ? a.pts : 0; }
    for (const id in D.days) { const d = D.days[id]; if (!d || d.sid !== sid || d.date < r.from || d.date > r.to) continue; const p = d.p || {};
      if (m === 'prayers') n += Object.keys(p).length; else if (m === 'fajr') n += p.fajr ? 1 : 0; else if (m === 'mosque') for (const k in p) if (p[k] && p[k].where === 'mosque' && !p[k].sus) n++; }
    for (const id in D.acts) { const d = D.acts[id]; if (!d || d.sid !== sid || d.date < r.from || d.date > r.to) continue; const z = d.z || {};
      for (const k in z) { const e = z[k] || {}, c0 = k.charAt(0);
        if (m === 'dhikr' && c0 === 't' && e.done) n++; else if (m === 'adhkar' && c0 === 'a' && e.done) n++; else if (m === 'duas' && (k === 'u')) n += e.n || 0;
        else if (m === 'quran' && k === 'q') n += e.n || 0; else if (m === 'quiz' && k === 'k_quiz' && e.ok) n++; } }
    if (m === 'wird') for (const id in D.wirds) { const d = D.wirds[id]; if (d && d.sid === sid && d.date >= r.from && d.date <= r.to) n++; }
    return n;
  };
  const data = () => ({ days: SL.allDays(), acts: SL.allActs(), wirds: SL.allWird() });
  const completions = (c, D) => { const out = []; for (const id in D.acts) { const d = D.acts[id], e = d && d.z && d.z['c_' + c.id]; if (e && e.done) out.push({ sid: d.sid, name: d.name, ts: e.done }); } const seen = {}; return out.sort((a, b) => a.ts - b.ts).filter(x => seen[x.sid] ? false : (seen[x.sid] = 1)); };
  const medal = i => ['🥇', '🥈', '🥉'][i] || '✓';

  // الطالب: تسجيل إنجاز التحدي تلقائياً وإبلاغ الإدارة (عبر acts)
  const autoComplete = () => {
    if (!SL.me || SL.demo || isStaff()) return; const D = data();
    items('challenge').filter(c => c.show !== false && c.from && chStatus(c) !== 'soon').forEach(c => {
      const done = completions(c, D).some(x => x.sid === SL.me.sid); if (done) return;
      if (progress(c, SL.me.sid, D) >= (+c.target || 1)) {
        SL.actSet('c_' + c.id, { n: +c.target, g: +c.target, ts: Date.now(), done: Date.now(), title: c.title }); try { SL.sound.play('wird'); } catch (e) {}
        ui.toast(`🎉 أنجزت تحدي «${c.title}»! تم إبلاغ الإدارة`, 6000); SL._chalJustDone = c.id;
      }
    });
  };
  const chCard = c => {
    const me = SL.me, D = data(), st = chStatus(c), r = chRange(c), t = Math.max(1, +c.target || 1), p = Math.min(t, progress(c, me.sid, D)), done = completions(c, D).some(x => x.sid === me.sid) || p >= t;
    const left = Math.max(0, Math.round((SL.fromKey(r.to) - SL.fromKey(SL.dkey())) / 864e5) + 1), M = METRICS[c.metric] || ['🎯', ''];
    return `<div class="card chal"><div class="row" style="margin-bottom:6px"><h3 class="grow" style="margin:0">🎯 ${E(c.title)}</h3>${done ? '<span class="badge ok">✓ أنجزت</span>' : st === 'soon' ? '<span class="badge">قريباً</span>' : st === 'over' ? '<span class="badge bad">انتهى</span>' : `<span class="badge acc">باقي ${N(left)} ${left === 1 ? 'يوم' : left === 2 ? 'يومان' : 'أيام'}</span>`}</div>
      ${c.text ? `<div class="small" style="white-space:pre-wrap;line-height:1.8;margin-bottom:8px">${E(c.text)}</div>` : ''}
      <div class="small muted" style="margin-bottom:6px">${M[0]} الهدف: ${N(t)} ${E(M[1])} · من ${SL.fmtShort(r.from)} إلى ${SL.fmtShort(r.to)}</div>
      <div class="bar"><i style="width:${Math.round(p / t * 100)}%"></i></div><div class="small" style="margin-top:6px"><b class="num">${N(p)}/${N(t)}</b>${c.prize ? ` · 🎁 الجائزة: <b>${E(c.prize)}</b>` : ''}</div>
      ${done ? '<button class="btn sec block" style="margin-top:10px" data-act="shareCard" data-k="chal" data-i="' + E(c.id) + '">🖼️ شارك إنجازك</button>' : ''}</div>`;
  };

  /* ================= مسابقة السؤال اليومي ================= */
  const BANK = [
    ['كم عدد أركان الإسلام؟', ['٣', '٤', '٥', '٦'], 2], ['كم عدد الصلوات المفروضة في اليوم والليلة؟', ['٣', '٤', '٥', '٦'], 2],
    ['ما أول سورة في المصحف الشريف؟', ['البقرة', 'الفاتحة', 'الإخلاص', 'الناس'], 1], ['ما آخر سورة في المصحف الشريف؟', ['الفلق', 'الإخلاص', 'الناس', 'المسد'], 2],
    ['كم عدد سور القرآن الكريم؟', ['١١٠', '١١٤', '١٢٠', '١٠٠'], 1], ['ما أطول سورة في القرآن؟', ['آل عمران', 'النساء', 'البقرة', 'الأعراف'], 2],
    ['ما أقصر سورة في القرآن؟', ['الكوثر', 'الإخلاص', 'العصر', 'النصر'], 0], ['في أي شهر فُرض الصيام؟', ['رجب', 'شعبان', 'رمضان', 'شوال'], 2],
    ['ما الصلاة التي عدد ركعاتها ركعتان من الفرائض؟', ['الظهر', 'العصر', 'الفجر', 'العشاء'], 2], ['كم عدد ركعات صلاة المغرب؟', ['٢', '٣', '٤', '٥'], 1],
    ['من هو أول المؤذنين في الإسلام؟', ['بلال بن رباح', 'عمر بن الخطاب', 'أبو بكر الصديق', 'علي بن أبي طالب'], 0], ['ما اسم الغار الذي نزل فيه الوحي أول مرة؟', ['ثور', 'حراء', 'أُحد', 'النور'], 1],
    ['من هو أول الخلفاء الراشدين؟', ['عمر بن الخطاب', 'عثمان بن عفان', 'أبو بكر الصديق', 'علي بن أبي طالب'], 2], ['ما اسم الملك الموكَّل بالوحي؟', ['ميكائيل', 'إسرافيل', 'جبريل', 'مالك'], 2],
    ['في أي مدينة وُلد النبي ﷺ؟', ['المدينة المنورة', 'مكة المكرمة', 'الطائف', 'القدس'], 1], ['إلى أي مدينة هاجر النبي ﷺ؟', ['الطائف', 'القدس', 'المدينة المنورة', 'الحبشة'], 2],
    ['ما الاسم الذي يُسمّى به الأذان للصلاة الثانية بعد الأذان؟', ['التسليم', 'الإقامة', 'التكبير', 'التلبية'], 1], ['كم عدد الأنبياء المذكورين بأسمائهم في القرآن؟', ['٢٥', '٢٠', '٣٠', '١٥'], 0],
    ['من هو خليل الله؟', ['موسى عليه السلام', 'إبراهيم عليه السلام', 'عيسى عليه السلام', 'نوح عليه السلام'], 1], ['من هو كليم الله؟', ['موسى عليه السلام', 'إبراهيم عليه السلام', 'يوسف عليه السلام', 'داود عليه السلام'], 0],
    ['ما السورة التي تُسمّى قلب القرآن؟', ['الكهف', 'يس', 'الرحمن', 'الملك'], 1], ['ما السورة التي تعدل ثلث القرآن؟', ['الفاتحة', 'الإخلاص', 'الكافرون', 'الفلق'], 1],
    ['ما اسم السورة التي تُقرأ يوم الجمعة وتُنوِّر لقارئها؟', ['الكهف', 'البقرة', 'الملك', 'يس'], 0], ['كم عدد أجزاء القرآن الكريم؟', ['٢٠', '٣٠', '٤٠', '٦٠'], 1],
    ['ما هي القبلة التي يتجه إليها المسلمون في الصلاة؟', ['المسجد الأقصى', 'الكعبة المشرفة', 'المسجد النبوي', 'جبل عرفات'], 1], ['ما الركن الذي يُؤدّى مرة في العمر لمن استطاع؟', ['الصيام', 'الزكاة', 'الحج', 'الصلاة'], 2],
    ['ماذا نقول عند بدء الأكل؟', ['الحمد لله', 'بسم الله', 'سبحان الله', 'الله أكبر'], 1], ['ماذا نقول بعد الانتهاء من الأكل؟', ['بسم الله', 'الحمد لله', 'لا إله إلا الله', 'أستغفر الله'], 1],
    ['ماذا نقول عند العطاس؟', ['سبحان الله', 'الحمد لله', 'بسم الله', 'الله أكبر'], 1], ['ماذا يقول من سمع العاطس يحمد الله؟', ['يرحمك الله', 'بارك الله فيك', 'جزاك الله خيراً', 'لا شيء'], 0],
    ['ما اسم أول بيت وُضع للناس في الأرض للعبادة؟', ['المسجد الأقصى', 'الكعبة', 'المسجد النبوي', 'مسجد قباء'], 1], ['من هو الصحابي الذي لُقِّب بسيف الله المسلول؟', ['خالد بن الوليد', 'عمر بن الخطاب', 'حمزة بن عبد المطلب', 'سعد بن أبي وقاص'], 0],
    ['ما اسم ناقة النبي ﷺ في الهجرة؟', ['القصواء', 'العضباء', 'الجدعاء', 'البراق'], 0], ['من هو أول من أسلم من الرجال؟', ['عمر بن الخطاب', 'أبو بكر الصديق', 'عثمان بن عفان', 'الزبير بن العوام'], 1],
    ['من هي أول من آمنت برسول الله ﷺ؟', ['عائشة', 'خديجة رضي الله عنها', 'فاطمة', 'حفصة'], 1], ['ما هي الغزوة التي كانت أول معركة كبرى في الإسلام؟', ['أُحد', 'بدر', 'الخندق', 'حنين'], 1],
    ['كم عدد أيام شهر رمضان تقريباً؟', ['٢٨ أو ٢٩', '٢٩ أو ٣٠', '٣٠ أو ٣١', '٢٧ فقط'], 1], ['ما اسم ليلة نزول القرآن؟', ['ليلة الإسراء', 'ليلة القدر', 'ليلة النصف من شعبان', 'ليلة عاشوراء'], 1],
    ['ما اسم الصلاة التي تُؤدّى يوم الجمعة بدل الظهر؟', ['الجمعة', 'التراويح', 'الضحى', 'الوتر'], 0], ['ما حكم الوضوء قبل الصلاة؟', ['سنّة فقط', 'شرط لصحتها', 'مكروه', 'مباح'], 1],
    ['ما معنى «الله أكبر»؟', ['الله عظيم فقط', 'الله أعظم من كل شيء', 'الله واحد', 'الله رحيم'], 1], ['ما الدعاء الذي يُقال دخول المسجد؟', ['اللهم افتح لي أبواب رحمتك', 'اللهم إني أعوذ بك من الفقر', 'ربنا آتنا في الدنيا حسنة', 'سبحان ربي العظيم'], 0],
    ['ما التسبيح الذي يُقال في الركوع؟', ['سبحان ربي الأعلى', 'سبحان ربي العظيم', 'ربنا ولك الحمد', 'رب اغفر لي'], 1], ['ما التسبيح الذي يُقال في السجود؟', ['سبحان ربي الأعلى', 'سبحان ربي العظيم', 'الله أكبر', 'السلام عليكم'], 0],
    ['ما اسم الأذان الثاني الذي يسبق صلاة الفجر عند بعض الناس؟', ['الأذان الأول', 'الإقامة', 'التسبيح', 'التبليغ'], 0], ['أي هذه الصلوات سرّية (لا يُجهر فيها بالقراءة)؟', ['الفجر', 'المغرب', 'الظهر', 'العشاء'], 2],
    ['كم عدد ركعات صلاة العشاء؟', ['٢', '٣', '٤', '٥'], 2], ['كم عدد ركعات صلاة العصر؟', ['٢', '٣', '٤', '٦'], 2],
    ['ما هو الشهر الذي يلي رمضان؟', ['شعبان', 'شوال', 'ذو القعدة', 'محرم'], 1], ['في أي شهر يكون الحج؟', ['رمضان', 'ذو الحجة', 'محرم', 'رجب'], 1],
    ['ما الاسم الآخر ليوم عرفة؟', ['يوم التروية', 'يوم الحج الأكبر', 'يوم النحر', 'يوم عاشوراء'], 1], ['ما أفضل الذكر؟', ['لا إله إلا الله', 'سبحان الله', 'الحمد لله', 'الله أكبر'], 0],
    ['ما معنى «بسم الله الرحمن الرحيم»؟', ['أبدأ باسم الله المتصف بالرحمة', 'الله أكبر', 'لا إله إلا الله', 'الحمد لله رب العالمين'], 0], ['كم عدد أبواب الجنة؟', ['٤', '٦', '٨', '١٠'], 2],
    ['ما اسم الباب الذي يدخل منه الصائمون الجنة؟', ['باب الصلاة', 'باب الريان', 'باب الجهاد', 'باب الصدقة'], 1], ['ما هي الزكاة؟', ['صلاة', 'صيام', 'حق مالي واجب للفقراء ومن في حكمهم', 'ذكر'], 2],
    ['من هو النبي الذي ابتلعه الحوت؟', ['يونس عليه السلام', 'أيوب عليه السلام', 'يعقوب عليه السلام', 'إدريس عليه السلام'], 0], ['من هو النبي الذي صبر على المرض؟', ['أيوب عليه السلام', 'نوح عليه السلام', 'هود عليه السلام', 'صالح عليه السلام'], 0],
    ['ما اسم السورة التي فيها قصة أصحاب الكهف؟', ['الكهف', 'مريم', 'يوسف', 'الأنبياء'], 0], ['ما اسم السورة التي فيها قصة سيدنا يوسف؟', ['هود', 'يوسف', 'القصص', 'الأعراف'], 1],
    ['من هو الصحابي الملقب بالفاروق؟', ['أبو بكر', 'عمر بن الخطاب', 'عثمان', 'علي'], 1], ['من هو ذو النورين؟', ['علي بن أبي طالب', 'عثمان بن عفان', 'الزبير', 'طلحة'], 1],
    ['ما اسم الصحابي المبشَّر بالجنة وهو أمين هذه الأمة؟', ['أبو عبيدة بن الجراح', 'سعد بن معاذ', 'أنس بن مالك', 'أبو هريرة'], 0], ['ما الصلاة التي لا ركوع فيها ولا سجود؟', ['صلاة الجنازة', 'صلاة الوتر', 'صلاة الضحى', 'صلاة التراويح'], 0]
  ];
  const todayQ = () => {
    const t = SL.dkey(), staff = items('quiz').filter(q => q.show !== false && q.opts && q.opts.length > 1 && q.qdate === t)[0];
    if (staff) return { id: 's_' + staff.id, q: staff.title, opts: staff.opts, ans: +staff.ans, staff: true };
    const n = SL.daysBetween(new Date(2024, 0, 1), new Date()), i = ((n * 7) % BANK.length + BANK.length) % BANK.length, b = BANK[i];
    return { id: 'b' + i, q: b[0], opts: b[1], ans: b[2] };
  };
  const quizCard = () => {
    const q = todayQ(), e = SL.actGet().k_quiz, ans = e && e.qid === q.id ? e : null;
    return `<div class="card" style="padding:14px"><div class="row" style="margin-bottom:8px"><h3 class="grow" style="margin:0">❓ سؤال اليوم</h3>${ans ? `<span class="badge ${ans.ok ? 'ok' : 'bad'}">${ans.ok ? '✓ إجابة صحيحة +٥' : 'إجابة خاطئة'}</span>` : '<span class="badge acc">+٥ نقاط</span>'}</div>
      <div style="font-size:18px;line-height:1.9;font-weight:700;margin-bottom:10px">${E(q.q)}</div>
      <div class="col">${q.opts.map((o, i) => `<button class="btn ${ans ? (i === q.ans ? '' : ans.pick === i ? 'bad' : 'sec') : 'sec'}" ${ans ? 'disabled' : `data-act="quizPick" data-i="${i}"`} style="text-align:right">${E(o)}${ans && i === q.ans ? ' ✓' : ''}</button>`).join('')}</div>
      ${ans ? `<div class="small muted" style="margin-top:8px">الإجابة الصحيحة: <b>${E(q.opts[q.ans])}</b>. سؤال جديد غداً بإذن الله.</div>` : ''}</div>`;
  };
  SL.act.quizPick = el => {
    const q = todayQ(), pick = +el.dataset.i; if ((SL.actGet().k_quiz || {}).qid === q.id) return; const ok = pick === q.ans, t = Date.now();
    SL.actSet('k_quiz', { n: 1, g: 1, qid: q.id, pick, ok, ts: t, done: t, title: q.q });
    try { SL.sound.play(ok ? 'wird' : 'tick'); } catch (e) {} ui.toast(ok ? 'أحسنت! إجابة صحيحة 🎉' : 'إجابة خاطئة — حاول غداً 🤍'); SL.render(true);
  };

  /* ================= كروت الإنجاز للمشاركة ================= */
  const wrap = (ctx, text, maxW) => { const words = String(text).split(' '), lines = []; let cur = ''; for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; } if (cur) lines.push(cur); return lines; };
  const cardData = (kind, id) => {
    const me = SL.me, D = data(), t = SL.dkey(), mine = x => x.sid === me.sid;
    if (kind === 'chal') { const c = items('challenge').find(x => x.id === id) || {}; return { big: '🎯', title: 'أنجزت التحدي!', main: c.title || '', lines: [c.prize ? '🎁 ' + c.prize : ''] }; }
    if (kind === 'rank') { const cr = SL.cycleRange(SL.cycleOf(new Date())), L = SL.aggregateAll(D.days, D.acts, D.wirds, cr.from, cr.to), i = L.findIndex(mine); return { big: '🏆', title: 'ترتيبي في لوحة الشرف', main: i >= 0 ? `المركز ${N(i + 1)} من ${N(L.length)}` : 'ابدأ رحلتك', lines: [i >= 0 ? `${N(L[i].pts)} نقطة في هذه الدورة` : '', 'الدورة: ' + SL.fmtShort(cr.from) + ' – ' + SL.fmtShort(cr.to)] }; }
    const a = SL.aggregateAll(D.days, D.acts, D.wirds, t, t).find(mine) || { pts: 0, cnt: 0, dh: 0, ad: 0, du: 0, qr: 0 };
    return { big: '🌙', title: 'إنجازي اليوم', main: `${N(a.cnt)} من ٥ صلوات`, lines: [`⭐ ${N(a.pts)} نقطة`, `📿 ${N(a.dh)} تسبيح · 🌤️ ${N(a.ad)} أذكار · 🤲 ${N(a.du)} دعاء`, a.qr ? `📖 ${N(a.qr)} صفحة قرآن` : ''] };
  };
  const drawCard = async (d, name) => {
    try { await document.fonts.load('700 60px Tajawal'); await document.fonts.load('700 60px "Amiri Quran"'); } catch (e) {}
    const W = 1080, H = 1350, c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
    const g = x.createLinearGradient(0, 0, W * .4, H); g.addColorStop(0, '#0f6b50'); g.addColorStop(.6, '#0a3f31'); g.addColorStop(1, '#062a21'); x.fillStyle = g; x.fillRect(0, 0, W, H);
    const r = x.createRadialGradient(W * .85, 0, 0, W * .85, 0, 700); r.addColorStop(0, 'rgba(226,194,106,.35)'); r.addColorStop(1, 'rgba(226,194,106,0)'); x.fillStyle = r; x.fillRect(0, 0, W, H);
    x.strokeStyle = '#e2c26a'; x.lineWidth = 6; x.strokeRect(40, 40, W - 80, H - 80); x.lineWidth = 2; x.strokeRect(58, 58, W - 116, H - 116);
    x.direction = 'rtl'; x.textAlign = 'center'; x.fillStyle = '#fff';
    x.font = '700 230px Tajawal, sans-serif'; x.fillText(d.big, W / 2, 360);
    x.font = '700 70px Tajawal, sans-serif'; x.fillStyle = '#e2c26a'; x.fillText(d.title, W / 2, 500);
    x.fillStyle = '#fff'; x.font = '700 92px Tajawal, sans-serif'; let y = 650; wrap(x, d.main, W - 200).slice(0, 3).forEach(l => { x.fillText(l, W / 2, y); y += 118; });
    x.font = '500 54px Tajawal, sans-serif'; x.fillStyle = '#e8f2ec'; y += 30; d.lines.filter(Boolean).forEach(l => { wrap(x, l, W - 200).slice(0, 2).forEach(s => { x.fillText(s, W / 2, y); y += 78; }); });
    x.fillStyle = '#e2c26a'; x.font = '700 56px Tajawal, sans-serif'; x.fillText(name, W / 2, H - 270);
    x.fillStyle = '#e8f2ec'; x.font = '500 38px Tajawal, sans-serif'; x.fillText('صلاتي — رفيقك في الصلاة والأذكار والورد', W / 2, H - 190);
    x.strokeStyle = 'rgba(226,194,106,.6)'; x.lineWidth = 2; x.beginPath(); x.moveTo(W / 2 - 260, H - 160); x.lineTo(W / 2 + 260, H - 160); x.stroke();
    x.fillStyle = '#e2c26a'; x.font = '700 46px Tajawal, sans-serif'; x.fillText('تحت إدارة مبادرة أشبال الفجر', W / 2, H - 100);
    return c;
  };
  SL.act.shareCard = async el => {
    const kind = el.dataset.k || 'today', id = el.dataset.i || '';
    ui.toast('جارٍ تجهيز الكارت…', 1200); const d = cardData(kind, id), c = await drawCard(d, SL.me.name);
    ui.sheet(`<h2 style="margin:0 0 10px">🖼️ كارت الإنجاز</h2><img id="shImg" style="width:100%;border-radius:14px;margin-bottom:12px" alt=""><div class="col"><button class="btn" id="shGo">📤 مشاركة</button><button class="btn sec" id="shSave">⬇️ حفظ الصورة</button></div>`);
    c.toBlob(b => {
      const url = URL.createObjectURL(b), file = new File([b], 'salaty-card.png', { type: 'image/png' }); $('#shImg').src = url;
      $('#shSave').onclick = () => { const a = document.createElement('a'); a.href = url; a.download = 'salaty-card.png'; document.body.appendChild(a); a.click(); a.remove(); };
      $('#shGo').onclick = async () => { try { if (navigator.canShare && navigator.canShare({ files: [file] })) await navigator.share({ files: [file], text: 'من تطبيق صلاتي 🤍' }); else $('#shSave').click(); } catch (e) {} };
    }, 'image/png');
  };

  /* ================= واجهة الطالب ================= */
  SL.extrasHome = () => {
    if (!SL.me || isStaff()) return ''; try { autoComplete(); } catch (e) {}
    const ch = items('challenge').filter(c => c.show !== false && c.from && chStatus(c) !== 'over').sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 3);
    return ch.map(chCard).join('') + quizCard() + `<div class="card" style="padding:14px"><div class="row"><h3 class="grow" style="margin:0">🖼️ شارك إنجازك</h3></div><div class="row" style="margin-top:10px"><button class="btn sec grow" data-act="shareCard" data-k="today">إنجاز اليوم</button><button class="btn sec grow" data-act="shareCard" data-k="rank">ترتيبي</button></div></div>`;
  };

  /* ================= لوحة الإدارة ================= */
  const today = () => SL.dkey();
  const tChal = () => {
    const D = data(), us = students(), list = items('challenge').sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const mopts = Object.keys(METRICS).map(k => `<option value="${k}">${METRICS[k][0]} ${METRICS[k][1]}</option>`).join('');
    return `<div class="card"><h2 style="margin:0 0 10px;font-size:18px">🎯 تحدٍّ جديد</h2><div class="col">
      <input type="text" id="cTitle" placeholder="عنوان التحدي (مثال: تحدي الفجر في المسجد)" maxlength="80">
      <textarea id="cText" placeholder="التفاصيل والشروط…" style="min-height:70px"></textarea>
      <label class="f">نوع الهدف<select id="cMetric">${mopts}</select></label>
      <div class="row"><label class="f grow">العدد المطلوب<input type="number" id="cTarget" value="5" min="1" max="1000" inputmode="numeric"></label><label class="f grow">المدة (أيام)<input type="number" id="cDays" value="7" min="1" max="14" inputmode="numeric"></label></div>
      <label class="f">يبدأ في<input type="date" id="cFrom" value="${today()}"></label>
      <input type="text" id="cPrize" placeholder="الجائزة (اختياري)" maxlength="80">
      <button class="btn" data-act="chalPub">نشر التحدي</button><div class="hint">أقصى مدة ١٤ يوماً. التطبيق يتابع تقدّم كل طالب تلقائياً ويبلغك لحظة إنجازه.</div></div></div>
    ${list.length ? list.map(c => { const done = completions(c, D), st = chStatus(c), r = chRange(c), t = Math.max(1, +c.target || 1), M = METRICS[c.metric] || ['🎯', '']; const rows = us.map(u => ({ u, p: progress(c, u.sid, D) })).sort((a, b) => b.p - a.p);
      return `<div class="card"><div class="row"><h3 class="grow" style="margin:0">🎯 ${E(c.title)}</h3><span class="badge ${st === 'on' ? 'acc' : ''}">${st === 'on' ? 'جاري' : st === 'soon' ? 'قادم' : 'انتهى'}</span></div>
      <div class="small muted" style="margin:6px 0">${M[0]} ${N(t)} ${E(M[1])} · ${SL.fmtShort(r.from)} – ${SL.fmtShort(r.to)}${c.prize ? ' · 🎁 ' + E(c.prize) : ''}</div>
      <div class="hint" style="margin:8px 0 4px"><b>أنجزوا التحدي (${N(done.length)} من ${N(us.length)})</b></div>${done.length ? done.map((x, i) => `<div class="setrow"><span>${medal(i)} ${E(x.name)}</span><span class="muted small num">${SL.fmtShort(SL.dkey(new Date(x.ts)))} ${SL.fmtTime(x.ts)}</span></div>`).join('') : '<div class="muted small">لم ينجزه أحد بعد.</div>'}
      <div class="hint" style="margin:10px 0 4px"><b>تقدّم الطلاب</b></div><div class="scroll"><table class="tbl"><tbody>${rows.map(r2 => `<tr><td>${E(r2.u.name)}</td><td style="width:45%"><div class="bar"><i style="width:${Math.min(100, Math.round(r2.p / t * 100))}%"></i></div></td><td class="num">${N(Math.min(r2.p, t))}/${N(t)}</td></tr>`).join('')}</tbody></table></div>
      <div class="row" style="margin-top:10px"><button class="btn sm sec" data-act="chalToggle" data-i="${E(c.id)}" data-v="${c.show === false ? 1 : 0}">${c.show === false ? 'إظهار' : 'إخفاء'}</button><button class="btn sm bad" data-act="itemDel" data-i="${E(c.id)}">حذف</button></div></div>`; }).join('') : '<div class="card"><div class="empty">لا توجد تحديات بعد.</div></div>'}`;
  };
  SL.act.chalPub = () => {
    const title = val('cTitle'); if (!title) return ui.toast('اكتب عنوان التحدي');
    const c = { kind: 'challenge', title, text: val('cText'), metric: val('cMetric') || 'prayers', target: Math.max(1, parseInt(SL.latinDigits(val('cTarget'))) || 5), days: Math.max(1, Math.min(14, parseInt(SL.latinDigits(val('cDays'))) || 7)), from: val('cFrom') || today(), prize: val('cPrize'), show: true, by: SL.me.name, ts: Date.now() };
    const id = SL.uid(); SL.queue('dhikr', id, c, { merge: false }); SL.cache.dhikr = [Object.assign({ id }, c)].concat(SL.cache.dhikr || []); ui.toast('تم نشر التحدي ✓ — ظهر لكل الطلاب'); SL.render(true);
  };
  SL.act.chalToggle = el => { const show = el.dataset.v === '1'; SL.queue('dhikr', el.dataset.i, { show }); const x = (SL.cache.dhikr || []).find(y => y.id === el.dataset.i); if (x) x.show = show; SL.render(true); };
  SL.act.itemDel = async el => { if (!await ui.confirm('حذف نهائياً؟', 'حذف', true)) return; SL.queueDelete('dhikr', el.dataset.i); SL.cache.dhikr = (SL.cache.dhikr || []).filter(y => y.id !== el.dataset.i); SL.render(true); };

  const tQuiz = () => {
    const us = students(), D = data(), t = today(), q = todayQ(), staffQ = items('quiz').sort((a, b) => (b.ts || 0) - (a.ts || 0));
    const answers = us.map(u => { const d = D.acts[`${u.sid}_${t}`], e = d && d.z && d.z.k_quiz; return { u, e: e && e.qid === q.id ? e : null }; });
    const ok = answers.filter(a => a.e && a.e.ok).length, bad = answers.filter(a => a.e && !a.e.ok).length;
    return `<div class="card"><h2 style="margin:0 0 8px;font-size:18px">❓ سؤال اليوم</h2><div style="font-size:17px;line-height:1.8;font-weight:700">${E(q.q)}</div><div class="small muted" style="margin:6px 0">الإجابة: ${E(q.opts[q.ans])} ${q.staff ? '· من إضافتك' : '· من بنك الأسئلة'}</div>
      <div class="row" style="gap:8px"><span class="badge ok">✓ ${N(ok)} صحيحة</span><span class="badge bad">✗ ${N(bad)} خاطئة</span><span class="badge">${N(us.length - ok - bad)} لم يجيبوا</span></div>
      <div class="scroll" style="margin-top:10px"><table class="tbl"><tbody>${answers.map(a => `<tr><td>${E(a.u.name)}</td><td>${a.e ? (a.e.ok ? '✓ صحيحة' : '✗ ' + E(q.opts[a.e.pick] || '')) : '–'}</td></tr>`).join('')}</tbody></table></div></div>
    <div class="card"><h2 style="margin:0 0 10px;font-size:18px">➕ سؤال من عندك</h2><div class="col">
      <input type="text" id="qQ" placeholder="نص السؤال" maxlength="160">${[0, 1, 2, 3].map(i => `<input type="text" id="qO${i}" placeholder="الاختيار ${N(i + 1)}${i < 2 ? '' : ' (اختياري)'}" maxlength="80">`).join('')}
      <label class="f">الإجابة الصحيحة<select id="qA"><option value="0">الاختيار ١</option><option value="1">الاختيار ٢</option><option value="2">الاختيار ٣</option><option value="3">الاختيار ٤</option></select></label>
      <label class="f">يظهر يوم<input type="date" id="qD" value="${t}" min="${t}"></label><button class="btn" data-act="quizPub">نشر السؤال</button></div></div>
    <div class="card"><h3>أسئلتك (${N(staffQ.length)})</h3><div class="col">${staffQ.length ? staffQ.map(x => `<div class="msg"><div class="meta"><b>${E(x.title)}</b><span class="num">${E(x.qdate || '')}</span></div><div class="small muted">✓ ${E((x.opts || [])[x.ans] || '')}</div><div class="row" style="margin-top:8px"><button class="btn sm bad" data-act="itemDel" data-i="${E(x.id)}">حذف</button></div></div>`).join('') : '<div class="empty">لم تضف أسئلة. يظهر سؤال تلقائي من البنك كل يوم.</div>'}</div></div>`;
  };
  SL.act.quizPub = () => {
    const title = val('qQ'), opts = [0, 1, 2, 3].map(i => val('qO' + i)).filter(Boolean), ans = +val('qA'); if (!title || opts.length < 2) return ui.toast('اكتب السؤال واختيارين على الأقل');
    const real = [0, 1, 2, 3].map(i => val('qO' + i)); const ai = opts.indexOf(real[ans]); if (!real[ans]) return ui.toast('الإجابة الصحيحة لازم تكون اختيار مكتوب');
    const q = { kind: 'quiz', title, opts, ans: ai, qdate: val('qD') || today(), show: true, by: SL.me.name, ts: Date.now() }, id = SL.uid();
    SL.queue('dhikr', id, q, { merge: false }); SL.cache.dhikr = [Object.assign({ id }, q)].concat(SL.cache.dhikr || []); ui.toast('تم نشر السؤال ✓'); SL.render(true);
  };
  SL.xTabs = [['chal', '🎯 التحديات', tChal], ['quiz', '❓ المسابقة', tQuiz]];

  // إبلاغ الإدارة لحظياً عند إنجاز أي طالب لتحدٍّ
  SL.on('data', () => {
    if (!isStaff()) return; const D = data(), seen = SL.load('chalSeen', null), now = {}, fresh = [];
    items('challenge').forEach(c => completions(c, D).forEach(x => { const k = x.sid + '_' + c.id; now[k] = 1; if (seen && !seen[k]) fresh.push(`${x.name} — ${c.title}`); }));
    if (!seen) { SL.save('chalSeen', now); return; }
    if (fresh.length) { SL.save('chalSeen', Object.assign({}, seen, now)); ui.toast('🎯 أنجز تحدياً: ' + fresh.slice(0, 2).join('، ') + (fresh.length > 2 ? ` +${N(fresh.length - 2)}` : ''), 7000); try { SL.sound.play('wird'); } catch (e) {} if (SL.tab === 'admin' && (SL.aTab === 'chal')) SL.render(true); }
  });
})(window.SL);

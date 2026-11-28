/* صلاتي — السنن والنوافل + الأعمال الصالحة اليومية + فضل ما تفعله */
(function (SL) {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const E = SL.esc, N = SL.n, ui = SL.ui;
  const isStaff = () => SL.isStaff && SL.isStaff();
  const val = id => (($('#' + id) || {}).value || '').trim();

  const SUNAN = [
    { id: 'fajr2', t: 'ركعتا سنة الفجر', i: '🌅', v: '«ركعتا الفجر خير من الدنيا وما فيها» — رواه مسلم' },
    { id: 'duha', t: 'صلاة الضحى', i: '☀️', v: '«ويجزئ من ذلك ركعتان يركعهما من الضحى» (عن صدقات المفاصل) — رواه مسلم' },
    { id: 'rawatib', t: 'السنن الرواتب (١٢ ركعة)', i: '🕌', v: '«إلا بنى الله له بيتاً في الجنة» — رواه مسلم' },
    { id: 'tahiya', t: 'تحية المسجد', i: '🚪', v: '«فلا يجلس حتى يصلي ركعتين» — متفق عليه' },
    { id: 'qiyam', t: 'قيام الليل', i: '✨', v: '«أفضل الصلاة بعد الفريضة صلاة الليل» — رواه مسلم' },
    { id: 'witr', t: 'صلاة الوتر', i: '🌙', v: '«يا أهل القرآن أوتروا فإن الله وتر يحب الوتر» — رواه الترمذي' },
    { id: 'sawm', t: 'صيام نافلة (الإثنين والخميس)', i: '🌿', v: '«تُعرض الأعمال يوم الاثنين والخميس فأحب أن يُعرض عملي وأنا صائم» — رواه الترمذي' }
  ];
  const DEEDS = [
    { id: 'bar', t: 'بر الوالدين', i: '👨‍👩‍👦', v: '«أحب الأعمال إلى الله الصلاة على وقتها، ثم بر الوالدين» — متفق عليه' },
    { id: 'sadaqa', t: 'صدقة ولو بالقليل', i: '💰', v: '«اتقوا النار ولو بشق تمرة» — متفق عليه' },
    { id: 'rahim', t: 'صلة الرحم', i: '🤝', v: '«من أحب أن يُبسط له في رزقه ويُنسأ له في أثره فليصل رحمه» — متفق عليه' },
    { id: 'salam', t: 'إفشاء السلام', i: '👋', v: '«أفشوا السلام بينكم» — رواه مسلم' },
    { id: 'smile', t: 'ابتسامة في وجه أخيك', i: '😊', v: '«تبسمك في وجه أخيك لك صدقة» — رواه الترمذي' },
    { id: 'kind', t: 'كلمة طيبة', i: '💬', v: '«والكلمة الطيبة صدقة» — متفق عليه' },
    { id: 'help', t: 'مساعدة محتاج', i: '🫶', v: '«والله في عون العبد ما كان العبد في عون أخيه» — رواه مسلم' },
    { id: 'feed', t: 'إطعام أو سقيا', i: '🥤', v: '«أي الإسلام خير؟ تطعم الطعام وتقرأ السلام» — متفق عليه' },
    { id: 'tongue', t: 'حفظ اللسان', i: '🤐', v: '«من كان يؤمن بالله واليوم الآخر فليقل خيراً أو ليصمت» — متفق عليه' },
    { id: 'path', t: 'إماطة الأذى عن الطريق', i: '🛣️', v: '«وأدناها إماطة الأذى عن الطريق» — رواه مسلم' }
  ];
  const AVOID = [
    { id: 'eye', t: 'غضضتُ بصري', i: '👁️', v: '﴿قُلْ لِلْمُؤْمِنِينَ يَغُضُّوا مِنْ أَبْصَارِهِمْ﴾ — النور ٣٠' },
    { id: 'gheeba', t: 'حفظتُ لساني عن الغيبة والنميمة', i: '🤫', v: '﴿وَلَا يَغْتَب بَّعْضُكُم بَعْضًا﴾ — الحجرات ١٢' },
    { id: 'sidq', t: 'صدقتُ ولم أكذب', i: '✅', v: '«عليكم بالصدق فإن الصدق يهدي إلى البر، وإن البر يهدي إلى الجنة» — متفق عليه' },
    { id: 'ghaD', t: 'كظمتُ غيظي ولم أُؤذِ أحداً', i: '🌿', v: '«ليس الشديد بالصرعة، إنما الشديد الذي يملك نفسه عند الغضب» — متفق عليه' },
    { id: 'haram', t: 'ابتعدتُ عن الحرام والشبهات', i: '🛡️', v: '«فمن اتقى الشبهات فقد استبرأ لدينه وعرضه» — متفق عليه' },
    { id: 'wadia', t: 'أوفيتُ بوعدي وأدّيتُ الأمانة', i: '🤝', v: '«آية المنافق ثلاث: إذا حدّث كذب، وإذا وعد أخلف، وإذا اؤتمن خان» — متفق عليه' },
    { id: 'israf', t: 'لم أُسرف ولم أُضيّع وقتي', i: '⏳', v: '«نعمتان مغبون فيهما كثير من الناس: الصحة والفراغ» — رواه البخاري' }
  ];
  const custom = g => (SL.cache.dhikr || []).filter(x => x.kind === 'deed' && x.show !== false && (x.grp || 'd') === g).map(x => ({ id: 'c' + x.id, t: x.title, i: '⭐', v: x.text || '', c: true }));
  const list = g => (g === 's' ? SUNAN : g === 'p' ? AVOID : DEEDS).concat(custom(g));
  const PV = {
    fajr: '«من صلى الصبح فهو في ذمة الله» — رواه مسلم',
    dhuhr: '«أرأيتم لو أن نهراً بباب أحدكم يغتسل فيه كل يوم خمساً، هل يبقى من درنه شيء؟ فكذلك الصلوات الخمس يمحو الله بهن الخطايا» — متفق عليه',
    asr: '«من فاتته صلاة العصر فكأنما وُتر أهله وماله» — متفق عليه',
    maghrib: '«الصلوات الخمس والجمعة إلى الجمعة مكفّرات لما بينهن» — رواه مسلم',
    isha: '«من صلى العشاء في جماعة فكأنما قام نصف الليل» — رواه مسلم'
  };
  SL.prayerVirtue = id => PV[id] || '';
  const PTS = { s: 3, d: 2, p: 2 };
  SL.amalLists = list;

  const group = (g, title, icon) => {
    const z = SL.actGet(), items = list(g), done = items.filter(x => (z['y_' + x.id] || {}).done).length;
    return `<div class="card" style="padding:14px"><div class="row" style="margin-bottom:6px"><h3 class="grow" style="margin:0">${icon} ${title}</h3><span class="badge ${done === items.length ? 'ok' : 'acc'} num">${N(done)}/${N(items.length)}</span></div>
      ${items.map(x => { const e = z['y_' + x.id] || {}, on = !!e.done; return `<div class="prow ${on ? 'done' : ''}" data-act="amalTog" data-id="${E(x.id)}" data-g="${g}" style="cursor:pointer;align-items:flex-start"><div class="ic">${x.i}</div><div class="grow"><div class="nm" style="font-size:15.5px">${E(x.t)}</div>${x.v ? `<div class="small muted" style="line-height:1.7;margin-top:2px">${E(x.v)}</div>` : ''}</div><span class="badge ${on ? 'ok' : ''}">${on ? '✓' : '+' + N(PTS[g])}</span></div>`; }).join('')}</div>`;
  };
  SL.act.amalTog = el => {
    const id = el.dataset.id, g = el.dataset.g, key = 'y_' + id, cur = SL.actGet()[key] || {}, it = list(g).find(x => x.id === id); if (!it) return;
    const t = Date.now(), on = !cur.done;
    SL.actSet(key, { n: on ? 1 : 0, g: 1, ts: t, done: on ? t : 0, p: PTS[g], grp: g, title: it.t });
    if (on) { SL.sound.play('tick'); ui.toast('تقبّل الله منك 🤍'); const items = list(g); if (items.every(x => x.id === id || (SL.actGet()['y_' + x.id] || {}).done)) { SL.sound.play('wird'); ui.toast('ما شاء الله! أتممت الكل اليوم 🌟', 4000); } }
    SL.render(true);
  };

  // فضل ما تفعله: حروف القرآن، إجمالي الأذكار، الصلاة على النبي
  const totals = () => {
    const A = SL.load('acts', {}); let q = 0, dh = 0, sl = 0, du = 0;
    for (const d in A) for (const k in A[d]) { const e = A[d][k] || {}; if (k === 'q') q += e.n || 0; else if (k.charAt(0) === 't') { dh += e.n || 0; if (k === 't_d3') sl += e.n || 0; } else if (k === 'u') du += e.n || 0; }
    return { q, dh, sl, du };
  };
  const LETTERS_PER_PAGE = 540; // تقريب: نحو ٣٢٠ ألف حرف / ٦٠٤ صفحة
  // نسبة الالتزام اليومي: الصلوات + أذكار الصباح والمساء + السنن + الأعمال + الورد + محاسبة النفس
  const commit = () => {
    const z = SL.actGet(), day = SL.load('days', {})[SL.dkey()] || {}, pr = SL.PRAYERS.filter(x => (day.p || day)[x.id] || (day.p || {})[x.id]).length;
    const wd = !!(SL.load('wirdDone', {})[SL.dkey()]);
    const cnt = g => list(g).filter(x => (z['y_' + x.id] || {}).done).length;
    const parts = [
      ['🕌 الصلوات', pr, 5, 40], ['☀️ أذكار الصباح', (z.a_sabah || {}).done ? 1 : 0, 1, 8], ['🌆 أذكار المساء', (z.a_masaa || {}).done ? 1 : 0, 1, 8],
      ['🌙 السنن', cnt('s'), list('s').length, 12], ['🤝 الأعمال الصالحة', cnt('d'), list('d').length, 10], ['🛡️ محاسبة النفس', cnt('p'), list('p').length, 12], ['📖 الورد', wd ? 1 : 0, 1, 10]
    ];
    const pct = Math.round(parts.reduce((t, p) => t + p[3] * (p[2] ? p[1] / p[2] : 0), 0));
    return { pct, parts };
  };
  SL.amalCommit = commit;
  const commitCard = () => {
    const c = commit(), msg = c.pct >= 90 ? 'ما شاء الله! يوم عامر بالطاعة 🌟' : c.pct >= 60 ? 'بارك الله فيك، أكمل بقية يومك 🌿' : c.pct >= 30 ? 'بداية طيبة — الطريق خطوة بخطوة 🤍' : 'ابدأ بصلاتك على وقتها، والباقي يتيسّر بإذن الله 🌅';
    return `<div class="card" style="padding:14px"><div class="row"><div class="grow"><h3 style="margin:0">🧭 التزامي اليوم</h3><div class="small muted" style="margin-top:4px">${msg}</div></div><div class="dh" style="margin:0;padding:0;background:none;border:0;box-shadow:none"><div class="ct" style="--p:${c.pct}%;width:66px;height:66px"><b class="num">${N(c.pct)}٪</b></div></div></div>
      <div class="small muted" style="margin-top:8px;line-height:2">${c.parts.map(p => `${p[0]} ${N(p[1])}/${N(p[2])}`).join(' · ')}</div></div>`;
  };
  SL.amalHome = () => {
    if (!SL.me || isStaff()) return '';
    const T = totals(), letters = T.q * LETTERS_PER_PAGE;
    return commitCard() + group('s', 'السنن والنوافل', '🌙') + group('d', 'أعمال صالحة اليوم', '🤝') + group('p', 'محاسبة النفس: أتجنّب اليوم', '🛡️') +
      `<div class="card" style="padding:14px"><h3 style="margin:0 0 8px">✨ فضل ما تفعله</h3>
        <div class="setrow"><span>📖 قرأت من القرآن</span><b class="num">${N(T.q)} صفحة ≈ ${N(letters)} حرف</b></div>
        <div class="small muted" style="line-height:1.8;margin:2px 0 8px">«من قرأ حرفاً من كتاب الله فله به حسنة، والحسنة بعشر أمثالها» — رواه الترمذي. (العدد تقريبي، والله يضاعف لمن يشاء)</div>
        <div class="setrow"><span>📿 إجمالي ما سبّحت وذكرت</span><b class="num">${N(T.dh)}</b></div>
        <div class="setrow"><span>💚 الصلاة على النبي ﷺ</span><b class="num">${N(T.sl)} مرة</b></div>
        <div class="small muted" style="line-height:1.8;margin-top:6px">«من صلى عليّ صلاة صلى الله عليه بها عشراً» — رواه مسلم</div>
        <div class="setrow"><span>🤲 أدعية قرأتها</span><b class="num">${N(T.du)}</b></div>
        <div class="hint" style="margin-top:6px">الأرقام من الأيام المحفوظة على جهازك.</div></div>`;
  };


  /* ---------- من نحن: مبادرة أشبال الفجر ---------- */
  const APP_URL = 'https://cane-studio-dev.github.io/salaty-/';
  const OFFER = `🌙 باب الاشتراك مفتوح الآن في مبادرة (أشبال الفجر) — من كفر الحمادية لكل مصر! 🌙

لو نفسك ابنك أو بنتك يتربّوا على الثبات والالتزام الحقيقي في بيئة مشجعة وممتعة، أشبال الفجر عاملة برنامج متكامل يجمع بين التربية والمتابعة والمنافسة الشريفة:

👦👧 لمن المبادرة؟ للأولاد والبنات من ٧ إلى ١٦ سنة، في رحلة التزام لمدة ٤٠ يوماً متواصلة.

📲 نظام المتابعة داخل التطبيق: متابعة يومية منظمة لصلاة الفجر (في المسجد للأولاد، وفور الأذان للبنات) مع الورد القرآني، الصلوات الخمس، الأذكار والتسبيح، وترتيب وتشجيع مستمر.

🏆 الجوائز والتكريم: هدايا قيمة ومتنوعة للملتزمين، وجائزة كبرى ٥٠٠ جنيه لمن يتم التحدي بالشروط المطلوبة.

🔗 رابط التطبيق والبدء:
${APP_URL}
سجّل وابدأ من النهاردة، وخلي الخطوة الأولى في طريق الثبات والخير! ✨`;
  const FEATS = [['🕌', 'الصلوات الخمس', 'سجّل كل صلاة في المسجد أو البيت وشاهد نقاطك'], ['📖', 'الورد والمصحف كاملاً', '٦٠٤ صفحة بصوت القرّاء مع ورد يومي من الإدارة'], ['📿', 'الأذكار والتسبيح', 'أكثر من ٢٠ قسماً: الصباح والمساء والنوم والسفر والطعام وغيرها'], ['🤲', 'الأدعية', 'مكتبة أدعية من القرآن والسنة وأدعية من الإدارة'], ['🌙', 'السنن والأعمال الصالحة', 'نوافل وأعمال يومية ومحاسبة النفس مع فضل كل عمل'], ['🧭', 'نسبة التزامي', 'تقيس التزامك اليومي في كل الطاعات'], ['🎯', 'التحديات', 'تحديات بالأيام تضعها الإدارة وتتابع إنجازك فيها تلقائياً'], ['❓', 'مسابقة اليوم', 'سؤال يومي ونقاط للإجابة الصحيحة'], ['🏆', 'لوحة الشرف', 'ترتيب المتميزين وتكريمهم'], ['🎬', 'الفيديوهات', 'دروس وقصص ومواعظ داخل المنصة'], ['📢', 'الإعلانات والرسائل', 'أخبار وأحاديث وفوائد ورسائل من الإدارة'], ['🖼️', 'كروت الإنجاز', 'شارك إنجازك مع أصحابك'], ['📴', 'يعمل بدون إنترنت', 'ويحفظ تقدمك ويزامنه عند الاتصال']];
  SL.aboutCard = () => {
    const open = SL.aboutOpen === true, ch = (SL.cache.dhikr || []).filter(x => x.kind === 'challenge' && x.show !== false && x.title);
    return `<div class="card" style="padding:12px 14px"><div class="row" data-act="aboutTog" style="cursor:pointer"><div style="font-size:26px">🌅</div><div class="grow"><b>من نحن — مبادرة أشبال الفجر</b><div class="small muted">تعرّف على المبادرة والتحديات وميزات التطبيق</div></div><span class="badge">${open ? 'إخفاء' : 'اعرف أكثر'}</span></div>
      ${open ? `<div style="line-height:2;margin-top:10px;font-size:14.5px">
        <div>🌅 <b>أشبال الفجر</b> مبادرة تربوية من كفر الحمادية لكل مصر، تُعين الأولاد والبنات من ٧ إلى ١٦ سنة على الثبات على الطاعة بمتابعة يومية وتشجيع ومنافسة شريفة وجوائز وتكريم 🇪🇬</div>
        <div class="hint" style="margin:10px 0 4px">🎯 التحديات</div>
        <div>تحديات كثيرة تتجدد بإذن الله، تضعها الإدارة بمدتها وشروطها، والتطبيق يتابع إنجازك فيها وحدك. من أهمها:</div>
        <div style="padding-right:8px">🕌 <b>تحدي الفجر ٤٠ يوماً متواصلة</b> — في المسجد للأولاد، وفور الأذان للبنات، ولو وقع يوم نبدأ من الأول. التقييم: الفجر أساساً ومعه الورد والصلوات والذكر. جائزته الكبرى ٥٠٠ جنيه لمن يُتمه بالشروط، وهدايا متنوعة للملتزمين.</div>
        ${ch.length ? `<div class="hint" style="margin:8px 0 2px">تحديات قائمة الآن</div>${ch.map(x => `<div style="padding-right:8px">⭐ ${E(x.title)}${x.days ? ` <span class="muted small">(${N(x.days)} يوماً)</span>` : ''}</div>`).join('')}` : ''}
        <div class="hint" style="margin:10px 0 4px">📱 ميزات التطبيق</div>
        ${FEATS.map(f => `<div style="display:flex;gap:8px;align-items:flex-start"><span>${f[0]}</span><span><b>${f[1]}</b> <span class="muted small">— ${f[2]}</span></span></div>`).join('')}
        <div class="hint" style="margin:10px 0 4px">🤝 فريق العمل</div>
        <div>صُمّم هذا التطبيق وطُوّر بجهد فريق عمل متكامل من مبادرة أشبال الفجر: فريق التقنية، وفريق المحتوى الشرعي والتربوي، وفريق المتابعة، والإدارة العليا. نسأل الله أن يتقبّل منا ومنكم.</div>
        </div>
        <button class="btn sec block" style="margin-top:10px" data-act="aboutShare">📣 شارك المبادرة مع أصدقائك</button>` : ''}</div>`;
  };
  SL.act.aboutTog = () => { SL.aboutOpen = !SL.aboutOpen; SL.render(true); };
  SL.act.aboutShare = async () => {
    try { if (navigator.share) { await navigator.share({ text: OFFER }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
    try { await navigator.clipboard.writeText(OFFER); ui.toast('تم نسخ نص الدعوة ✓ الصقه في أي جروب'); } catch (e) { ui.sheet(`<h3>انسخ النص</h3><textarea style="min-height:240px;width:100%">${E(OFFER)}</textarea>`); }
  };
  // الإدارة: تفاصيل الطالب + تبويب السنن والأعمال
  SL.xDetail = z => {
    const rows = k => list(k).map(x => ({ x, e: z['y_' + x.id] })).filter(r => r.e && r.e.done);
    const s = rows('s'), d = rows('d'), pp = rows('p');
    const sec = (t, a) => `<div class="hint" style="margin:12px 0 6px">${t} (${N(a.length)})</div>${a.length ? `<div class="card" style="box-shadow:none;padding:6px 14px">${a.map(r => `<div class="setrow"><span>${r.x.i} ${E(r.x.t)}</span><span class="muted small num">✓ ${SL.fmtTime(r.e.done)}</span></div>`).join('')}</div>` : '<div class="muted small">لم يسجّل شيئاً اليوم.</div>'}`;
    return sec('🌙 السنن والنوافل', s) + sec('🤝 الأعمال الصالحة', d) + sec('🛡️ محاسبة النفس', pp);
  };
  const students = () => (SL.cache.users || []).filter(u => u.role !== 'admin' && u.role !== 'super');

  /* ---------- الإدارة العليا: تعديل الترتيب والنقاط ---------- */
  const isSuper = () => !!SL.me && SL.me.role === 'super' && !SL.demo;
  const cycleBoard = () => { const cr = SL.cycleRange(SL.cycleOf(new Date())), L = SL.aggregateAll(SL.allDays(), SL.allActs(), SL.allWird(), cr.from, cr.to), m = {}; L.forEach(x => m[x.sid] = x.pts); return { cr, rows: students().map(u => ({ u, pts: m[u.sid] || 0 })).sort((a, b) => b.pts - a.pts) }; };
  const tRank = () => {
    if (!isSuper()) return '<div class="card"><div class="empty">هذا القسم للإدارة العليا فقط.</div></div>';
    const B = cycleBoard(), adj = (SL.cache.dhikr || []).filter(x => x.kind === 'adjust').sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 40);
    return `<div class="card"><h2 style="margin:0 0 4px;font-size:18px">⚖️ الترتيب والنقاط</h2><div class="hint">الترتيب الحالي للدورة (${E(B.cr.from)} → ${E(B.cr.to)}). اضغط على أي طالب لإضافة نقاط أو خصمها أو ضبط مجموعه. التعديل يظهر في لوحة الشرف عند الجميع.</div>
      <div class="scroll" style="margin-top:10px"><table class="tbl"><thead><tr><th>#</th><th>الطالب</th><th>النقاط</th></tr></thead><tbody>${B.rows.map((r, i) => `<tr data-act="adjOpen" data-s="${E(r.u.sid)}" style="cursor:pointer"><td class="num">${N(i + 1)}</td><td>${E(r.u.name)}</td><td class="num"><b>${N(r.pts)}</b> ✏️</td></tr>`).join('') || '<tr><td colspan="3" class="empty">لا يوجد طلاب</td></tr>'}</tbody></table></div></div>
      <div class="card"><h3>سجل التعديلات (${N(adj.length)})</h3><div class="col">${adj.length ? adj.map(x => `<div class="msg"><div class="meta"><b>${E(x.name || '')}</b><span class="num" style="color:var(${+x.pts >= 0 ? '--ok' : '--bad'},inherit)">${+x.pts > 0 ? '+' : ''}${N(x.pts)}</span></div>${x.note ? `<div class="small muted">${E(x.note)}</div>` : ''}<div class="small muted">${E(x.date || '')} · الإدارة العليا</div><button class="btn sm bad" style="margin-top:6px" data-act="adjDel" data-i="${E(x.id)}">تراجع عن التعديل</button></div>`).join('') : '<div class="empty">لم تُجرِ أي تعديل بعد.</div>'}</div></div>`;
  };
  SL.act.adjOpen = el => {
    if (!isSuper()) return; const u = students().find(x => x.sid === el.dataset.s); if (!u) return; const cur = (cycleBoard().rows.find(r => r.u.sid === u.sid) || {}).pts || 0;
    SL._adj = { sid: u.sid, name: u.name, cur, mode: 'add' };
    ui.sheet(`<h2 style="margin:0 0 4px">${E(u.name)}</h2><p class="muted" style="margin:0 0 10px">نقاطه الآن في الدورة: <b class="num">${N(cur)}</b></p><div class="col">
      <div class="seg" id="adjMode"><button data-act="adjMode" data-m="add" class="on">➕ إضافة</button><button data-act="adjMode" data-m="sub">➖ خصم</button><button data-act="adjMode" data-m="set">🎯 ضبط إلى</button></div>
      <input type="number" id="adjN" inputmode="numeric" min="0" placeholder="عدد النقاط">
      <input type="text" id="adjNote" placeholder="السبب (اختياري، مثال: مكافأة تفوّق)" maxlength="80">
      <button class="btn" data-act="adjApply">تطبيق</button></div>`);
  };
  SL.act.adjMode = el => { SL._adj.mode = el.dataset.m; document.querySelectorAll('#adjMode button').forEach(b => b.classList.toggle('on', b === el)); };
  SL.act.adjApply = () => {
    if (!isSuper() || !SL._adj) return; const A = SL._adj, v = parseInt(val('adjN'), 10); if (isNaN(v) || v < 0) return ui.toast('اكتب رقماً صحيحاً');
    let d = A.mode === 'add' ? v : A.mode === 'sub' ? -v : v - A.cur; if (!d) return ui.toast('لا يوجد تغيير');
    const x = { kind: 'adjust', sid: A.sid, name: A.name, pts: d, note: val('adjNote') || (A.mode === 'set' ? 'ضبط المجموع إلى ' + v : ''), date: SL.dkey(), by: 'الإدارة العليا', ts: Date.now(), show: false }, id = SL.uid();
    SL.queue('dhikr', id, x, { merge: false }); SL.cache.dhikr = [Object.assign({ id }, x)].concat(SL.cache.dhikr || []); SL._adj = null; ui.close(); ui.toast('تم تعديل النقاط ✓'); SL.render(true);
  };
  SL.act.adjDel = el => { if (!isSuper() || !confirm('التراجع عن هذا التعديل؟')) return; SL.queueDelete('dhikr', el.dataset.i); SL.cache.dhikr = (SL.cache.dhikr || []).filter(x => x.id !== el.dataset.i); SL.render(true); };
  const tAmal = () => {
    const us = students(), t = SL.dkey(), acts = SL.allActs(), cu = (SL.cache.dhikr || []).filter(x => x.kind === 'deed');
    const cnt = (u, g) => { const z = (acts[`${u.sid}_${t}`] || {}).z || {}; return list(g).filter(x => (z['y_' + x.id] || {}).done).length; };
    const rows = us.map(u => ({ u, s: cnt(u, 's'), d: cnt(u, 'd') })).sort((a, b) => (b.s + b.d) - (a.s + a.d));
    const avg = g => us.length ? Math.round(rows.reduce((t0, r) => t0 + r[g], 0) / us.length * 10) / 10 : 0;
    return `<div class="card"><h2 style="margin:0 0 8px;font-size:18px">🌙 السنن والأعمال الصالحة اليوم</h2><div class="row" style="gap:8px"><span class="badge">🌙 متوسط السنن ${N(avg('s'))}/${N(list('s').length)}</span><span class="badge">🤝 متوسط الأعمال ${N(avg('d'))}/${N(list('d').length)}</span></div>
      <div class="scroll" style="margin-top:10px"><table class="tbl"><thead><tr><th>الطالب</th><th>🌙</th><th>🤝</th></tr></thead><tbody>${rows.map(r => `<tr data-act="stuInfo" data-s="${r.u.sid}" style="cursor:pointer"><td>${E(r.u.name)}</td><td>${N(r.s)}</td><td>${N(r.d)}</td></tr>`).join('') || '<tr><td colspan="3" class="empty">لا يوجد طلاب</td></tr>'}</tbody></table></div></div>
    <div class="card"><h2 style="margin:0 0 10px;font-size:18px">➕ أضف سنة أو عملاً للطلاب</h2><div class="col">
      <div class="seg"><button data-act="amalKind" data-k="s" class="${SL.amalKind !== 'd' ? 'on' : ''}">🌙 سنة / نافلة</button><button data-act="amalKind" data-k="d" class="${SL.amalKind === 'd' ? 'on' : ''}">🤝 عمل صالح</button></div>
      <input type="text" id="aTitle" placeholder="العنوان (مثال: صلاة الشروق)" maxlength="80"><textarea id="aText" placeholder="الفضل أو الحديث (يظهر تحت العنوان)" style="min-height:60px"></textarea><button class="btn" data-act="amalPub">إضافة</button></div></div>
    <div class="card"><h3>المضاف منك (${N(cu.length)})</h3><div class="col">${cu.length ? cu.map(x => `<div class="msg"><div class="meta"><b>${(x.grp || 'd') === 's' ? '🌙' : '🤝'} ${E(x.title)}</b></div>${x.text ? `<div class="small muted">${E(x.text)}</div>` : ''}<div class="row" style="margin-top:8px"><button class="btn sm sec" data-act="amalToggle" data-i="${E(x.id)}" data-v="${x.show === false ? 1 : 0}">${x.show === false ? 'إظهار' : 'إخفاء'}</button><button class="btn sm bad" data-act="itemDel" data-i="${E(x.id)}">حذف</button></div></div>`).join('') : '<div class="empty">لم تضف شيئاً بعد.</div>'}</div></div>`;
  };
  SL.act.amalKind = el => { SL.amalKind = el.dataset.k; SL.render(true); };
  SL.act.amalPub = () => {
    const title = val('aTitle'); if (!title) return ui.toast('اكتب العنوان'); const x = { kind: 'deed', title, text: val('aText'), grp: SL.amalKind === 'd' ? 'd' : 's', show: true, by: SL.me.name, ts: Date.now() }, id = SL.uid();
    SL.queue('dhikr', id, x, { merge: false }); SL.cache.dhikr = [Object.assign({ id }, x)].concat(SL.cache.dhikr || []); ui.toast('تمت الإضافة ✓ — ظهرت لكل الطلاب'); SL.render(true);
  };
  SL.act.amalToggle = el => { const show = el.dataset.v === '1'; SL.queue('dhikr', el.dataset.i, { show }); const x = (SL.cache.dhikr || []).find(y => y.id === el.dataset.i); if (x) x.show = show; SL.render(true); };
  (SL.xTabs = SL.xTabs || []).push(['amal', '🌙 السنن والأعمال', tAmal]);
  SL.xTabs.push(['rank', '⚖️ الترتيب والنقاط', tRank, isSuper]);
})(window.SL);

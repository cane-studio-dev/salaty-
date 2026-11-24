/* صلاتي — الإقلاع: Service Worker، الشاشة الافتتاحية، التحقق من الحساب */
(function (SL) {
  'use strict';
  const $ = s => document.querySelector(s);
  let hiddenAt = 0;

  window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); SL.installEvt = e; if (SL.me && $('#app')) SL.shell(); });
  window.addEventListener('appinstalled', () => { SL.installEvt = null; });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) hiddenAt = Date.now();
    else if (SL.me && SL.me.pinHash && hiddenAt && Date.now() - hiddenAt > 90000 && !SL.demo) { sessionStorage.removeItem('unlocked'); SL.showLock(); }
  });

  /* تأكد أن الحساب ما زال موجوداً/مصرّحاً (عند توفر الإنترنت) */
  async function verifyAccount() {
    if (!SL.cloud.enabled || !navigator.onLine || !SL.me) return;
    try {
      const u = await SL.ensureAuth(), me = SL.me;
      if (me.role === 'admin' || me.role === 'super') {
        const d = await SL.getOnce(SL.fs().collection('staff').doc(u.uid));
        if (!d.exists) return forceOut('تمت إزالة صلاحيات الإدارة من حسابك. سجّل الدخول من جديد.');
      } else {
        const pending = SL.load('outbox', []).some(o => o.col === 'users');
        const d = await SL.getOnce(SL.fs().collection('users').doc(me.phone));
        if (!d.exists && !pending) return forceOut('تم حذف حسابك من الإدارة. يمكنك إنشاء حساب جديد.');
        if (d.exists && d.data().name && d.data().name !== me.name) { me.name = d.data().name; SL.save('me', me); SL.render(); }
      }
    } catch (e) { /* بدون إنترنت أو خطأ مؤقت: تجاهل */ }
  }
  function forceOut(msg) {
    ['me', 'days', 'wirdDone', 'outbox', 'cache', 'sent', 'msgSeen', 'adhkar'].forEach(SL.del); sessionStorage.clear();
    alert(msg); location.reload();
  }
  SL.afterUnlock = () => { verifyAccount(); setTimeout(SL.showSalawat, 400); };

  window.addEventListener('load', () => {
    SL.applyTheme();
    SL.cloudInit();
    SL.start();
    if (SL.me) { SL.startListening(); SL.pullMine(); verifyAccount(); }
    const lockShown = !!$('#lock');
    setTimeout(() => { const s = $('#splash'); if (s) { s.classList.add('out'); setTimeout(() => s.remove(), 800); } if (!$('#lock')) setTimeout(SL.showSalawat, 500); }, 1700);
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js').then(reg => {
        reg.addEventListener('updatefound', () => { const w = reg.installing; if (w) w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) SL.ui.toast('تم تحديث التطبيق — أعد فتحه للاستفادة من الجديد ✨', 5000); }); });
      }).catch(() => {});
    }
  });
})(window.SL);

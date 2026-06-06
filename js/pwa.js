(function () {
  'use strict';

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(function () {});
  }

  const banner = document.getElementById('pwaInstallBanner');
  const btnInstalar = document.getElementById('pwaBtnInstalar');
  const btnFechar = document.getElementById('pwaBtnFechar');
  let deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    deferredPrompt = e;
    if (banner) banner.hidden = false;
  });

  if (btnInstalar) {
    btnInstalar.addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function () {
        deferredPrompt = null;
        if (banner) banner.hidden = true;
      });
    });
  }

  if (btnFechar) {
    btnFechar.addEventListener('click', function () {
      if (banner) banner.hidden = true;
    });
  }

  window.addEventListener('appinstalled', function () {
    if (banner) banner.hidden = true;
    deferredPrompt = null;
  });
})();

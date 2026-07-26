import '@fontsource-variable/outfit';
import '@fontsource-variable/fredoka';
import '@fortawesome/fontawesome-free/css/all.min.css';

Promise.all([
  import('canvas-confetti'),
  import('html2canvas')
]).then(([confettiModule, html2canvasModule]) => {
  window.confetti = confettiModule.default || confettiModule;
  window.html2canvas = html2canvasModule.default || html2canvasModule;
  document.documentElement.dataset.vendorReady = 'true';
}).catch(error => {
  console.error('本地互動元件載入失敗', error);
});

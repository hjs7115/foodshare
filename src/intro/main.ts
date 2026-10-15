import './style.css';
type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const standalone = window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
// Preserve old installed shortcuts and notification links pointing at /.
if (standalone || new URLSearchParams(location.search).has('screen')) location.replace(`/app${location.search}${location.hash}`);
let pendingInstall: InstallEvent | null = null;
const buttons = Array.from(document.querySelectorAll<HTMLButtonElement>('[data-install]'));
const dialog = document.querySelector<HTMLDialogElement>('#install-dialog')!;
const help = document.querySelector<HTMLParagraphElement>('#install-help')!;
window.addEventListener('beforeinstallprompt', (event) => { event.preventDefault(); pendingInstall = event as InstallEvent; });
window.addEventListener('appinstalled', () => {
  localStorage.setItem('installation-reset-pending', 'true');
  void import('../app/auth/deviceSession').then(({resetDeviceSession}) => resetDeviceSession()).catch(() => { /* App retries pending cleanup on next launch. */ });
  pendingInstall = null;
  for (const button of buttons) { button.textContent = '반띵 시작하기 ↗'; button.dataset.installed = 'true'; }
  if (dialog.open) dialog.close();
});
for (const button of buttons) button.addEventListener('click', async () => {
  if (button.dataset.installed === 'true') { location.assign('/app'); return; }
  if (pendingInstall) {
    const event = pendingInstall; pendingInstall = null;
    buttons.forEach((item) => item.disabled = true);
    try { await event.prompt(); await event.userChoice; return; }
    catch { /* Browser may withdraw install eligibility; show instructions. */ }
    finally { buttons.forEach((item) => item.disabled = false); }
  }
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  help.textContent = ios
    ? 'Safari에서 공유 버튼 → ‘홈 화면에 추가’를 선택해주세요. ‘웹 앱으로 열기’가 보이면 켜주세요. 카카오톡 등 앱 안에서 보고 있다면 Safari로 먼저 열어주세요.'
    : 'Chrome 또는 Edge의 메뉴에서 ‘앱 설치’ 또는 ‘홈 화면에 추가’를 선택해주세요. 앱 안의 브라우저에서는 Chrome으로 다시 열어주세요. 이미 설치했다면 홈 화면의 반띵 아이콘을 눌러주세요. 설치 메뉴가 없어도 웹에서 바로 이용할 수 있어요.';
  if (!dialog.open) dialog.showModal();
});
document.querySelector('#close-dialog')!.addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
});
if ('serviceWorker' in navigator) window.addEventListener('load', () => {
  navigator.serviceWorker.register('/firebase-messaging-sw.js').catch(() => { /* Web access remains available. */ });
});

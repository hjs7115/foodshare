import { resetDeviceSession } from './app/auth/deviceSession';
import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import { AppErrorBoundary } from './app/components/common/AppErrorBoundary.tsx';
import { FeedbackProvider } from './app/utils/feedback.tsx';
import { registerPwaServiceWorker } from './app/pwa.ts';
import './styles/index.css';

async function startApp() {
if (localStorage.getItem('installation-reset-pending') === 'true') await resetDeviceSession();
createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <FeedbackProvider>
      <App />
    </FeedbackProvider>
  </AppErrorBoundary>
);
}
window.addEventListener('appinstalled', () => {
  localStorage.setItem('installation-reset-pending', 'true');
  void resetDeviceSession().finally(() => window.location.replace('/app'));
});
void startApp();
registerPwaServiceWorker();

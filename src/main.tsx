import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import { AppErrorBoundary } from './app/components/common/AppErrorBoundary.tsx';
import { registerFirebaseMessaging } from './app/firebase.ts';
import { registerPwaServiceWorker } from './app/pwa.ts';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
registerPwaServiceWorker();
registerFirebaseMessaging();

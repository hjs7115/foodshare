import { createRoot } from 'react-dom/client';
import App from './app/App.tsx';
import { AppErrorBoundary } from './app/components/common/AppErrorBoundary.tsx';
import { FeedbackProvider } from './app/utils/feedback.tsx';
import { registerFirebaseMessaging } from './app/firebase.ts';
import { registerPwaServiceWorker } from './app/pwa.ts';
import './styles/index.css';

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <FeedbackProvider>
      <App />
    </FeedbackProvider>
  </AppErrorBoundary>
);
registerPwaServiceWorker();
registerFirebaseMessaging();

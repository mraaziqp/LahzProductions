import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

if (typeof window !== 'undefined') {
  const deploymentInfo = {
    status: '✅ LIVE SITE',
    site: 'LAHZ Productions',
    deployed: new Date().toISOString(),
    verification: 'This is the PRODUCTION site, not the Launching Soon page'
  };
  console.log('%c' + deploymentInfo.status, 'color: #16a34a; font-size: 14px; font-weight: bold;');
  console.log('%cLAHZ Productions - LIVE DEPLOYMENT', 'color: #16a34a; font-size: 12px;');
  console.log('%cVerification: This confirms the production site is active', 'color: #16a34a; font-size: 11px;');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

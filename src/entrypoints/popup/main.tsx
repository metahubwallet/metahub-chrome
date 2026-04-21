import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/assets/css/app.css';
import App from './App';
import { useChainStore } from '@/stores/chainStore';
import { useWalletStore } from '@/stores/walletStore';
import { useUserStore } from '@/stores/userStore';
import { useSettingStore } from '@/stores/settingStore';
import '@/i18n'; // Initialize i18n

const bootstrap = async () => {
  // Initialize all stores from local storage / session storage
  await Promise.all([
    useChainStore.getState().init(),
    useWalletStore.getState().init(),
    useUserStore.getState().init(),
    useSettingStore.getState().init(),
  ]);

  // Apply saved language
  const { language } = useSettingStore.getState();
  const i18n = await import('@/i18n');
  i18n.default.changeLanguage(language);

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
};

bootstrap().catch(console.error);

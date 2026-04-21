import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import AnimatedOutlet from '@/components/AnimatedOutlet';
import { useUserStore } from '@/stores/userStore';
import { useUIStore } from '@/stores/uiStore';
import AccountSelector from '@/components/AccountSelector';
import PasswordSetup from '@/entrypoints/popup/pages/auth/PasswordSetup';
import PasswordUnlock from '@/entrypoints/popup/pages/auth/PasswordUnlock';

const PopupLayout: React.FC = () => {
  const navigate = useNavigate();
  const password = useUserStore((s) => s.password);
  const passhash = useUserStore((s) => s.passhash);
  const showAccountSelector = useUIStore((s) => s.showAccountSelector);
  const setShowAccountSelector = useUIStore((s) => s.setShowAccountSelector);

  const isLock = password === '';
  const isInited = passhash !== '';

  const handleImportKey = (chainId: string) => {
    setShowAccountSelector(false);
    navigate(`/import-key?chainId=${chainId}`);
  };

  // Uninitiated → show setup
  if (!isInited) {
    return (
      <div
        className="h-full"
        style={{ height: '600px', width: '370px' }}
      >
        <PasswordSetup />
      </div>
    );
  }

  // Initiated but locked → show unlock
  if (isLock) {
    return (
      <div
        className="h-full"
        style={{
          height: '600px',
          width: '370px',
          backgroundImage: 'linear-gradient(rgba(246,221,255,0.24), rgba(225,225,250,0.04))',
        }}
      >
        <PasswordUnlock />
      </div>
    );
  }

  // Unlocked → show full layout
  return (
    <div
      className="relative bg-white"
      style={{ height: '600px', width: '370px' }}
    >
      <div className="h-full overflow-hidden">
        <AnimatedOutlet />
      </div>

      <AccountSelector
        isOpen={showAccountSelector}
        onClose={() => setShowAccountSelector(false)}
        onImportKey={handleImportKey}
      />
    </div>
  );
};

export default PopupLayout;

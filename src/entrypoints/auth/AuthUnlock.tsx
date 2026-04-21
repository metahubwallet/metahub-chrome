import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useUserStore } from '@/stores/userStore';
import metahubLogo from '@/assets/images/metahub@2x.png';

const AuthUnlock: React.FC = () => {
  const { t } = useTranslation();
  const [passwordInput, setPasswordInput] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);

  const handleSubmit = async () => {
    if (!passwordInput) {
      toast.warning(t('password.empty'));
      return;
    }

    let unlocked = false;
    try {
      unlocked = await useUserStore.getState().verifyAndUnlock(passwordInput);
    } catch (e: any) {
      // Migration threw (integrity check failed) — wallet is re-locked, show the reason.
      toast.error(e?.message || t('password.error'));
      return;
    }
    if (!unlocked) {
      toast.warning(t('password.error'));
      return;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <div className="flex flex-col flex-1 pt-12 px-5 pb-7">
        {/* Header area */}
        <div className="flex flex-col justify-end items-center pb-6" style={{ height: '45%' }}>
          <img
            src={metahubLogo}
            alt="MetaHub"
            className="h-10 w-auto object-contain"
          />
          <p className="mt-4 text-xs text-[#9CA3AF] text-center w-[260px] leading-relaxed">
            {t('password.unlockTip')}
          </p>
        </div>

        {/* Form area */}
        <div className="w-[290px] mx-auto flex flex-col items-center gap-5 pt-6">
          <div className="flex items-center justify-between w-full h-14 rounded-[28px] border border-[#E0E0E0] bg-white px-[22px]">
            <input
              type={showPassword ? 'text' : 'password'}
              className="flex-1 text-[15px] font-medium bg-transparent border-0 outline-none placeholder-[#B8B8C0]"
              placeholder={t('password.toUnlock')}
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <button
              type="button"
              className="ml-2 flex items-center justify-center shrink-0 border-0 bg-transparent cursor-pointer"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C0C0C8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#C0C0C8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              )}
            </button>
          </div>
          <button
            className="w-full h-14 rounded-[28px] text-white font-bold text-base border-0 cursor-pointer transition-opacity hover:opacity-90"
            style={{
              background: 'linear-gradient(135deg, #D500F9 0%, #C300F4 48%, #8F2BFF 100%)',
            }}
            onClick={handleSubmit}
          >
            {t('password.unlock')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuthUnlock;

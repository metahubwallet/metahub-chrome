import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useUserStore } from '@/stores/userStore';
import { Button } from '@/components/ui/button';
import PasswordInput from '@/components/PasswordInput';
import metahubLogo from '@/assets/images/metahub@2x.png';

const PasswordUnlock: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = React.useState('');
  const submit = async () => {
    if (!password) {
      toast.warning(t('password.empty'));
      return;
    }

    let unlocked = false;
    try {
      unlocked = await useUserStore.getState().verifyAndUnlock(password);
    } catch (e: any) {
      // Migration threw (integrity check failed) — wallet is re-locked, show the reason.
      toast.error(e?.message || t('password.error'));
      return;
    }
    if (!unlocked) {
      toast.error(t('password.error'));
      return;
    }

    navigate('/');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      submit();
    }
  };

  return (
    <div className="flex flex-col items-center w-full h-full bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      {/* Logo */}
      <div className="mt-12 flex justify-center">
        <img src={metahubLogo} className="w-[140px]" alt="MetaHub" />
      </div>

      {/* Centered content */}
      <div className="flex-1 flex flex-col items-center justify-center w-full px-10 gap-10">
        <p className="text-[28px] font-semibold text-[#27272A] text-center tracking-tight">
          {t('password.welcome')}
        </p>

        <div className="w-full flex flex-col gap-6">
          <PasswordInput
            className="w-full h-14 pl-6 bg-white border border-[#E0E0E0] rounded-[28px] text-sm focus:border-primary transition-colors"
            placeholder={t('password.toUnlock')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />

          <Button
            className="w-full h-14 bg-gradient-to-br from-[#D500F9] via-[#C300F4] to-[#8F2BFF] text-white rounded-[28px] font-bold text-base shadow-none transition-all hover:opacity-90"
            onClick={submit}
          >
            {t('password.unlock')}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PasswordUnlock;

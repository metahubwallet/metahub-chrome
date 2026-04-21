import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

const NoAccount: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSignup = () => {
    window.open('https://totoroswap.com/tools/create-account', '_blank');
  };

  return (
    <div className="flex flex-col items-center justify-between w-full h-full pt-[88px] px-6 pb-[52px]">
      {/* Hero section */}
      <div className="flex flex-col items-center w-full gap-[52px]">
        {/* Message */}
        <p className="text-sm text-[#5B21B6] text-center leading-[1.4] max-w-[300px]">
          {t('public.noImport')}
        </p>

        {/* Action area */}
        <div className="flex flex-col items-center gap-2.5">
          {/* Orb button */}
          <button
            className="relative w-[176px] h-[176px] cursor-pointer focus:outline-none"
            onClick={() => navigate('/import-key')}
            aria-label={t('public.importAccountNow')}
          >
            {/* Halo */}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: 'radial-gradient(circle, rgba(221,214,254,0.6) 0%, rgba(124,58,237,0) 100%)',
                opacity: 0.3,
              }}
            />
            {/* Gradient button */}
            <div
              className="absolute top-[10px] left-[10px] w-[156px] h-[156px] rounded-full"
              style={{
                background: 'linear-gradient(135deg, #D500F9 0%, #C300F4 48%, #8F2BFF 100%)',
                boxShadow: '0px 18px 34px 0px rgba(192,38,211,0.22)',
              }}
            />
            {/* Plus icon */}
            <div className="absolute top-[60px] left-[80px] w-4 h-14 rounded-lg bg-white" />
            <div className="absolute top-[80px] left-[60px] w-14 h-4 rounded-lg bg-white" />
          </button>

          {/* Label */}
          <p className="text-[26px] font-semibold text-[#6D28D9] leading-[1.42]">
            {t('public.importAccountNow')}
          </p>
        </div>
      </div>

      {/* Signup link */}
      <button
        className="w-full text-sm font-medium text-[#7C3AED] text-center cursor-pointer hover:underline"
        onClick={handleSignup}
      >
        {t('public.freeSignup')}
      </button>
    </div>
  );
};

export default NoAccount;

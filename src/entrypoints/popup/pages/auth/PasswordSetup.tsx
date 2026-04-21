import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, Download, Languages } from 'lucide-react';
import { useUserStore } from '@/stores/userStore';
import { useSettingStore } from '@/stores/settingStore';
import { hashPassword } from '@/utils/crypto';
import PasswordInput from '@/components/PasswordInput';
import ImportBackup from '@/components/ImportBackup';
import i18n from '@/i18n';
import metahubLogo from '@/assets/images/metahub@2x.png';

const langOptions = [
  { label: '简体中文', value: 'zh-CN' },
  { label: 'English', value: 'en' },
] as const;

const PasswordSetup: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showLangMenu, setShowLangMenu] = React.useState(false);
  const [showImportBackup, setShowImportBackup] = React.useState(false);
  const langMenuRef = React.useRef<HTMLDivElement>(null);

  const schema = z.object({
    password: z.string().min(6, t('public.passwordLengthTip')),
    password_confirm: z.string().min(1, t('public.repeatPassword')),
  }).refine((data) => data.password === data.password_confirm, {
    message: t('public.passwordNoSame'),
    path: ['password_confirm'],
  });

  type FormValues = z.infer<typeof schema>;

  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormValues) => {
    const hash = await hashPassword(data.password);
    await useUserStore.getState().setPasshash(hash);
    await useUserStore.getState().setPassword(data.password);
    navigate('/');
  };

  const handleSwitchLang = (lang: string) => {
    i18n.changeLanguage(lang);
    useSettingStore.getState().setLang(lang as 'zh-CN' | 'en');
    setShowLangMenu(false);
  };

  // Close lang menu on outside click
  React.useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (langMenuRef.current && !langMenuRef.current.contains(e.target as Node)) {
        setShowLangMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="flex flex-col h-full w-full px-5 py-6 pb-7 gap-7 bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      {/* Hero Section */}
      <div className="flex flex-col gap-5 pb-2.5">
        {/* Utility Row */}
        <div className="flex justify-between items-center px-0.5">
          <button
            className="flex items-center gap-2 rounded-full bg-[#F1E8FF] px-3 py-2 border border-[#D8B4FE] cursor-pointer hover:bg-[#E9DEFF] transition-colors"
            onClick={() => setShowImportBackup(true)}
          >
            <Download className="w-3.5 h-3.5 text-[#B425F4]" />
            <span className="text-xs font-semibold text-[#A21CAF]">{t('public.importBackup')}</span>
          </button>

          <div className="relative" ref={langMenuRef}>
            <button
              className="flex items-center gap-1.5 rounded-full bg-white/85 backdrop-blur-sm px-2.5 py-2 border border-[#DDD6FE] cursor-pointer hover:bg-white transition-colors"
              onClick={() => setShowLangMenu((v) => !v)}
            >
              <Languages className="w-3.5 h-3.5 text-[#6C738A]" />
              <span className="text-xs font-medium text-[#4D5468]">{t('public.language')}</span>
              <ChevronDown className="w-3 h-3 text-[#8C92A4]" />
            </button>
            {showLangMenu && (
              <div className="absolute top-full right-0 mt-1 bg-white border border-border rounded-lg shadow-lg z-50 min-w-[130px] overflow-hidden">
                {langOptions.map((opt) => (
                  <div
                    key={opt.value}
                    className="px-4 py-2.5 text-sm hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => handleSwitchLang(opt.value)}
                  >
                    {opt.label}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Brand Area */}
        <div className="flex flex-col items-center gap-2.5 px-2">
          <img src={metahubLogo} className="w-[180px]" alt="MetaHub" />
        </div>

        {/* Supporting Copy */}
        <div className="flex flex-col items-center gap-2 px-[18px]">
          <p className="text-[15px] font-semibold text-[#312E81] text-center">
            {t('public.settingPassword')}
          </p>
          <p className="text-[13px] text-[#667085] text-center leading-[1.5]">
            {t('public.settingPasswordTip')}
          </p>
        </div>
      </div>

      {/* Form Section */}
      <form className="flex flex-col flex-1 justify-between pt-2.5" onSubmit={handleSubmit(onSubmit)}>
        {/* Form Stack */}
        <div className="flex flex-col gap-[18px]">
          <div className="flex flex-col gap-2">
            <PasswordInput
              className="!h-14 !rounded-[28px] !bg-white/90 backdrop-blur-sm !px-[22px] !border !border-[#DDD6FE] text-[15px] font-medium text-[#1E1E2F] placeholder:text-[#94A3B8] placeholder:font-medium focus-visible:!border-[#B425F4]"
              placeholder={t('public.password')}
              {...register('password')}
            />
            {errors.password?.message && (
              <span className="self-end mr-5 text-xs font-medium text-[#A21CAF]">
                {errors.password.message}
              </span>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <PasswordInput
              className="!h-14 !rounded-[28px] !bg-white/90 backdrop-blur-sm !px-[22px] !border !border-[#DDD6FE] text-[15px] font-medium text-[#1E1E2F] placeholder:text-[#94A3B8] placeholder:font-medium focus-visible:!border-[#B425F4]"
              placeholder={t('public.repeatPassword')}
              {...register('password_confirm')}
            />
            {errors.password_confirm?.message && (
              <span className="self-end mr-5 text-xs font-medium text-[#A21CAF]">
                {errors.password_confirm.message}
              </span>
            )}
          </div>
        </div>

        {/* CTA Area */}
        <div className="flex flex-col gap-3.5">
          <button
            type="submit"
            className="w-full h-14 rounded-[28px] text-base font-bold text-white cursor-pointer hover:opacity-90 transition-opacity bg-gradient-to-br from-[#D500F9] via-[#C300F4] to-[#8F2BFF]"
          >
            {t('public.start')}
          </button>
          <p className="text-xs text-[#7C8AA5] text-center leading-[1.5]">
            {t('public.settingPasswordTip')}
          </p>
        </div>
      </form>

      <ImportBackup isOpen={showImportBackup} onClose={() => setShowImportBackup(false)} />
    </div>
  );
};

export default PasswordSetup;

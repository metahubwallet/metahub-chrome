import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Check } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useSettingStore } from '@/stores/settingStore';
import i18n from '@/i18n';

const LANGUAGES = [
  { name: '简体中文', value: 'zh-CN' as const },
  { name: 'English', value: 'en' as const },
];

const SettingLanguagePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const language = useSettingStore((s) => s.language);
  const setLang = useSettingStore((s) => s.setLang);

  const handleChangeLang = async (value: 'zh-CN' | 'en') => {
    await setLang(value);
    i18n.changeLanguage(value);
    // navigate(-1);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('setting.setLanguage')} />

      <div className="flex-1 overflow-y-auto px-4">
        <div className="bg-[#FAFAFE] rounded-2xl border border-[#E9D8FD] mt-4 overflow-hidden">
          {LANGUAGES.map((item) => (
            <div
              key={item.value}
              className="flex items-center justify-between h-15 px-4 py-4 border-b border-[#F3E8FF] last:border-b-0 cursor-pointer hover:bg-[#F5F0FF]"
              onClick={() => handleChangeLang(item.value)}
            >
              <span className="text-base text-gray-800 pl-2">{item.name}</span>
              {item.value === language && (
                <Check className="h-5 w-5 text-primary" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SettingLanguagePage;

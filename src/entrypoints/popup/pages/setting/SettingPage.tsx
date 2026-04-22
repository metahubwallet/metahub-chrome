import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Server,
  Wallet,
  Shield,
  Network,
  Languages,
  RotateCcw,
  Info,
  ChevronRight,
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';

const SettingPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const manifest = typeof chrome !== 'undefined' ? chrome.runtime.getManifest() : { version: '1.0.0' };
  const currentVersion = manifest.version || '1.0.0';

  type MenuItem = {
    icon: React.ReactNode;
    title: string;
    subtitle?: string;
    onClick?: (() => void) | (() => Promise<void>);
    showArrow?: boolean;
  };

  const menuGroups: MenuItem[][] = [
    [
      {
        icon: <Server className="h-5 w-5" />,
        title: t('setting.nodesSetting'),
        onClick: () => navigate('/setting/network-select?type=node'),
      },
      {
        icon: <Wallet className="h-5 w-5" />,
        title: t('setting.manageWallets'),
        onClick: () => navigate('/setting/wallet-manage'),
      },
    ],
    [
      {
        icon: <Shield className="h-5 w-5" />,
        title: t('setting.whitelist'),
        onClick: () => navigate('/setting/whitelist'),
      },
      {
        icon: <Network className="h-5 w-5" />,
        title: t('setting.manageNetworks'),
        onClick: () => navigate('/setting/network-manage'),
      },
    ],
    [
      {
        icon: <Languages className="h-5 w-5" />,
        title: t('public.setLanguage'),
        subtitle: t('public.language'),
        onClick: () => navigate('/setting/language'),
      },
      {
        icon: <RotateCcw className="h-5 w-5" />,
        title: t('setting.currentVersion'),
        subtitle: currentVersion,
        onClick: undefined,
      },
      {
        icon: <Info className="h-5 w-5" />,
        title: t('setting.aboutUs'),
        onClick: () => window.open('https://wallet.metahub-ai.com/', '_blank'),
        showArrow: true,
      },
    ],
  ];

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('setting.setting')} />

      <div className="flex-1 overflow-y-auto px-4">
        {menuGroups.map((group, gi) => (
          <div key={gi} className="bg-[#FAFAFE] rounded-2xl border border-[#E9D8FD] mb-3 overflow-hidden">
            {group.map((item, ii) => (
              <div
                key={ii}
                className={`flex items-center h-15 px-4 py-4 border-b border-[#F3E8FF] last:border-b-0 ${item.onClick ? 'cursor-pointer hover:bg-[#F5F0FF]' : ''}`}
                onClick={item.onClick}
              >
                <div className="flex items-center justify-center w-8 text-[#7C3AED]">
                  {item.icon}
                </div>
                <div className="flex-1 flex items-center justify-between ml-3">
                  <span className="text-base text-gray-800">{item.title}</span>
                  <div className="flex items-center gap-2">
                    {item.subtitle && (
                      <span className="text-sm text-gray-400">{item.subtitle}</span>
                    )}
                    {item.onClick && <ChevronRight className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SettingPage;

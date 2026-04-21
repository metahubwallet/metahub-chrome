import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import EmptyState from '@/components/EmptyState';
import { useSettingStore } from '@/stores/settingStore';

const WhiteListPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const whitelist = useSettingStore((s) => s.whitelist);

  const domains = React.useMemo(() => {
    const seen = new Set<string>();
    const result: string[] = [];
    for (const item of whitelist) {
      if (!seen.has(item.domain)) {
        seen.add(item.domain);
        result.push(item.domain);
      }
    }
    return result;
  }, [whitelist]);

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('setting.whitelist')} />

      <div className="flex-1 overflow-y-auto px-4">
        {domains.length === 0 ? (
          <div className="flex items-center justify-center mt-32">
            <EmptyState />
          </div>
        ) : (
          <div className="bg-[#FAFAFE] rounded-2xl border border-[#E9D8FD] mt-4 overflow-hidden">
            {domains.map((domain) => (
              <div
                key={domain}
                className="flex items-center justify-between h-15 px-4 py-4 border-b border-[#F3E8FF] last:border-b-0 cursor-pointer hover:bg-[#F5F0FF]"
                onClick={() => navigate(`/setting/whitelist-detail?domain=${encodeURIComponent(domain)}`)}
              >
                <span className="text-sm text-gray-700">{domain}</span>
                <ChevronRight className="h-4 w-4 text-gray-400" />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default WhiteListPage;

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';

const ImportProtocolPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="h-full flex flex-col overflow-y-auto">
      <PageHeader title={t('public.readAndAgreeProtocols')} />
      <div className="flex-1 bg-white">
        <p className="m-4 text-[15px] text-gray-800 leading-relaxed">
          {t('public.viewUserProtocolsContent')}
        </p>
      </div>
    </div>
  );
};

export default ImportProtocolPage;

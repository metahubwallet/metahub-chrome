import * as React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import PasswordConfirm from '@/components/PasswordConfirm';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getChainInstance } from '@/hooks/useChainInstance';
import { isValidPublic } from '@/lib/keyring';
import { Permission } from '@/types/eos';
import GeneratePublicKey from './components/GeneratePublicKey';

interface Params {
  account: string;
  perms: Permission[];
  operatePerm: string;
  operateType: string;
  oldOperateKey?: string;
}

const AccountChangePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawParams = searchParams.get('params') || '{}';
  const chainId = searchParams.get('chainId') || '';
  const params: Params = JSON.parse(rawParams);

  const [newOperateKey, setNewOperateKey] = React.useState('');
  const [showGenerateKey, setShowGenerateKey] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const updateMutation = useMutation({
    mutationFn: async () => {
      const chainInstance = getChainInstance();
      const api = chainInstance.getApi(chainId);
      const newPerms = api
        .makeNewPermissions(
          params.perms,
          params.operateType,
          params.operatePerm,
          params.oldOperateKey,
          newOperateKey
        )
        .filter((p: any) => String(p.perm_name) === String(params.operatePerm));
      await api.updatePerms(params.account, newPerms);
    },
    onSuccess: () => {
      toast.success(t('public.executeSuccess'));
      navigate(-1);
    },
    onError: (e: any) => {
      toast.error(String(e?.message || e));
    },
  });

  const onSubmit = () => {
    if (!isValidPublic(newOperateKey)) {
      toast.error(t('setting.invalidPublicKey'));
      return;
    }
    setShowConfirm(true);
  };

  const doUpdate = () => {
    setShowConfirm(false);
    updateMutation.mutate();
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('setting.changeAuthority')} />

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {params.oldOperateKey && (
          <>
            <p className="mt-4 mb-2 text-[15px] font-semibold text-[#20173C]">{t('setting.currentPublicKey')}</p>
            <div className="border border-[#E9D8FD] rounded-2xl p-3 bg-[#FAFAFE] text-sm text-gray-600 break-all">
              {params.oldOperateKey}
            </div>
          </>
        )}

        <p className="mt-4 mb-2 text-[15px] font-semibold text-[#20173C]">{t('setting.newPublicKey')}</p>
        <Textarea
          placeholder={t('setting.enterPublicKeyTip')}
          value={newOperateKey}
          onChange={(e) => setNewOperateKey(e.target.value)}
          rows={4}
          className="resize-none rounded-2xl border-[#E3DCF7] bg-[#F7F4FF] focus:border-primary"
        />

        <div className="flex justify-end mt-2">
          <span
            className="text-xs text-primary border border-primary rounded-full px-3 py-1 cursor-pointer"
            onClick={() => setShowGenerateKey(true)}
          >
            {t('setting.generatePublicKey')}
          </span>
        </div>

        <div className="flex justify-center mt-10">
          <Button
            className="w-full h-12 bg-gradient-to-br from-[#D500F9] via-[#C300F4] to-[#8F2BFF] text-white rounded-[28px] font-bold shadow-none hover:opacity-90"
            onClick={onSubmit}
            disabled={updateMutation.isPending}
          >
            {t('setting.submit')}
          </Button>
        </div>

        <div className="text-sm text-gray-500 mt-5 space-y-1.5">
          <p>{t('setting.notice')}</p>
          <p>- {t('setting.changeNoticeOne')}</p>
          <p>- {t('setting.changeNoticeTwo')}</p>
        </div>
      </div>

      <GeneratePublicKey
        isOpen={showGenerateKey}
        chainId={chainId}
        onClose={() => setShowGenerateKey(false)}
        onUseKey={(key) => setNewOperateKey(key)}
      />

      <PasswordConfirm
        isOpen={showConfirm}
        title={t('setting.confirmPassword')}
        onClose={() => setShowConfirm(false)}
        onConfirm={doUpdate}
      />
    </div>
  );
};

export default AccountChangePage;

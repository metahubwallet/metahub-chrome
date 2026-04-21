import * as React from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Plus, Shield, KeyRound, Copy, ArrowLeftRight } from 'lucide-react';
import { toast } from 'sonner';
import { useMutation } from '@tanstack/react-query';
import PageHeader from '@/components/PageHeader';
import ClipButton from '@/components/ClipButton';
import PasswordConfirm from '@/components/PasswordConfirm';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useWalletStore } from '@/stores/walletStore';
import { getChainInstance } from '@/hooks/useChainInstance';
import { isV3Encrypted, decryptV3, makeKeySalt, legacyDecrypt, legacyMd5, legacyPassword1 } from '@/utils/crypto';
import { isValidPublic, publicKeyToLegacy } from '@/lib/keyring';
import { Permission } from '@/types/eos';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';

interface UpdateParams {
  account: string;
  perms: Permission[];
  operatePerm: string;
  operateType: string;
  oldOperateKey?: string;
}

const AccountDetailPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const account = searchParams.get('account') || '';
  const chainId = searchParams.get('chainId') || '';

  const wallets = useWalletStore((s) => s.wallets);
  const setWallets = useWalletStore((s) => s.setWallets);
  const selectedIndex = useWalletStore((s) => s.selectedIndex);
  const setSelectedIndex = useWalletStore((s) => s.setSelectedIndex);

  const walletIdx = wallets.findIndex((w) => w.name === account && w.chainId === chainId);
  const wallet = wallets[walletIdx >= 0 ? walletIdx : 0];

  const currentKeys = wallet?.keys.map((k) => k.publicKey) || [];
  const currentKeysLegacy = currentKeys.map((k) => publicKeyToLegacy(k));
  const currentPerms = wallet?.keys.flatMap((k) => k.permissions).map(String) || [];

  const [allPerms, setAllPerms] = React.useState<Permission[]>([]);
  const [showPrivateKey, setShowPrivateKey] = React.useState<0 | 1 | 2>(0);
  const [showKeyText, setShowKeyText] = React.useState('');
  const [removeKeyInfo, setRemoveKeyInfo] = React.useState<{ key: string; perm: string } | null>(null);
  const [showRemoveConfirm, setShowRemoveConfirm] = React.useState(false);
  const [showDestroyConfirm, setShowDestroyConfirm] = React.useState(false);
  const [legacyKeys, setLegacyKeys] = React.useState<Record<string, boolean>>({});

  const fetchPermissions = async () => {
    if (!wallet) return;
    const chainInstance = getChainInstance();
    const result = await chainInstance.fetchPermissions(wallet.name, wallet.chainId);
    if (result.code !== 200) {
      toast.error(result.msg);
      navigate(-1);
      return;
    }
    const owner = result.permissions.find((p: Permission) => String(p.perm_name) === 'owner');
    const active = result.permissions.find((p: Permission) => String(p.perm_name) === 'active');
    const others = result.permissions.filter(
      (p: Permission) => String(p.perm_name) !== 'owner' && String(p.perm_name) !== 'active'
    );
    setAllPerms([...(owner ? [owner] : []), ...(active ? [active] : []), ...others]);
  };

  React.useEffect(() => {
    if (walletIdx === -1) {
      navigate(-1);
      return;
    }
    fetchPermissions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletIdx, location.key]);

  const removeKeyMutation = useMutation({
    mutationFn: async ({ operatePerm, key }: { operatePerm: string; key: string }) => {
      const chainInstance = getChainInstance();
      const api = chainInstance.getApi(chainId);
      const newPerms = await api.makeNewPermissions(allPerms, 'remove', operatePerm, key);
      const updatePerms = newPerms.filter((p: any) => String(p.perm_name) === operatePerm);
      await api.updatePerms(account, updatePerms);
      return newPerms;
    },
    onSuccess: (newPerms) => {
      setAllPerms(newPerms);
      toast.success(t('public.executeSuccess'));
      setTimeout(() => fetchPermissions(), 2000);
    },
    onError: (e: any) => {
      toast.error(String(e?.message || e));
    },
  });

  const handleRemoveKey = () => {
    if (!removeKeyInfo) return;
    removeKeyMutation.mutate({ operatePerm: removeKeyInfo.perm, key: removeKeyInfo.key });
    setRemoveKeyInfo(null);
    setShowRemoveConfirm(false);
  };

  const handleRemoveAccount = () => {
    const idx = wallets.findIndex((w) => w.name === account && w.chainId === chainId);
    const updated = wallets.filter((_, i) => i !== idx);
    setWallets(updated);

    if (updated.length === 0) {
      setSelectedIndex(0);
      toast.success(t('password.deleteSuccess'));
      navigate('/');
      return;
    }

    let newIndex = selectedIndex;
    if (newIndex >= updated.length) {
      newIndex = updated.length - 1;
    } else if (idx <= selectedIndex) {
      newIndex = Math.max(0, selectedIndex - 1);
    }
    setSelectedIndex(newIndex);
    toast.success(t('password.deleteSuccess'));
    navigate(-1);
  };

  const viewAccountChange = (operatePerm: string, operateType: string, oldOperateKey?: string) => {
    const params: UpdateParams = { account, perms: allPerms, operatePerm, operateType, oldOperateKey };
    navigate(`/setting/account-change?params=${encodeURIComponent(JSON.stringify(params))}&chainId=${encodeURIComponent(chainId)}`);
  };

  const viewPrivateKey = (key: string) => {
    setShowPrivateKey(1);
    setShowKeyText(key);
  };

  const confirmViewPrivateKey = async (password: string) => {
    if (isValidPublic(showKeyText)) {
      const showKeyLegacy = publicKeyToLegacy(showKeyText);
      const pk = wallet?.keys.find((k) => publicKeyToLegacy(k.publicKey) === showKeyLegacy)?.privateKey;
      if (pk) {
        let plainKey: string;
        if (isV3Encrypted(pk)) {
          plainKey = await decryptV3(pk, password, makeKeySalt(wallet.seed));
        } else {
          plainKey = legacyDecrypt(pk, legacyMd5(wallet.seed + legacyPassword1(password)));
        }
        setShowKeyText(plainKey);
      }
    }
    setShowPrivateKey(2);
  };

  const isCanModify = (permName: any, permParent: any) => {
    return currentPerms.includes('owner') || currentPerms.includes(String(permParent));
  };

  const isCanDelete = (permName: any) => {
    const name = String(permName);
    const selPerm = allPerms.find((p) => String(p.perm_name) === name);
    if (!selPerm) return false;
    if ((name === 'owner' || name === 'active') && selPerm.required_auth.keys.length <= 1) {
      return false;
    }
    return true;
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('setting.authorityManage')} />

      <div className="flex-1 overflow-y-auto px-4">
        <div>
          {/* Account name row */}
          <div className="flex justify-between items-center h-[50px] px-4 rounded-2xl bg-[#FAFAFE] border border-[#E9D8FD] mt-3 text-sm text-gray-700">
            <span>{t('setting.accountName')}</span>
            <span className="font-semibold">{account}</span>
          </div>

          {/* Permissions */}
          {allPerms.map((perm) => (
            <div key={String(perm.perm_name)}>
              <div className="flex items-center justify-between mt-2 h-9 text-base text-gray-800">
                <div className="flex items-center gap-1.5">
                  {String(perm.perm_name) === 'owner' ? (
                    <Shield className="h-4 w-4 text-[#7C3AED]" />
                  ) : (
                    <KeyRound className="h-4 w-4 text-[#7C3AED]" />
                  )}
                  <span>{String(perm.perm_name)}</span>
                </div>
                {(currentPerms.includes('owner') || currentPerms.includes(String(perm.perm_name))) && (
                  <Plus
                    className="h-5 w-5 cursor-pointer text-gray-600"
                    onClick={() => viewAccountChange(perm.perm_name, 'add')}
                  />
                )}
              </div>

              {perm.required_auth.keys.map((item, idx) => {
                const keyStr = String(item.key);
                const keyId = `${perm.perm_name}-${idx}`;
                const isLegacy = legacyKeys[keyId] ?? false;
                const displayKey = isLegacy ? publicKeyToLegacy(keyStr) : keyStr;
                return (
                <div key={idx} className="bg-[#FAFAFE] rounded-2xl border border-[#E9D8FD] mb-2 px-3 pt-4 pb-3">
                  <p className="text-sm text-gray-600 break-all mb-1 leading-6">
                    {displayKey}
                    <ClipButton value={displayKey} className="align-middle p-0.5 ml-1.5" />
                    <button
                      type="button"
                      className="inline-flex align-middle p-0.5 ml-0.5 text-[#9CA3AF] hover:text-[#6B7280] cursor-pointer"
                      title={isLegacy ? 'PUB_K1_ format' : 'EOS format'}
                      onClick={() => setLegacyKeys((prev) => ({ ...prev, [keyId]: !isLegacy }))}
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                    </button>
                  </p>

                  <div className="flex items-center justify-between mt-2">
                    <div>
                      {(currentKeys.includes(keyStr) || currentKeysLegacy.includes(publicKeyToLegacy(keyStr))) && (
                        <span className="text-xs text-primary border border-primary rounded px-1">
                          {t('setting.imported')}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {isCanDelete(perm.perm_name) && (currentPerms.includes('owner') || currentPerms.includes(String(perm.perm_name))) && (
                        <div
                          className="bg-[#FEE2E2] text-[#EF4444] text-xs rounded-full px-3 h-6 flex items-center cursor-pointer"
                          onClick={() => {
                            setRemoveKeyInfo({ perm: String(perm.perm_name), key: keyStr });
                            setShowRemoveConfirm(true);
                          }}
                        >
                          {t('setting.remove')}
                        </div>
                      )}
                      {isCanModify(perm.perm_name, perm.parent) && (
                        <div
                          className="bg-primary text-white text-xs rounded-full px-3 h-6 flex items-center cursor-pointer"
                          onClick={() => viewAccountChange(String(perm.perm_name), 'modify', keyStr)}
                        >
                          {t('setting.modify')}
                        </div>
                      )}
                      {(currentKeys.includes(keyStr) || currentKeysLegacy.includes(publicKeyToLegacy(keyStr))) && (
                      <div
                        className="bg-primary text-white text-xs rounded-full px-3 h-6 flex items-center cursor-pointer"
                        onClick={() => viewPrivateKey(keyStr)}
                      >
                        {t('setting.showKey')}
                      </div>
                      )}
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          ))}
        </div>

        {/* Remove account button */}
        <div className="flex justify-center my-5">
          <Button
            variant="outline"
            className="w-36 h-10 rounded-xl bg-[#FEE2E2] border border-[#FECACA] text-[#EF4444] hover:bg-[#FECACA] hover:text-[#EF4444]"
            onClick={() => setShowDestroyConfirm(true)}
          >
            {t('setting.removeWallet')}
          </Button>
        </div>

        {/* Notices */}
        <div className="text-sm text-gray-500 mx-4 mt-5 mb-4 space-y-1.5">
          <p>{t('setting.notice')}</p>
          <p>- {t('setting.ownerNotice')}</p>
          <p>- {t('setting.activeNotice')}</p>
          <p>- {t('setting.securityNotice')}</p>
        </div>
      </div>

      {/* Remove Key Confirm */}
      <PasswordConfirm
        isOpen={showRemoveConfirm}
        title={t('setting.confirmRemoveKey')}
        onClose={() => setShowRemoveConfirm(false)}
        onConfirm={handleRemoveKey}
      />

      {/* Destroy Confirm */}
      <PasswordConfirm
        isOpen={showDestroyConfirm}
        title={t('setting.confirmRemoveAccount')}
        onClose={() => setShowDestroyConfirm(false)}
        onConfirm={handleRemoveAccount}
      />

      {/* View Private Key - password prompt */}
      <PasswordConfirm
        isOpen={showPrivateKey === 1}
        title={t('setting.confirmPassword')}
        onClose={() => setShowPrivateKey(0)}
        onConfirm={confirmViewPrivateKey}
      />

      {/* Show Private Key */}
      <Dialog
        open={showPrivateKey === 2}
        onOpenChange={(open) => { if (!open) { setShowPrivateKey(0); setShowKeyText(''); } }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('setting.showKey')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 mb-1">{t('public.privateKey')}</p>
          <Textarea
            value={showKeyText}
            readOnly
            rows={4}
            className="resize-none"
          />
          <DialogFooter>
            <Button onClick={() => { setShowPrivateKey(0); setShowKeyText(''); }}>
              {t('public.ok')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AccountDetailPage;

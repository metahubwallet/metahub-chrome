import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { FileCheck, X } from 'lucide-react';
import { useChainStore } from '@/stores/chainStore';
import { useWalletStore } from '@/stores/walletStore';
import { useUserStore } from '@/stores/userStore';
import { useSettingStore } from '@/stores/settingStore';
import {
  hashPassword,
  encryptV3,
  makeKeySalt,
  decryptBackup,
} from '@/utils/crypto';
import { Wallet } from '@/types/wallet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import PasswordInput from '@/components/PasswordInput';
import i18n from '@/i18n';

interface ImportBackupProps {
  isOpen: boolean;
  onClose: () => void;
}

const ImportBackup: React.FC<ImportBackupProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [backupFile, setBackupFile] = React.useState<File | null>(null);

  const schema = z
    .object({
      encryptPassword: z.string().min(1, t('setting.encryptPassword')),
      password: z.string().min(1, t('public.password')),
      passwordConfirm: z.string().min(1, t('public.repeatPassword')),
    })
    .refine((data) => data.password === data.passwordConfirm, {
      message: t('public.passwordNoSame'),
      path: ['passwordConfirm'],
    });

  type FormValues = z.infer<typeof schema>;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  React.useEffect(() => {
    if (!isOpen) {
      reset();
      setBackupFile(null);
    }
  }, [isOpen, reset]);

  const importWalletsFromData = async (content: string, values: FormValues) => {
    let importData: any;
    try {
      const decryptedJson = await decryptBackup(content, values.encryptPassword);
      importData = JSON.parse(decryptedJson);
    } catch (_err) {
      toast.error(t('public.encryptPasswordError'));
      return;
    }

    if (!importData.wallets) {
      toast.error(t('public.importErrorTip2'));
      return;
    }

    // Re-encrypt all private keys with the new password using v2 scheme
    for (const wallet of importData.wallets) {
      const salt = makeKeySalt(wallet.seed);
      for (const k of wallet.keys) {
        k.privateKey = await encryptV3(k.privateKey, values.password, salt);
      }
    }

    const passhash = await hashPassword(values.password);

    const chainStore = useChainStore.getState();
    const walletStore = useWalletStore.getState();
    const userStore = useUserStore.getState();
    const settingStore = useSettingStore.getState();

    await chainStore.setNetworks(importData.networks);
    if (importData.selectedRpcs && typeof importData.selectedRpcs === 'object') {
      for (const [chainId, endpoint] of Object.entries(importData.selectedRpcs)) {
        await chainStore.setSelectedRpc(chainId, endpoint as string);
      }
    }
    if (importData.customRpcs) await chainStore.setCustomRpcs(importData.customRpcs);

    const wallets: Wallet[] = importData.wallets.map((w: any) => ({
      name: w.name,
      chainId: w.chainId,
      seed: w.seed,
      blockchain: w.blockchain || 'eos',
      smoothMode: w.smoothMode,
      keys: w.keys,
    }));

    await walletStore.setWallets(wallets);
    if (Array.isArray(importData.recentTransfers)) {
      await walletStore.setRecentTransfers(importData.recentTransfers);
    }
    const selectedIndex =
      typeof importData.selectedIndex === 'number' && importData.selectedIndex >= 0
        ? importData.selectedIndex
        : 0;
    await walletStore.setSelectedIndex(selectedIndex);
    if (importData.userTokens && typeof importData.userTokens === 'object') {
      await walletStore.setUserTokens(importData.userTokens);
    }
    await settingStore.setWhitelist(importData.whitelist || []);
    await userStore.setPasshash(passhash);
    await userStore.setLocked();

    if (importData.language) {
      i18n.changeLanguage(importData.language);
      await settingStore.setLang(importData.language);
    }

    toast.success(t('public.importBackupSuccess'));
    onClose();
    navigate('/');
  };

  const onSubmit = (values: FormValues) => {
    if (!backupFile) {
      toast.warning(t('public.importErrorTip'));
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      importWalletsFromData(content, values);
    };
    reader.readAsText(backupFile);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('public.importBackup')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Encrypt password */}
          <div>
            <label className="block text-sm mb-1">{t('setting.encryptPassword')}</label>
            <PasswordInput
              placeholder={t('setting.encryptPassword')}
              {...register('encryptPassword')}
            />
            {errors.encryptPassword && (
              <p className="text-xs text-yellow-500 mt-1">{errors.encryptPassword.message}</p>
            )}
          </div>

          {/* New password */}
          <div>
            <label className="block text-sm mb-1">{t('setting.newPassword1')}</label>
            <PasswordInput
              placeholder={t('setting.newPassword1')}
              {...register('password')}
            />
            {errors.password && (
              <p className="text-xs text-yellow-500 mt-1">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm password */}
          <div>
            <label className="block text-sm mb-1">{t('setting.newPassword2')}</label>
            <PasswordInput
              placeholder={t('setting.newPassword2')}
              {...register('passwordConfirm')}
            />
            {errors.passwordConfirm && (
              <p className="text-xs text-yellow-500 mt-1">{errors.passwordConfirm.message}</p>
            )}
          </div>

          {/* File upload */}
          <div>
            {!backupFile ? (
              <label className="inline-flex items-center cursor-pointer text-primary text-sm underline">
                <input
                  type="file"
                  className="hidden"
                  accept=".bak,.json,.txt,.backup"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setBackupFile(file);
                  }}
                />
                {t('public.selectFileToImport')}
              </label>
            ) : (
              <div className="flex items-center justify-between border border-gray-200 rounded px-3 py-2">
                <div className="flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600">{backupFile.name}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBackupFile(null)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <DialogFooter className="flex flex-row gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              {t('public.cancel')}
            </Button>
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary-hover text-white">
              {t('public.ok')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default ImportBackup;

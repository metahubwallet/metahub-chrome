import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import PasswordInput from '@/components/PasswordInput';
import { useUserStore } from '@/stores/userStore';
import { useWalletStore } from '@/stores/walletStore';
import { useChainStore } from '@/stores/chainStore';
import { useSettingStore } from '@/stores/settingStore';
import {
  verifyPassword,
  isV3Encrypted,
  decryptV3,
  makeKeySalt,
  legacyDecrypt,
  legacyMd5,
  legacyPassword1,
  encryptBackup,
} from '@/utils/crypto';

interface ExportWalletProps {
  isOpen: boolean;
  onClose: () => void;
}

const ExportWallet: React.FC<ExportWalletProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [walletPassword, setWalletPassword] = React.useState('');
  const [encryptPassword, setEncryptPassword] = React.useState('');

  const handleClose = () => {
    setWalletPassword('');
    setEncryptPassword('');
    onClose();
  };

  const handleSubmit = async () => {
    const userStore = useUserStore.getState();

    const valid = await verifyPassword(walletPassword, userStore.passhash);
    if (!valid) {
      toast.error(t('password.error'));
      return;
    }

    const isInvalid =
      encryptPassword === '' ||
      encryptPassword.length < 8 ||
      !(/[a-zA-Z]+/.test(encryptPassword) && /[0-9]+/.test(encryptPassword));

    if (isInvalid) {
      toast.warning(t('setting.encryptPasswordTip'));
      return;
    }

    await exportWallet(walletPassword, encryptPassword);
    handleClose();
  };

  const exportWallet = async (walletPwd: string, encPwd: string) => {
    const chainStore = useChainStore.getState();
    const settingStore = useSettingStore.getState();

    const walletState = useWalletStore.getState();
    const exportData: any = {
      wallets: JSON.parse(JSON.stringify(walletState.wallets)),
      selectedIndex: walletState.selectedIndex,
      userTokens: walletState.userTokens,
      recentTransfers: walletState.recentTransfers,
      networks: chainStore.networks,
      selectedRpcs: chainStore.selectedRpcs,
      customRpcs: chainStore.customRpcs,
      whitelist: settingStore.whitelist,
      language: settingStore.language,
    };

    // Decrypt all private keys for export
    for (const wallet of exportData.wallets) {
      const salt = makeKeySalt(wallet.seed);
      for (const key of wallet.keys) {
        if (isV3Encrypted(key.privateKey)) {
          key.privateKey = await decryptV3(key.privateKey, walletPwd, salt);
        } else {
          key.privateKey = legacyDecrypt(key.privateKey, legacyMd5(wallet.seed + legacyPassword1(walletPwd)));
        }
      }
    }

    const encryptedData = await encryptBackup(JSON.stringify(exportData), encPwd);

    const blob = new Blob([encryptedData], { type: 'application/metahub' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);

    const today = new Date().toISOString().split('T')[0];
    link.download = `Metahub-${today}.backup`;
    link.click();

    toast.success(t('wallet.backupSuccess'));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('setting.exportWallet')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm mb-2">{t('setting.walletPassword')}</p>
            <PasswordInput
              placeholder={t('setting.walletPassword')}
              value={walletPassword}
              onChange={(e) => setWalletPassword(e.target.value)}
            />
          </div>

          <div>
            <p className="text-sm mb-2">{t('setting.encryptPassword')}</p>
            <PasswordInput
              placeholder={t('setting.encryptPassword')}
              value={encryptPassword}
              onChange={(e) => setEncryptPassword(e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">{t('setting.encryptPasswordTip')}</p>
          </div>
        </div>

        <DialogFooter className="flex flex-row gap-3">
          <Button variant="outline" className="flex-1" onClick={handleClose}>
            {t('public.cancel')}
          </Button>
          <Button className="flex-1 bg-primary hover:bg-primary-hover text-white" onClick={handleSubmit}>
            {t('public.ok')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ExportWallet;

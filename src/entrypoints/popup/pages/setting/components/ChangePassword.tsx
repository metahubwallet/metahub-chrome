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
import {
  verifyPassword,
  hashPassword,
  isV3Encrypted,
  decryptV3,
  encryptV3,
  makeKeySalt,
  legacyDecrypt,
  legacyMd5,
  legacyPassword1,
} from '@/utils/crypto';
import { privateToPublic } from '@/lib/keyring';

interface ChangePasswordProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePassword: React.FC<ChangePasswordProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [passwordOld, setPasswordOld] = React.useState('');
  const [passwordNew, setPasswordNew] = React.useState('');
  const [passwordConfirm, setPasswordConfirm] = React.useState('');

  const handleClose = () => {
    setPasswordOld('');
    setPasswordNew('');
    setPasswordConfirm('');
    onClose();
  };

  const handleSubmit = async () => {
    const userStore = useUserStore.getState();

    const valid = await verifyPassword(passwordOld, userStore.passhash);
    if (!valid) {
      toast.warning(t('password.error'));
      return;
    }

    if (!passwordNew || !passwordConfirm) {
      toast.warning(t('password.empty'));
      return;
    }

    if (passwordNew !== passwordConfirm) {
      toast.warning(t('public.passwordNoSame'));
      return;
    }

    // Re-encrypt wallets in memory first. If any key fails an integrity check,
    // throw before writing anything — the old ciphertext stays intact.
    const walletStore = useWalletStore.getState();
    let updatedWallets;
    try {
      updatedWallets = await Promise.all(
        walletStore.wallets.map(async (wallet) => {
          const salt = makeKeySalt(wallet.seed);
          const newKeys = await Promise.all(
            wallet.keys.map(async (key) => {
              let plainKey: string;
              if (isV3Encrypted(key.privateKey)) {
                // AES-GCM throws on wrong password — no extra check needed.
                plainKey = await decryptV3(key.privateKey, passwordOld, salt);
              } else {
                plainKey = legacyDecrypt(
                  key.privateKey,
                  legacyMd5(wallet.seed + legacyPassword1(passwordOld))
                );
              }

              // Integrity check: decrypted WIF must derive back to stored public key.
              // Guards against AES-CBC garbage silently passing through.
              const derivedPub = privateToPublic(plainKey);
              if (!derivedPub || derivedPub !== key.publicKey) {
                throw new Error(
                  `Key integrity check failed for ${key.publicKey} in wallet "${wallet.name}". Password change aborted.`
                );
              }

              const encrypted = await encryptV3(plainKey, passwordNew, salt);
              return { ...key, privateKey: encrypted };
            })
          );
          return { ...wallet, keys: newKeys };
        })
      );
    } catch (e: any) {
      toast.error(e?.message || t('password.error'));
      return;
    }

    // All keys re-encrypted successfully. Commit wallets first, then passhash —
    // if the wallets write fails, passhash stays in sync with the old ciphertext.
    const newHash = await hashPassword(passwordNew);
    await walletStore.setWallets(updatedWallets);
    await userStore.setPasshash(newHash);
    await userStore.setLocked();

    toast.success(t('public.executeSuccess'));
    handleClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('setting.changePassword')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm mb-2">{t('setting.oldPassword')}</p>
            <PasswordInput
              placeholder={t('setting.oldPassword')}
              value={passwordOld}
              onChange={(e) => setPasswordOld(e.target.value)}
            />
          </div>

          <div>
            <p className="text-sm mb-2">{t('setting.newPassword1')}</p>
            <PasswordInput
              placeholder={t('setting.newPassword1')}
              value={passwordNew}
              onChange={(e) => setPasswordNew(e.target.value)}
            />
          </div>

          <div>
            <p className="text-sm mb-2">{t('setting.newPassword2')}</p>
            <PasswordInput
              placeholder={t('setting.newPassword2')}
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
            />
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

export default ChangePassword;

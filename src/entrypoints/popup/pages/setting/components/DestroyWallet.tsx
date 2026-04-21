import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import PasswordConfirm from '@/components/PasswordConfirm';
import ConfirmDialog from '@/components/ConfirmDialog';
import { useWalletStore } from '@/stores/walletStore';
import { useUserStore } from '@/stores/userStore';

interface DestroyWalletProps {
  isOpen: boolean;
  onClose: () => void;
}

const DestroyWallet: React.FC<DestroyWalletProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [showSecondConfirm, setShowSecondConfirm] = React.useState(false);

  const handlePasswordConfirmed = () => {
    setShowSecondConfirm(true);
  };

  const handleClose = () => {
    setShowSecondConfirm(false);
    onClose();
  };

  const handleFinalConfirm = async () => {
    const walletStore = useWalletStore.getState();
    await walletStore.setWallets([]);
    await walletStore.setUserTokens({});

    const userStore = useUserStore.getState();
    await userStore.setLocked();
    await userStore.setPasshash('');

    toast.success(t('password.deleteSuccess'));
    handleClose();
    navigate('/');
  };

  return (
    <>
      <PasswordConfirm
        isOpen={isOpen && !showSecondConfirm}
        title={t('setting.confirmDestroy')}
        onClose={handleClose}
        onConfirm={handlePasswordConfirmed}
      />

      <ConfirmDialog
        isOpen={showSecondConfirm}
        title={t('setting.reconfirm')}
        onClose={handleClose}
        onConfirm={handleFinalConfirm}
        confirmText={t('public.ok')}
        cancelText={t('public.cancel')}
      >
        <p>{t('setting.confirmDestroy')}</p>
      </ConfirmDialog>
    </>
  );
};

export default DestroyWallet;

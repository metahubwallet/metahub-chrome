import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useUserStore } from '@/stores/userStore';
import { verifyPassword } from '@/utils/crypto';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import PasswordInput from '@/components/PasswordInput';

interface PasswordConfirmProps {
  isOpen: boolean;
  title: string;
  onClose: () => void;
  onConfirm: (password: string) => void;
}

const PasswordConfirm: React.FC<PasswordConfirmProps> = ({
  isOpen,
  title,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [password, setPassword] = React.useState('');

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  const handleSubmit = async () => {
    const passhash = useUserStore.getState().passhash;
    const valid = await verifyPassword(password, passhash);
    if (!valid) {
      toast.error(t('password.error'));
      return;
    }
    const pwd = password;
    setPassword('');
    onClose();
    onConfirm(pwd);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSubmit();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <PasswordInput
          placeholder={t('password.inputPassword')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />

        <DialogFooter className="flex flex-row gap-3">
          <Button variant="outline" className="flex-1" onClick={handleClose}>
            {t('public.cancel')}
          </Button>
          <Button
            className="flex-1 bg-primary hover:bg-primary-hover text-white"
            onClick={handleSubmit}
          >
            {t('public.ok')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PasswordConfirm;

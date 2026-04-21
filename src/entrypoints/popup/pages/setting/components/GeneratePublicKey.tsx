import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import ClipButton from '@/components/ClipButton';
import { getRandomKeyPair } from '@/lib/keyring';

interface GeneratePublicKeyProps {
  isOpen: boolean;
  chainId: string;
  onClose: () => void;
  onUseKey: (publicKey: string) => void;
}

const GeneratePublicKey: React.FC<GeneratePublicKeyProps> = ({
  isOpen,
  chainId: _chainId,
  onClose,
  onUseKey,
}) => {
  const { t } = useTranslation();
  const [publicKey, setPublicKey] = React.useState('');
  const [privateKey, setPrivateKey] = React.useState('');
  const [isGenerating, setIsGenerating] = React.useState(false);

  const handleGenerateKey = React.useCallback(async () => {
    setIsGenerating(true);
    try {
      const keypair = await getRandomKeyPair();
      if (keypair) {
        setPublicKey(keypair.publicKey);
        setPrivateKey(keypair.privateKey);
      }
    } finally {
      setIsGenerating(false);
    }
  }, []);

  React.useEffect(() => {
    if (isOpen) {
      handleGenerateKey();
    }
  }, [isOpen, handleGenerateKey]);

  const handleUseKey = () => {
    onUseKey(publicKey);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('setting.generatePublicKey')}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* Public key row */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="w-20 text-sm text-gray-600">{t('public.publicKey')}</span>
            <div className="flex-1 text-xs text-gray-500 break-all px-2">{publicKey}</div>
            <ClipButton value={publicKey} />
          </div>

          {/* Private key row */}
          <div className="flex items-center justify-between py-3 border-b border-gray-100">
            <span className="w-20 text-sm text-gray-600">{t('public.privateKey')}</span>
            <div className="flex-1 text-xs text-gray-500 break-all px-2">{privateKey}</div>
            <ClipButton value={privateKey} />
          </div>

          {/* Tips */}
          <div className="text-xs text-red-500 space-y-1 mt-3">
            <p>{t('setting.notice')}</p>
            <p>- {t('setting.generateTipOne')}</p>
            <p>- {t('setting.generateTipTwo')}</p>
            <p>- {t('setting.generateTipThree')}</p>
          </div>

          {/* Buttons */}
          <div className="flex justify-between mt-3">
            <Button
              variant="outline"
              className="flex items-center gap-1"
              onClick={handleGenerateKey}
              disabled={isGenerating}
            >
              <RefreshCw className="h-4 w-4" />
              {t('setting.refresh')}
            </Button>
            <Button
              className="bg-primary hover:bg-primary-hover text-white"
              onClick={handleUseKey}
              disabled={!publicKey}
            >
              {t('setting.useIt')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default GeneratePublicKey;

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';
import QRCode from 'qrcode';
import { ScanLine, Info, Copy, Check } from 'lucide-react';
import PageHeader from '@/components/PageHeader';
import { useWalletStore } from '@/stores/walletStore';
import { useChainStore } from '@/stores/chainStore';
import { getNetworkLocalIcon } from '@/utils/network';
import { toast } from 'sonner';

const ReceivePage: React.FC = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const currentWallet = useWalletStore((s) => s.currentWallet());
  const currentNetwork = useChainStore((s) => s.currentNetwork);

  const canvasRef = React.useRef<HTMLCanvasElement>(null);
  const [copied, setCopied] = React.useState(false);

  const symbol = searchParams.get('symbol') || useChainStore.getState().currentSymbol();
  const contract = searchParams.get('contract') || 'eosio.token';

  const walletName = currentWallet?.name ?? '';

  const displayName = React.useMemo(() => {
    if (walletName.length > 12) {
      return `${walletName.substring(0, 10)}...${walletName.substring(walletName.length - 8)}`;
    }
    return walletName;
  }, [walletName]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletName);
      setCopied(true);
      toast.success(t('public.copySuccess') || 'Copied');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('public.copyFail') || 'Failed to copy');
    }
  };

  React.useEffect(() => {
    if (!canvasRef.current || !walletName) return;

    let to = walletName;
    let memo = '';
    if (walletName.length > 12) {
      to = 'etheraccount';
      memo = walletName;
    }

    const data = {
      protocol: 'ScanProtocol',
      action: 'transfer',
      address: to,
      contract,
      symbol,
      precision: 4,
      blockchain: (currentNetwork?.chain ?? 'eos').toUpperCase(),
      amount: '0',
      memo,
    };

    QRCode.toCanvas(
      canvasRef.current,
      JSON.stringify(data),
      { errorCorrectionLevel: 'M', scale: 4, width: 150, margin: 1 },
      (error) => {
        if (error) console.error('QRCode error:', error);
      },
    );
  }, [walletName, symbol, contract, currentNetwork]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-[#F7F4FF] via-[#FFFEFF] to-[#F4F7FF]">
      <PageHeader title={t('wallet.receive')} />

      {/* Body: gap-16 = gap 16, items-center */}
      <div className="flex-1 flex flex-col items-center gap-4 px-4 pb-6">
        {/* Network badge: cornerRadius 20, bg #F0EAFF, border #E9D8FD, padding [6,14,6,8], gap 8 */}
        <div className="flex items-center gap-2 rounded-full bg-[#F0EAFF] border border-[#E9D8FD] pl-2 pr-3.5 py-1.5">
          <img src={getNetworkLocalIcon(currentNetwork?.chain)} alt={currentNetwork?.name} className="w-6 h-6 rounded-full" />
          <span className="text-[13px] font-semibold text-[#7C3AED]">
            {currentNetwork?.name}
          </span>
        </div>

        {/* QR Card: w=300, cornerRadius 24, bg white, border #E9D8FD, shadow, padding 18, gap 16 */}
        <div className="w-[300px] bg-white rounded-3xl border border-[#E9D8FD] shadow-[0_8px_32px_rgba(124,58,237,0.08)] p-[18px] flex flex-col items-center gap-4">
          {/* Scan text row: scan-line icon + text */}
          <div className="flex items-center justify-center gap-2 w-full">
            <ScanLine className="w-[18px] h-[18px] text-[#7C3AED]" />
            <span className="text-[13px] font-medium text-[#6B7280]">
              {t('wallet.scanQRCodeToPay') || 'Scan QR code to pay'}
            </span>
          </div>

          {/* QR Wrapper: 190x190, cornerRadius 16, gradient bg, with corner brackets */}
          <div className="relative w-[190px] h-[190px] rounded-2xl bg-gradient-to-br from-[#F8F5FF] to-[#F0EAFF]">
            {/* Corner brackets */}
            <svg className="absolute top-0 left-0 w-6 h-6" viewBox="0 0 24 24" fill="none">
              <path d="M2 8V4C2 2.9 2.9 2 4 2H8" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <svg className="absolute top-0 right-0 w-6 h-6" viewBox="0 0 24 24" fill="none">
              <path d="M16 2H20C21.1 2 22 2.9 22 4V8" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <svg className="absolute bottom-0 left-0 w-6 h-6" viewBox="0 0 24 24" fill="none">
              <path d="M2 16V20C2 21.1 2.9 22 4 22H8" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" />
            </svg>
            <svg className="absolute bottom-0 right-0 w-6 h-6" viewBox="0 0 24 24" fill="none">
              <path d="M22 16V20C21.1 22 21.1 22 20 22H16" stroke="#7C3AED" strokeWidth="3" strokeLinecap="round" />
            </svg>
            {/* QR inner: centered, white bg, cornerRadius 10 */}
            <div className="absolute inset-[10px] bg-white rounded-[10px] flex items-center justify-center">
              <canvas
                ref={canvasRef}
                id="qrccode-canvas"
                className="max-w-[150px] max-h-[150px]"
              />
            </div>
          </div>

          {/* Account section: vertical, gap 6, items-center */}
          <div className="flex flex-col items-center gap-1.5">
            <span className="text-xs font-medium text-[#9CA3AF]">
              {t('wallet.accountAddress') || 'Account Address'}
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-lg font-bold text-[#18181B]">{displayName}</span>
              <button
                type="button"
                aria-label="Copy address"
                onClick={handleCopy}
                className="text-[#9CA3AF] hover:text-[#6B7280] transition-colors cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Warning note: w=300, cornerRadius 12, bg #FEF3C7, padding [12,14], gap 8 */}
        <div className="w-[300px] rounded-xl bg-[#FEF3C7] px-3.5 py-3 flex gap-2">
          <Info className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
          <p className="text-xs text-[#92400E] leading-relaxed">
            {t('wallet.onlySendToken') || `Only send ${symbol} assets to this address—other assets may be permanently lost.`}
          </p>
        </div>
      </div>
    </div>
  );
};

export default ReceivePage;

import * as React from 'react';
import { useWalletStore } from '@/stores/walletStore';
import { useUIStore } from '@/stores/uiStore';
import TopNav from '@/components/TopNav';
import WalletHeader from './components/WalletHeader';
import CoinList from './components/CoinList';
import NoAccount from './components/NoAccount';
import { toast } from 'sonner';

// Module-level cache survives remounts within the same session
let cachedAssetUnit = 'usd';
let cachedAssetAmount = 0;
let hasCachedAsset = false;

const WalletHomePage: React.FC = () => {
  const wallets = useWalletStore((s) => s.wallets);
  const setShowAccountSelector = useUIStore((s) => s.setShowAccountSelector);
  const [assetUnit, setAssetUnit] = React.useState<string>(cachedAssetUnit);
  const [assetAmount, setAssetAmount] = React.useState<number>(cachedAssetAmount);
  const [isLoading, setIsLoading] = React.useState<boolean>(!hasCachedAsset);

  const handleSetUnit = (unit: string) => {
    cachedAssetUnit = unit;
    hasCachedAsset = true;
    setAssetUnit(unit);
  };

  const handleSetAmount = (amount: number) => {
    cachedAssetAmount = amount;
    hasCachedAsset = true;
    setAssetAmount(amount);
  };

  const hasWallets = wallets.length > 0;

  return (
    <div className="relative h-full overflow-y-auto pt-[70px]">
      <TopNav onChangeAccount={() => setShowAccountSelector(true)} />
      {hasWallets ? (
        <>
          <WalletHeader type={assetUnit} amount={assetAmount} isLoading={isLoading} />
          <CoinList
            onSetUnit={handleSetUnit}
            onSetAmount={handleSetAmount}
            onIsLoading={setIsLoading}
          />
        </>
      ) : (
        <NoAccount />
      )}
    </div>
  );
};

// Named export for keep-alive equivalent (route name reference)
WalletHomePage.displayName = 'wallet';

export default WalletHomePage;

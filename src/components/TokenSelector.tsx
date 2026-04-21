import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ToggleLeft, ToggleRight, Plus, Search, X } from 'lucide-react';
import { useWalletStore } from '@/stores/walletStore';
import { Balance, Coin } from '@/types/tokens';
import placeholderImg from '@/assets/images/placeholder.png';

interface TokenSelectorProps {
  isOpen: boolean;
  onClose: () => void;
}

const TokenSelector: React.FC<TokenSelectorProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const walletStore = useWalletStore();

  const [keywords, setKeywords] = React.useState('');
  const [tokenList, setTokenList] = React.useState<Balance[]>([]);
  const chainTokensCacheRef = React.useRef<Coin[]>([]);

  const initTokens = React.useCallback(() => {
    const chainTokens = walletStore.chainTokens();
    const currentUserTokens = walletStore.currentUserTokens();

    const tokens: Balance[] = [];
    chainTokensCacheRef.current = [];

    const seen = new Set<string>();
    for (const chainToken of chainTokens) {
      const key = `${chainToken.contract}-${chainToken.symbol}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const coin: Balance = {
        ...chainToken,
        amount: 0,
        isShow:
          currentUserTokens.findIndex(
            (x) => x.contract === chainToken.contract && x.symbol === chainToken.symbol
          ) >= 0,
      } as Balance;
      tokens.push(coin);
    }

    for (const ut of currentUserTokens) {
      if (tokens.findIndex((x) => x.contract === ut.contract && x.symbol === ut.symbol) >= 0)
        continue;
      tokens.push({ ...ut, amount: 0, isShow: true } as Balance);
    }

    chainTokensCacheRef.current = tokens.sort((x, y) => (x.symbol > y.symbol ? 1 : -1));
    searchTokens('', chainTokensCacheRef.current);
  }, [walletStore]);

  const searchTokens = (word: string, base?: Coin[]) => {
    const kw = word.toLowerCase();
    setKeywords(kw);
    const source = base || chainTokensCacheRef.current;
    const filtered =
      kw === ''
        ? source.slice()
        : source.filter(
            (token) =>
              token.symbol.toLowerCase().includes(kw) || token.contract.toLowerCase() === kw
          );

    const priority = (s: string) => {
      const u = s.toUpperCase();
      if (u === 'A') return 0;
      if (u === 'EOS') return 1;
      return 2;
    };
    const sorted = (filtered as Balance[]).sort((x, y) => {
      if (x.symbol.toLowerCase() === kw) return -1;
      if (y.symbol.toLowerCase() === kw) return 1;
      const px = priority(x.symbol);
      const py = priority(y.symbol);
      if (px !== py) return px - py;
      if (x.isShow !== y.isShow) return x.isShow ? -1 : 1;
      return x.symbol > y.symbol ? 1 : -1;
    });

    setTokenList(sorted.map((tk) => ({ ...tk, amount: 0 })));
  };

  React.useEffect(() => {
    if (isOpen) {
      initTokens();
    } else {
      setKeywords('');
      setTokenList([]);
      chainTokensCacheRef.current = [];
    }
  }, [isOpen, initTokens]);

  const handleAddToken = (token: Balance) => {
    // Update UI immediately
    setTokenList((prev) =>
      prev.map((tk) =>
        tk.contract === token.contract && tk.symbol === token.symbol
          ? { ...tk, isShow: !tk.isShow }
          : tk
      )
    );
    chainTokensCacheRef.current = chainTokensCacheRef.current.map((tk) =>
      tk.contract === token.contract && tk.symbol === token.symbol
        ? { ...tk, isShow: !((tk as any).isShow) }
        : tk
    ) as Coin[];

    // Persist in background
    const currentUserTokens = walletStore.currentUserTokens();
    if (token.isShow) {
      const updated = currentUserTokens.filter(
        (x) => !(x.contract === token.contract && x.symbol === token.symbol)
      );
      walletStore.setCurrentUserTokens(updated);
    } else {
      const newToken: Balance = {
        amount: 0,
        chain: token.chain,
        contract: token.contract,
        symbol: token.symbol,
        precision: token.precision,
        logo: '',
      };
      walletStore.setCurrentUserTokens([...currentUserTokens, newToken]);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Bottom Sheet */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 flex flex-col bg-white rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.1)] h-[450px] transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        {/* Title Row */}
        <div className="flex items-center justify-between h-14 px-5 shrink-0">
          <span className="text-[17px] font-semibold text-[#1A1A2E]">
            {t('wallet.addNewTokens')}
          </span>
          <button onClick={onClose} className="cursor-pointer text-[#6B7280] hover:text-[#4B5563]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Row */}
        <div className="flex items-center gap-2.5 px-5 h-[50px] shrink-0">
          <div className="flex-1 flex items-center h-[34px] rounded-lg bg-[#F3F4F6] px-3 gap-2">
            <Search className="w-4 h-4 text-[#9CA3AF] shrink-0" />
            <input
              className="flex-1 bg-transparent text-[13px] text-[#1A1A2E] placeholder:text-[#9CA3AF] outline-none"
              placeholder={t('wallet.searchKeyWord')}
              value={keywords}
              onChange={(e) => searchTokens(e.target.value)}
            />
          </div>
          <button
            onClick={() => {
              onClose();
              navigate('/add-token');
            }}
            className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center cursor-pointer shrink-0"
          >
            <Plus className="w-[18px] h-[18px] text-[#7C3AED]" />
          </button>
        </div>

        {/* Divider */}
        <div className="h-px bg-[#E5E7EB] mx-0" />

        {/* Token List */}
        <div className="flex-1 overflow-y-auto">
          {tokenList.length === 0 ? (
            <div className="flex items-center justify-center h-full min-h-[200px] text-[#9CA3AF] text-sm">
              {t('public.noData')}
            </div>
          ) : (
            tokenList.map((token, index) => (
              <React.Fragment key={`${token.contract}-${token.symbol}`}>
                {index > 0 && <div className="h-px bg-[#F3F4F6] mx-5" />}
                <div className="flex items-center h-14 px-5 gap-3">
                  {/* Token Logo */}
                  <img
                    src={token.logo || placeholderImg}
                    className="w-9 h-9 rounded-full border border-[#E5E7EB] shrink-0 object-cover"
                    alt={token.symbol}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = placeholderImg;
                    }}
                  />
                  {/* Token Info */}
                  <div className="flex-1 flex flex-col justify-center min-w-0 gap-0.5">
                    <span className="text-[14px] font-semibold text-[#1A1A2E]">{token.symbol}</span>
                    <span className="text-[12px] text-[#9CA3AF] truncate">{token.contract}</span>
                  </div>
                  {/* Toggle */}
                  <button
                    onClick={() => handleAddToken(token)}
                    className="shrink-0 cursor-pointer"
                    aria-label={token.isShow ? 'Remove token' : 'Add token'}
                  >
                    {token.isShow ? (
                      <ToggleRight className="w-7 h-7 text-[#7C3AED]" />
                    ) : (
                      <ToggleLeft className="w-7 h-7 text-[#D1D5DB]" />
                    )}
                  </button>
                </div>
              </React.Fragment>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TokenSelector;

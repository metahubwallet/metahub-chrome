import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockChainState = {
  currentChain: () => 'eos',
  currentChainId: () => 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
  currentNetwork: {
    chain: 'eos',
    token: { contract: 'eosio.token', symbol: 'EOS', precision: 4 },
  },
};

vi.mock('@/stores/chainStore', () => {
  const useChainStore: any = vi.fn((selector: any) => selector(mockChainState));
  useChainStore.getState = vi.fn(() => mockChainState);
  return { useChainStore };
});

const mockTokens = [
  { contract: 'eosio.token', symbol: 'EOS', amount: 10.5, chain: 'eos', logo: '', precision: 4 },
];

const mockWalletState = {
  selectedIndex: 0,
  wallets: [{ name: 'alice', chainId: 'eos', seed: '', blockchain: 'eos', smoothMode: false, keys: [] }],
  currentWallet: () => ({ name: 'alice', chainId: 'eos', seed: '', blockchain: 'eos', smoothMode: false, keys: [] }),
  currentUserTokens: () => mockTokens,
  userTokens: {},
  getToken: () => ({} as any),
  setCurrentUserTokens: vi.fn().mockResolvedValue(undefined),
  setUserTokens: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@/stores/walletStore', () => {
  const useWalletStore: any = vi.fn((selector: any) => selector(mockWalletState));
  useWalletStore.getState = vi.fn(() => mockWalletState);
  return { useWalletStore };
});

vi.mock('@/lib/remote', () => ({
  getBalanceList: vi.fn(async (account: string, coins: any[], cb: Function) => {
    cb({ contract: 'eosio.token', symbol: 'EOS', amount: 10.5 });
  }),
  isSupportChain: vi.fn(() => true),
}));

vi.mock('@/lib/chain', () => ({
  default: {
    getApi: vi.fn(() => ({
      getEosPrice: vi.fn().mockResolvedValue(2.5),
      getREXInfo: vi.fn().mockResolvedValue({ rows: [{ vote_stake: 0, rex_balance: 0 }] }),
    })),
  },
}));

vi.mock('@/utils/tool', () => ({
  tool: {
    bignum: (v: string) => ({
      times: () => ({ toFixed: () => '26.2500' }),
    }),
  },
}));

vi.mock('@/utils/network', () => ({
  eosChainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
}));

vi.mock('@/components/TokenSelector', () => ({
  default: () => <div data-testid="token-selector" />,
}));

import CoinList from '../CoinList';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('CoinList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders token list header', async () => {
    renderWithRouter(<CoinList />);
    await waitFor(() => {
      expect(screen.getByText('wallet.totalAssets')).toBeInTheDocument();
    });
  });

  it('displays token symbol', async () => {
    renderWithRouter(<CoinList />);
    await waitFor(() => {
      expect(screen.getByText('EOS')).toBeInTheDocument();
    });
  });

  it('renders refresh and add buttons', async () => {
    renderWithRouter(<CoinList />);
    await waitFor(() => {
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  it('calls onSetUnit callback with price data', async () => {
    const onSetUnit = vi.fn();
    const onSetAmount = vi.fn();
    renderWithRouter(<CoinList onSetUnit={onSetUnit} onSetAmount={onSetAmount} />);
    await waitFor(() => {
      expect(onSetUnit).toHaveBeenCalled();
    });
  });

  it('calls onIsLoading with false after load', async () => {
    const onIsLoading = vi.fn();
    renderWithRouter(<CoinList onIsLoading={onIsLoading} />);
    await waitFor(() => {
      expect(onIsLoading).toHaveBeenCalledWith(false);
    });
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: vi.fn(),
}));

vi.mock('@/stores/uiStore', () => ({
  useUIStore: vi.fn((selector: any) =>
    selector({ setShowAccountSelector: vi.fn() })
  ),
}));

vi.mock('@/entrypoints/popup/pages/wallet/components/WalletHeader', () => ({
  default: ({ type, amount }: any) => (
    <div data-testid="wallet-header">Header type={type} amount={amount}</div>
  ),
}));

vi.mock('@/entrypoints/popup/pages/wallet/components/CoinList', () => ({
  default: () => <div data-testid="coin-list">CoinList</div>,
}));

vi.mock('@/entrypoints/popup/pages/wallet/components/NoAccount', () => ({
  default: () => <div data-testid="no-account">NoAccount</div>,
}));

vi.mock('@/components/TopNav', () => ({
  default: () => <div data-testid="top-nav">TopNav</div>,
}));

import WalletHomePage from '../WalletHomePage';
import { useWalletStore } from '@/stores/walletStore';

const mockUseWalletStore = useWalletStore as unknown as ReturnType<typeof vi.fn>;

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('WalletHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows CoinList and WalletHeader when wallets exist', () => {
    mockUseWalletStore.mockImplementation((selector: any) =>
      selector({
        wallets: [{ name: 'alice', chainId: 'abc', seed: '', blockchain: 'eos', smoothMode: false, keys: [] }],
      })
    );

    renderWithRouter(<WalletHomePage />);
    expect(screen.getByTestId('wallet-header')).toBeInTheDocument();
    expect(screen.getByTestId('coin-list')).toBeInTheDocument();
    expect(screen.queryByTestId('no-account')).not.toBeInTheDocument();
  });

  it('shows NoAccount when wallets are empty', () => {
    mockUseWalletStore.mockImplementation((selector: any) =>
      selector({ wallets: [] })
    );

    renderWithRouter(<WalletHomePage />);
    expect(screen.getByTestId('no-account')).toBeInTheDocument();
    expect(screen.queryByTestId('wallet-header')).not.toBeInTheDocument();
    expect(screen.queryByTestId('coin-list')).not.toBeInTheDocument();
  });
});

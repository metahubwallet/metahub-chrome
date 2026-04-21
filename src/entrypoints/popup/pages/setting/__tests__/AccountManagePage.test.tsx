import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams({ chainId: 'eos-chain-id' })],
  };
});

vi.mock('@/stores/chainStore', () => ({
  useChainStore: vi.fn((selector: any) =>
    selector({ findNetwork: (chainId: string) => ({ name: 'EOS', token: { symbol: 'EOS' } }) })
  ),
}));

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: vi.fn((selector: any) =>
    selector({
      wallets: [
        { name: 'alice', chainId: 'eos-chain-id', seed: '', blockchain: 'eos', smoothMode: false, keys: [] },
        { name: 'bob', chainId: 'eos-chain-id', seed: '', blockchain: 'eos', smoothMode: false, keys: [] },
        { name: 'carol', chainId: 'other-chain-id', seed: '', blockchain: 'eos', smoothMode: false, keys: [] },
      ],
      currentWallet: () => ({ name: 'alice', chainId: 'eos-chain-id', seed: '', blockchain: 'eos', smoothMode: false, keys: [] }),
    })
  ),
}));

vi.mock('@/components/PageHeader', () => ({
  default: ({ title }: any) => <div data-testid="page-header">{title}</div>,
}));

import AccountManagePage from '../AccountManagePage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <AccountManagePage />
    </MemoryRouter>
  );

describe('AccountManagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header', () => {
    renderPage();
    expect(screen.getByTestId('page-header')).toHaveTextContent('setting.manageWallets');
  });

  it('shows wallets for the chain', () => {
    renderPage();
    expect(screen.getByText('alice')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('does not show wallets from other chains', () => {
    renderPage();
    expect(screen.queryByText('carol')).not.toBeInTheDocument();
  });

  it('shows import key button', () => {
    renderPage();
    expect(screen.getByText('public.importKey')).toBeInTheDocument();
  });

  it('navigates to account detail on wallet click', () => {
    renderPage();
    fireEvent.click(screen.getByText('alice'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/account-detail'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('alice'));
  });

  it('navigates to import-key on import button click', () => {
    renderPage();
    fireEvent.click(screen.getByText('public.importKey'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/import-key'));
  });
});

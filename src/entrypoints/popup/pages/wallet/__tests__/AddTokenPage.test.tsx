import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() } }));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/stores/chainStore', () => ({
  useChainStore: { getState: vi.fn(() => ({ currentChain: () => 'eos' })) },
}));

const mockSetCurrentUserTokens = vi.fn().mockResolvedValue(undefined);
vi.mock('@/stores/walletStore', () => ({
  useWalletStore: {
    getState: vi.fn(() => ({
      currentUserTokens: () => [],
      setCurrentUserTokens: mockSetCurrentUserTokens,
    })),
  },
}));

const mockGetCurrencyStats = vi.fn();
vi.mock('@/hooks/useChainInstance', () => ({
  getChainInstance: () => ({
    getApi: () => ({ getCurrencyStats: mockGetCurrencyStats }),
  }),
}));

vi.mock('@/components/PageHeader', () => ({
  default: ({ title }: any) => <div data-testid="page-header">{title}</div>,
}));

import AddTokenPage from '../AddTokenPage';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('AddTokenPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders contract and symbol inputs', () => {
    renderWithRouter(<AddTokenPage />);
    expect(screen.getByPlaceholderText('wallet.enterContractName')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('wallet.enterTokenSymbol')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderWithRouter(<AddTokenPage />);
    expect(screen.getByText('wallet.submit')).toBeInTheDocument();
  });

  it('adds token on valid currency stats response', async () => {
    mockGetCurrencyStats.mockResolvedValue({ max_supply: '1000000.0000 EOS' });

    renderWithRouter(<AddTokenPage />);

    fireEvent.change(screen.getByPlaceholderText('wallet.enterContractName'), {
      target: { value: 'eosio.token' },
    });
    fireEvent.change(screen.getByPlaceholderText('wallet.enterTokenSymbol'), {
      target: { value: 'EOS' },
    });

    fireEvent.click(screen.getByText('wallet.submit'));

    await waitFor(() => {
      expect(mockSetCurrentUserTokens).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ contract: 'eosio.token', symbol: 'EOS' }),
        ])
      );
    });
  });

  it('does not add token when currency stats not found', async () => {
    mockGetCurrencyStats.mockRejectedValue(new Error('Not found'));

    renderWithRouter(<AddTokenPage />);

    fireEvent.change(screen.getByPlaceholderText('wallet.enterContractName'), {
      target: { value: 'fake.contract' },
    });
    fireEvent.change(screen.getByPlaceholderText('wallet.enterTokenSymbol'), {
      target: { value: 'FAKE' },
    });

    fireEvent.click(screen.getByText('wallet.submit'));

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('does not add token when it already exists', async () => {
    mockGetCurrencyStats.mockResolvedValue({ max_supply: '1000000.0000 EOS' });
    const { useWalletStore } = await import('@/stores/walletStore');
    (useWalletStore as any).getState.mockReturnValue({
      currentUserTokens: () => [{ chain: 'eos', contract: 'eosio.token', symbol: 'EOS' }],
      setCurrentUserTokens: mockSetCurrentUserTokens,
    });

    renderWithRouter(<AddTokenPage />);

    fireEvent.change(screen.getByPlaceholderText('wallet.enterContractName'), {
      target: { value: 'eosio.token' },
    });
    fireEvent.change(screen.getByPlaceholderText('wallet.enterTokenSymbol'), {
      target: { value: 'EOS' },
    });

    fireEvent.click(screen.getByText('wallet.submit'));

    await waitFor(() => {
      expect(mockSetCurrentUserTokens).not.toHaveBeenCalled();
    });
  });
});

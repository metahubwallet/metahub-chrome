import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
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
vi.mock('@/lib/chain', () => ({
  default: {
    getApi: vi.fn(() => ({ getCurrencyStats: mockGetCurrencyStats })),
  },
}));

vi.mock('@/components/PageHeader', () => ({
  default: ({ title }: any) => <div data-testid="page-header">{title}</div>,
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));
vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder }: any) => (
    <input value={value} onChange={onChange} placeholder={placeholder} />
  ),
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
    const inputs = screen.getAllByPlaceholderText('wallet.required');
    expect(inputs).toHaveLength(2);
  });

  it('renders submit button', () => {
    renderWithRouter(<AddTokenPage />);
    expect(screen.getByText('wallet.submit')).toBeInTheDocument();
  });

  it('adds token on valid currency stats response', async () => {
    mockGetCurrencyStats.mockResolvedValue({ max_supply: '1000000.0000 EOS' });

    renderWithRouter(<AddTokenPage />);

    const inputs = screen.getAllByPlaceholderText('wallet.required');
    fireEvent.change(inputs[0], { target: { value: 'eosio.token' } });
    fireEvent.change(inputs[1], { target: { value: 'EOS' } });

    fireEvent.click(screen.getByText('wallet.submit'));

    await waitFor(() => {
      expect(mockSetCurrentUserTokens).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ contract: 'eosio.token', symbol: 'EOS' }),
        ])
      );
    });
  });

  it('shows error toast when currency stats not found', async () => {
    mockGetCurrencyStats.mockRejectedValue(new Error('Not found'));

    renderWithRouter(<AddTokenPage />);

    const inputs = screen.getAllByPlaceholderText('wallet.required');
    fireEvent.change(inputs[0], { target: { value: 'fake.contract' } });
    fireEvent.change(inputs[1], { target: { value: 'FAKE' } });

    fireEvent.click(screen.getByText('wallet.submit'));

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('shows error when token already exists', async () => {
    mockGetCurrencyStats.mockResolvedValue({ max_supply: '1000000.0000 EOS' });
    const { useWalletStore } = await import('@/stores/walletStore');
    (useWalletStore as any).getState.mockReturnValue({
      currentUserTokens: () => [{ chain: 'eos', contract: 'eosio.token', symbol: 'EOS' }],
      setCurrentUserTokens: mockSetCurrentUserTokens,
    });

    renderWithRouter(<AddTokenPage />);

    const inputs = screen.getAllByPlaceholderText('wallet.required');
    fireEvent.change(inputs[0], { target: { value: 'eosio.token' } });
    fireEvent.change(inputs[1], { target: { value: 'EOS' } });

    fireEvent.click(screen.getByText('wallet.submit'));

    await waitFor(() => {
      expect(mockSetCurrentUserTokens).not.toHaveBeenCalled();
    });
  });
});

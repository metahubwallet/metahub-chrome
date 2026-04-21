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
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: {
    getState: vi.fn(() => ({
      currentUserTokens: () => [
        { contract: 'eosio.token', symbol: 'EOS', amount: 5, chain: 'eos' },
      ],
    })),
  },
}));

import WalletHeader from '../WalletHeader';

const defaultProps = { type: 'usd', amount: 1234.5678, isLoading: false };

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('WalletHeader', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('displays formatted USD amount', () => {
    renderWithRouter(<WalletHeader {...defaultProps} />);
    expect(screen.getByText('$ 1234.5678')).toBeInTheDocument();
  });

  it('displays native symbol amount when type is not usd', () => {
    renderWithRouter(<WalletHeader type="eos" amount={42.1234} isLoading={false} />);
    expect(screen.getByText('42.1234 EOS')).toBeInTheDocument();
  });

  it('shows loading spinner when isLoading is true', () => {
    renderWithRouter(<WalletHeader {...defaultProps} isLoading={true} />);
    // Amount text should not be visible
    expect(screen.queryByText('$ 1234.5678')).not.toBeInTheDocument();
  });

  it('renders four shortcut buttons', () => {
    renderWithRouter(<WalletHeader {...defaultProps} />);
    expect(screen.getByText('wallet.transfer')).toBeInTheDocument();
    expect(screen.getByText('wallet.receive')).toBeInTheDocument();
    expect(screen.getByText('resource.resources')).toBeInTheDocument();
    expect(screen.getByText('setting.setting')).toBeInTheDocument();
  });

  it('navigates to receive on receive button click', () => {
    renderWithRouter(<WalletHeader {...defaultProps} />);
    fireEvent.click(screen.getByText('wallet.receive'));
    expect(mockNavigate).toHaveBeenCalledWith('/receive');
  });

  it('navigates to resource on resources button click', () => {
    renderWithRouter(<WalletHeader {...defaultProps} />);
    fireEvent.click(screen.getByText('resource.resources'));
    expect(mockNavigate).toHaveBeenCalledWith('/resource');
  });

  it('navigates to setting on settings button click', () => {
    renderWithRouter(<WalletHeader {...defaultProps} />);
    fireEvent.click(screen.getByText('setting.setting'));
    expect(mockNavigate).toHaveBeenCalledWith('/setting');
  });

  it('navigates to transfer on send button click', () => {
    renderWithRouter(<WalletHeader {...defaultProps} />);
    fireEvent.click(screen.getByText('wallet.transfer'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/transfer'));
  });
});

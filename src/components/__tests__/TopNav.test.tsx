import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockCurrentWallet = vi.fn<() => any>(() => ({ name: 'alice', chainId: 'eos', keys: [], seed: '', blockchain: 'eos', smoothMode: false }));

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: vi.fn((selector: any) =>
    selector({ currentWallet: mockCurrentWallet })
  ),
}));

vi.mock('@/utils/tool', () => ({
  tool: {
    briefAccount: (name: string) => name.length > 12 ? name.substring(0, 6) + '...' + name.slice(-5) : name,
  },
}));

import TopNav from '../TopNav';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('TopNav', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders MetaHub logo', () => {
    renderWithRouter(<TopNav />);
    const logo = screen.getByAltText('MetaHub');
    expect(logo).toBeInTheDocument();
  });

  it('displays account name', () => {
    renderWithRouter(<TopNav />);
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('shows "no account" when no wallet', () => {
    mockCurrentWallet.mockReturnValue(null);
    renderWithRouter(<TopNav />);
    expect(screen.getByText('public.noAccount')).toBeInTheDocument();
  });

  it('calls onChangeAccount when account pill is clicked', () => {
    const onChangeAccount = vi.fn();
    renderWithRouter(<TopNav onChangeAccount={onChangeAccount} />);
    fireEvent.click(screen.getByLabelText('Change account'));
    expect(onChangeAccount).toHaveBeenCalled();
  });

  it('truncates long account names', () => {
    mockCurrentWallet.mockReturnValue({ name: 'verylongaccountname123', chainId: 'eos', keys: [], seed: '', blockchain: 'eos', smoothMode: false });
    renderWithRouter(<TopNav />);
    expect(screen.getByText(/\.\.\./)).toBeInTheDocument();
  });
});

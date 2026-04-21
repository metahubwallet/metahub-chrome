import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockWallets = [
  {
    name: 'testaccount1',
    chainId: 'chain123',
    keys: [
      { publicKey: 'EOS6abc', privateKey: '', permissions: ['active', 'owner'] },
    ],
    seed: '',
    blockchain: 'eos',
    smoothMode: false,
  },
  {
    name: 'testaccount2',
    chainId: 'chain123',
    keys: [
      { publicKey: 'EOS7def', privateKey: '', permissions: ['active'] },
    ],
    seed: '',
    blockchain: 'eos',
    smoothMode: false,
  },
  {
    name: 'otheraccount',
    chainId: 'differentchain',
    keys: [
      { publicKey: 'EOS8ghi', privateKey: '', permissions: ['active'] },
    ],
    seed: '',
    blockchain: 'eos',
    smoothMode: false,
  },
];

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: Object.assign(vi.fn(), {
    getState: vi.fn(() => ({
      wallets: mockWallets,
    })),
  }),
}));

vi.mock('@/utils/tool', () => ({
  tool: {
    briefAccount: (account: string) => account,
  },
}));

const mockWindowClose = vi.fn();
Object.defineProperty(window, 'close', { value: mockWindowClose, writable: true });

import LoginPage from '../LoginPage';

describe('LoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (chrome.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      windowParams: { domain: 'example.com', chainId: 'chain123' },
    });
  });

  it('renders account list based on wallet data', async () => {
    render(<LoginPage />);
    await waitFor(() => {
      expect(screen.getByText('testaccount1')).toBeInTheDocument();
      expect(screen.getByText('testaccount2')).toBeInTheDocument();
    });
    // Should not render account from a different chain
    expect(screen.queryByText('otheraccount')).not.toBeInTheDocument();
  });

  it('renders authorize login header', async () => {
    render(<LoginPage />);
    await waitFor(() => {
      expect(screen.getByText('auth.authorizeLogin')).toBeInTheDocument();
    });
  });

  it('renders domain from windowParams', async () => {
    render(<LoginPage />);
    await waitFor(() => {
      expect(screen.getByText('example.com')).toBeInTheDocument();
    });
  });

  it('filters accounts by search word', async () => {
    render(<LoginPage />);
    await waitFor(() => {
      expect(screen.getByText('testaccount1')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('auth.searchAccounts');
    fireEvent.change(searchInput, { target: { value: 'account2' } });
    await waitFor(() => {
      expect(screen.queryByText('testaccount1')).not.toBeInTheDocument();
      expect(screen.getByText('testaccount2')).toBeInTheDocument();
    });
  });

  it('shows empty state when no accounts match', async () => {
    render(<LoginPage />);
    await waitFor(() => {
      expect(screen.getByText('testaccount1')).toBeInTheDocument();
    });
    const searchInput = screen.getByPlaceholderText('auth.searchAccounts');
    fireEvent.change(searchInput, { target: { value: 'nonexistent' } });
    await waitFor(() => {
      expect(screen.getByText('public.noImport')).toBeInTheDocument();
    });
  });

  it('login saves result to session storage and closes window', async () => {
    render(<LoginPage />);
    await waitFor(() => {
      expect(screen.getByText('testaccount1')).toBeInTheDocument();
    });
    const loginButtons = screen.getAllByText('auth.login');
    fireEvent.click(loginButtons[0]);
    await waitFor(() => {
      expect(chrome.storage.session.set).toHaveBeenCalledWith({
        windowResult: {
          name: 'testaccount1',
          publicKey: 'EOS6abc',
          authority: 'active',
          chainId: 'chain123',
        },
      });
      expect(mockWindowClose).toHaveBeenCalled();
    });
  });
});

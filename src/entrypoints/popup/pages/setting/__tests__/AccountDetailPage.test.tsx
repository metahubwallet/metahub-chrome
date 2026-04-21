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
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams({ account: 'alice', chainId: 'eos-chain-id' })],
  };
});

const mockFetchPermissions = vi.fn().mockResolvedValue({
  code: 200,
  permissions: [
    {
      perm_name: 'owner',
      parent: '',
      required_auth: {
        threshold: 1,
        keys: [{ key: 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV', weight: 1 }],
      },
    },
    {
      perm_name: 'active',
      parent: 'owner',
      required_auth: {
        threshold: 1,
        keys: [{ key: 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV', weight: 1 }],
      },
    },
  ],
});

vi.mock('@/hooks/useChainInstance', () => ({
  getChainInstance: () => ({
    fetchPermissions: mockFetchPermissions,
    getApi: () => ({
      makeNewPermissions: vi.fn().mockReturnValue([]),
      updatePerms: vi.fn().mockResolvedValue(undefined),
    }),
  }),
}));

const mockSetWallets = vi.fn().mockResolvedValue(undefined);
const mockSetSelectedIndex = vi.fn().mockResolvedValue(undefined);

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: vi.fn((selector: any) =>
    selector({
      wallets: [
        {
          name: 'alice',
          chainId: 'eos-chain-id',
          seed: 'SEED1234567890AB',
          blockchain: 'eos',
          smoothMode: false,
          keys: [
            {
              publicKey: 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV',
              privateKey: 'encryptedkey',
              permissions: ['owner', 'active'],
            },
          ],
        },
      ],
      selectedIndex: 0,
      setWallets: mockSetWallets,
      setSelectedIndex: mockSetSelectedIndex,
    })
  ),
}));

vi.mock('@/utils/crypto', () => ({
  decrypt: vi.fn(() => 'decryptedPrivateKey'),
  md5: vi.fn((v: string) => `md5:${v}`),
}));

vi.mock('@/lib/keyring', () => ({
  isValidPublic: vi.fn((key: string) => key.startsWith('EOS')),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: ({ onSuccess, onError, mutationFn }: any) => ({
    mutate: async (vars: any) => {
      try {
        const result = await mutationFn(vars);
        onSuccess?.(result);
      } catch (e) {
        onError?.(e);
      }
    },
    isPending: false,
  }),
}));

vi.mock('@/components/PageHeader', () => ({
  default: ({ title }: any) => <div data-testid="page-header">{title}</div>,
}));

vi.mock('@/components/ClipButton', () => ({
  default: ({ value }: any) => <button data-testid="clip-button">{value}</button>,
}));

vi.mock('@/components/PasswordConfirm', () => ({
  default: ({ isOpen, title, onClose, onConfirm }: any) =>
    isOpen ? (
      <div data-testid="password-confirm">
        <span>{title}</span>
        <button onClick={() => onConfirm('test-password')}>confirm</button>
        <button onClick={onClose}>close</button>
      </div>
    ) : null,
}));

vi.mock('@/components/ConfirmDialog', () => ({
  default: ({ isOpen, children, onConfirm, onClose }: any) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        {children}
        <button onClick={onConfirm}>confirm</button>
        <button onClick={onClose}>cancel</button>
      </div>
    ) : null,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant }: any) => (
    <button data-variant={variant} onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ value }: any) => <textarea value={value} readOnly />,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children, onOpenChange }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

import AccountDetailPage from '../AccountDetailPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <AccountDetailPage />
    </MemoryRouter>
  );

describe('AccountDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchPermissions.mockResolvedValue({
      code: 200,
      permissions: [
        {
          perm_name: 'owner',
          parent: '',
          required_auth: {
            threshold: 1,
            keys: [{ key: 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV', weight: 1 }],
          },
        },
        {
          perm_name: 'active',
          parent: 'owner',
          required_auth: {
            threshold: 1,
            keys: [{ key: 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV', weight: 1 }],
          },
        },
      ],
    });
  });

  it('renders page header', () => {
    renderPage();
    expect(screen.getByTestId('page-header')).toHaveTextContent('setting.authorityManage');
  });

  it('shows account name', () => {
    renderPage();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('shows permissions after fetch', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('owner')).toBeInTheDocument();
      expect(screen.getByText('active')).toBeInTheDocument();
    });
  });

  it('shows remove wallet button', () => {
    renderPage();
    expect(screen.getByText('setting.removeWallet')).toBeInTheDocument();
  });

  it('shows destroy confirm on remove wallet click', () => {
    renderPage();
    fireEvent.click(screen.getByText('setting.removeWallet'));
    expect(screen.getByTestId('password-confirm')).toBeInTheDocument();
  });

  it('shows show key buttons', async () => {
    renderPage();
    await waitFor(() => {
      const showKeyBtns = screen.getAllByText('setting.showKey');
      expect(showKeyBtns.length).toBeGreaterThan(0);
    });
  });

  it('shows password confirm for view private key', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText('setting.showKey').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getAllByText('setting.showKey')[0]);
    expect(screen.getByTestId('password-confirm')).toBeInTheDocument();
  });

  it('calls fetchPermissions on mount', async () => {
    renderPage();
    await waitFor(() => {
      expect(mockFetchPermissions).toHaveBeenCalledWith('alice', 'eos-chain-id');
    });
  });
});

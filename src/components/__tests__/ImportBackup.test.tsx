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
  useChainStore: {
    getState: vi.fn(() => ({
      setNetworks: vi.fn().mockResolvedValue(undefined),
      setSelectedRpc: vi.fn().mockResolvedValue(undefined),
      setCustomRpcs: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: {
    getState: vi.fn(() => ({
      setWallets: vi.fn().mockResolvedValue(undefined),
      setRecentTransfers: vi.fn().mockResolvedValue(undefined),
      setSelectedIndex: vi.fn().mockResolvedValue(undefined),
      setUserTokens: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

vi.mock('@/stores/userStore', () => ({
  useUserStore: {
    getState: vi.fn(() => ({
      setPasshash: vi.fn().mockResolvedValue(undefined),
      setLocked: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

vi.mock('@/stores/settingStore', () => ({
  useSettingStore: {
    getState: vi.fn(() => ({
      setWhitelist: vi.fn().mockResolvedValue(undefined),
      setLang: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

vi.mock('@/utils/crypto', () => ({
  metahubKey: 'YM4BqViCkPs2qt3tTdTuP3ABUimU7sBU',
  encrypt: vi.fn((v: string) => `enc:${v}`),
  decrypt: vi.fn((content: string) => {
    if (content === 'VALID_ENCRYPTED') {
      return JSON.stringify({
        wallets: [{ name: 'alice', chainId: 'eos', seed: 'SEED', blockchain: 'eos', smoothMode: false, keys: [{ privateKey: 'pk', publicKey: 'pubk', permissions: [] }] }],
        networks: [],
        selectedIndex: 0,
        userTokens: {},
        whitelist: [],
        language: 'en',
      });
    }
    throw new Error('Decrypt failed');
  }),
  password1: vi.fn((v: string) => `p1:${v}`),
  password2: vi.fn((v: string) => `p2:${v}`),
  md5: vi.fn((v: string) => `md5:${v}`),
}));

vi.mock('@/i18n', () => ({
  default: { changeLanguage: vi.fn() },
}));

vi.mock('@/components/PasswordInput', () => ({
  default: React.forwardRef(({ placeholder, ...props }: any, ref: any) => (
    <input type="password" placeholder={placeholder} ref={ref} {...props} />
  )),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type, variant }: any) => (
    <button type={type || 'button'} onClick={onClick} data-variant={variant}>{children}</button>
  ),
}));

import ImportBackup from '../ImportBackup';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('ImportBackup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    renderWithRouter(<ImportBackup isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when open', () => {
    renderWithRouter(<ImportBackup isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('public.importBackup')).toBeInTheDocument();
  });

  it('renders encrypt password input', () => {
    renderWithRouter(<ImportBackup isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText('setting.encryptPassword')).toBeInTheDocument();
  });

  it('renders new password inputs', () => {
    renderWithRouter(<ImportBackup isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByPlaceholderText('setting.newPassword1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('setting.newPassword2')).toBeInTheDocument();
  });

  it('renders file upload link', () => {
    renderWithRouter(<ImportBackup isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('public.selectFileToImport')).toBeInTheDocument();
  });

  it('shows file name after file selected', async () => {
    renderWithRouter(<ImportBackup isOpen={true} onClose={vi.fn()} />);
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['content'], 'backup.bak', { type: 'text/plain' });
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fireEvent.change(fileInput);

    await waitFor(() => {
      expect(screen.getByText('backup.bak')).toBeInTheDocument();
    });
  });

  it('shows warning when submitting without file', async () => {
    renderWithRouter(<ImportBackup isOpen={true} onClose={vi.fn()} />);

    fireEvent.change(screen.getByPlaceholderText('setting.encryptPassword'), {
      target: { value: 'encrypt123' },
    });
    fireEvent.change(screen.getByPlaceholderText('setting.newPassword1'), {
      target: { value: 'newpass123' },
    });
    fireEvent.change(screen.getByPlaceholderText('setting.newPassword2'), {
      target: { value: 'newpass123' },
    });

    fireEvent.click(screen.getByText('public.ok'));

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('calls onClose on cancel', () => {
    const onClose = vi.fn();
    renderWithRouter(<ImportBackup isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('public.cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});

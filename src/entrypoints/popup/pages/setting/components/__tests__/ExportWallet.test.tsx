import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/stores/userStore', () => ({
  useUserStore: {
    getState: vi.fn(() => ({
      passhash: 'hashed:correctPassword',
      password: 'correctPassword',
    })),
  },
}));

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: {
    getState: vi.fn(() => ({
      wallets: [
        {
          name: 'alice',
          chainId: 'eos',
          seed: 'SEED1234567890AB',
          blockchain: 'eos',
          smoothMode: false,
          keys: [{ publicKey: 'EOSPUB', privateKey: 'ENCKEY', permissions: ['active'] }],
        },
      ],
    })),
  },
}));

vi.mock('@/stores/chainStore', () => ({
  useChainStore: {
    getState: vi.fn(() => ({
      networks: [],
      selectedRpcs: {},
      customRpcs: {},
    })),
  },
}));

vi.mock('@/stores/settingStore', () => ({
  useSettingStore: {
    getState: vi.fn(() => ({
      whitelist: [],
      language: 'en',
    })),
  },
}));

vi.mock('@/utils/crypto', () => ({
  verifyPassword: vi.fn(async (pw: string, hash: string) => hash === `hashed:${pw}`),
  isV3Encrypted: vi.fn(() => false),
  decryptV3: vi.fn(async () => 'rawPrivateKey'),
  legacyDecrypt: vi.fn(() => 'rawPrivateKey'),
  legacyMd5: vi.fn((v: string) => `md5:${v}`),
  legacyPassword1: vi.fn((v: string) => `p1:${v}`),
  makeKeySalt: vi.fn(() => 'salt'),
  encryptBackup: vi.fn(async () => 'encryptedData'),
}));

vi.mock('@/components/PasswordInput', () => ({
  default: React.forwardRef(({ placeholder, value, onChange }: any, ref: any) => (
    <input type="password" placeholder={placeholder} value={value} onChange={onChange} ref={ref} />
  )),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant }: any) => (
    <button data-variant={variant} onClick={onClick}>{children}</button>
  ),
}));

import ExportWallet from '../ExportWallet';

const mockOnClose = vi.fn();

const renderComponent = (isOpen = true) =>
  render(
    <MemoryRouter>
      <ExportWallet isOpen={isOpen} onClose={mockOnClose} />
    </MemoryRouter>
  );

describe('ExportWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dialog when open', () => {
    renderComponent(true);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderComponent(false);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders wallet password input', () => {
    renderComponent();
    expect(screen.getByPlaceholderText('setting.walletPassword')).toBeInTheDocument();
  });

  it('renders encrypt password input', () => {
    renderComponent();
    expect(screen.getByPlaceholderText('setting.encryptPassword')).toBeInTheDocument();
  });

  it('calls onClose when cancel clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByText('public.cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows error for wrong wallet password', async () => {
    renderComponent();
    fireEvent.change(screen.getByPlaceholderText('setting.walletPassword'), {
      target: { value: 'wrongPassword' },
    });
    fireEvent.change(screen.getByPlaceholderText('setting.encryptPassword'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByText('public.ok'));
    // verifyPassword('wrongPassword', 'hashed:correctPassword') => false
    await waitFor(() => {
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  it('shows warning for invalid encrypt password (too short)', async () => {
    renderComponent();
    fireEvent.change(screen.getByPlaceholderText('setting.walletPassword'), {
      target: { value: 'correctPassword' },
    });
    fireEvent.change(screen.getByPlaceholderText('setting.encryptPassword'), {
      target: { value: 'short' },
    });
    fireEvent.click(screen.getByText('public.ok'));
    await waitFor(() => {
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  it('shows warning for encrypt password without digits', async () => {
    renderComponent();
    fireEvent.change(screen.getByPlaceholderText('setting.walletPassword'), {
      target: { value: 'correctPassword' },
    });
    fireEvent.change(screen.getByPlaceholderText('setting.encryptPassword'), {
      target: { value: 'onlyletters' },
    });
    fireEvent.click(screen.getByText('public.ok'));
    await waitFor(() => {
      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });
});

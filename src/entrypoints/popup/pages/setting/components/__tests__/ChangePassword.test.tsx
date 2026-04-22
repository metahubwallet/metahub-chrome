import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockSetPasshash = vi.fn().mockResolvedValue(undefined);
const mockSetWallets = vi.fn().mockResolvedValue(undefined);
const mockSetLocked = vi.fn().mockResolvedValue(undefined);

vi.mock('@/stores/userStore', () => ({
  useUserStore: {
    getState: vi.fn(() => ({
      passhash: 'hashed:oldPassword',
      setPasshash: mockSetPasshash,
      setLocked: mockSetLocked,
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
      setWallets: mockSetWallets,
    })),
  },
}));

vi.mock('@/utils/crypto', () => ({
  verifyPassword: vi.fn(async (pw: string, hash: string) => hash === `hashed:${pw}`),
  hashPassword: vi.fn(async (pw: string) => `hashed:${pw}`),
  isV3Encrypted: vi.fn(() => false),
  decryptV3: vi.fn(async () => 'rawKey'),
  encryptV3: vi.fn(async () => 'newEncKey'),
  makeKeySalt: vi.fn(() => 'salt'),
  legacyDecrypt: vi.fn(() => 'rawKey'),
  legacyMd5: vi.fn((v: string) => `md5:${v}`),
  legacyPassword1: vi.fn((v: string) => `p1:${v}`),
}));

vi.mock('@/lib/keyring', () => ({
  privateToPublic: vi.fn(() => 'EOSPUB'),
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

import ChangePassword from '../ChangePassword';

const mockOnClose = vi.fn();

const renderComponent = (isOpen = true) =>
  render(
    <MemoryRouter>
      <ChangePassword isOpen={isOpen} onClose={mockOnClose} />
    </MemoryRouter>
  );

describe('ChangePassword', () => {
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

  it('renders all password inputs', () => {
    renderComponent();
    expect(screen.getByPlaceholderText('setting.oldPassword')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('setting.newPassword1')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('setting.newPassword2')).toBeInTheDocument();
  });

  it('calls onClose when cancel clicked', () => {
    renderComponent();
    fireEvent.click(screen.getByText('public.cancel'));
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows error for wrong old password', async () => {
    renderComponent();
    fireEvent.change(screen.getByPlaceholderText('setting.oldPassword'), {
      target: { value: 'wrongPassword' },
    });
    fireEvent.change(screen.getByPlaceholderText('setting.newPassword1'), {
      target: { value: 'newPass123' },
    });
    fireEvent.change(screen.getByPlaceholderText('setting.newPassword2'), {
      target: { value: 'newPass123' },
    });
    fireEvent.click(screen.getByText('public.ok'));
    // verifyPassword('wrongPassword', 'hashed:oldPassword') => false
    await waitFor(() => {
      expect(mockSetPasshash).not.toHaveBeenCalled();
    });
  });

  it('shows error when passwords do not match', async () => {
    renderComponent();
    fireEvent.change(screen.getByPlaceholderText('setting.oldPassword'), {
      target: { value: 'oldPassword' },
    });
    fireEvent.change(screen.getByPlaceholderText('setting.newPassword1'), {
      target: { value: 'newPass123' },
    });
    fireEvent.change(screen.getByPlaceholderText('setting.newPassword2'), {
      target: { value: 'differentPass' },
    });
    fireEvent.click(screen.getByText('public.ok'));
    await waitFor(() => {
      expect(mockSetPasshash).not.toHaveBeenCalled();
    });
  });

  it('successfully changes password with correct inputs', async () => {
    renderComponent();
    fireEvent.change(screen.getByPlaceholderText('setting.oldPassword'), {
      target: { value: 'oldPassword' },
    });
    fireEvent.change(screen.getByPlaceholderText('setting.newPassword1'), {
      target: { value: 'newPass123' },
    });
    fireEvent.change(screen.getByPlaceholderText('setting.newPassword2'), {
      target: { value: 'newPass123' },
    });
    fireEvent.click(screen.getByText('public.ok'));

    await waitFor(() => {
      expect(mockSetPasshash).toHaveBeenCalledWith('hashed:newPass123');
      expect(mockSetWallets).toHaveBeenCalled();
      expect(mockSetLocked).toHaveBeenCalled();
    });
  });
});

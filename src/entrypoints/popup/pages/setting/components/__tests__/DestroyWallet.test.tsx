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

const mockSetWallets = vi.fn().mockResolvedValue(undefined);
const mockSetUserTokens = vi.fn().mockResolvedValue(undefined);
const mockSetLocked = vi.fn().mockResolvedValue(undefined);
const mockSetPasshash = vi.fn().mockResolvedValue(undefined);

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: {
    getState: vi.fn(() => ({
      setWallets: mockSetWallets,
      setUserTokens: mockSetUserTokens,
    })),
  },
}));

vi.mock('@/stores/userStore', () => ({
  useUserStore: {
    getState: vi.fn(() => ({
      setLocked: mockSetLocked,
      setPasshash: mockSetPasshash,
    })),
  },
}));

vi.mock('@/components/PasswordConfirm', () => ({
  default: ({ isOpen, title, onClose, onConfirm }: any) =>
    isOpen ? (
      <div data-testid="password-confirm">
        <span>{title}</span>
        <button onClick={() => onConfirm('test-password')}>confirm-password</button>
        <button onClick={onClose}>close-password</button>
      </div>
    ) : null,
}));

vi.mock('@/components/ConfirmDialog', () => ({
  default: ({ isOpen, title, children, onConfirm, onClose }: any) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <span>{title}</span>
        {children}
        <button onClick={onConfirm}>confirm-destroy</button>
        <button onClick={onClose}>cancel-destroy</button>
      </div>
    ) : null,
}));

import DestroyWallet from '../DestroyWallet';

const mockOnClose = vi.fn();

const renderComponent = (isOpen = true) =>
  render(
    <MemoryRouter>
      <DestroyWallet isOpen={isOpen} onClose={mockOnClose} />
    </MemoryRouter>
  );

describe('DestroyWallet', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows password confirm when isOpen=true', () => {
    renderComponent(true);
    expect(screen.getByTestId('password-confirm')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderComponent(false);
    expect(screen.queryByTestId('password-confirm')).not.toBeInTheDocument();
  });

  it('shows confirm dialog after password confirmed', () => {
    renderComponent(true);
    fireEvent.click(screen.getByText('confirm-password'));
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
  });

  it('does not show password confirm after first confirm', () => {
    renderComponent(true);
    fireEvent.click(screen.getByText('confirm-password'));
    expect(screen.queryByTestId('password-confirm')).not.toBeInTheDocument();
  });

  it('calls destroy actions and navigates on final confirm', async () => {
    renderComponent(true);
    fireEvent.click(screen.getByText('confirm-password'));
    fireEvent.click(screen.getByText('confirm-destroy'));

    await waitFor(() => {
      expect(mockSetWallets).toHaveBeenCalledWith([]);
      expect(mockSetUserTokens).toHaveBeenCalledWith({});
      expect(mockSetLocked).toHaveBeenCalled();
      expect(mockSetPasshash).toHaveBeenCalledWith('');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('calls onClose when cancel is clicked', () => {
    renderComponent(true);
    fireEvent.click(screen.getByText('close-password'));
    expect(mockOnClose).toHaveBeenCalled();
  });
});

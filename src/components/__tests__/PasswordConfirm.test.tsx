import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const CORRECT_PASSHASH = 'correct_passhash';

vi.mock('@/stores/userStore', () => ({
  useUserStore: {
    getState: vi.fn(() => ({ passhash: CORRECT_PASSHASH })),
  },
}));

vi.mock('@/utils/crypto', () => ({
  verifyPassword: vi.fn(async (password: string, stored: string) => {
    return password === 'correct' && stored === CORRECT_PASSHASH;
  }),
}));

vi.mock('@/components/PasswordInput', () => ({
  default: React.forwardRef(({ placeholder, value, onChange, onKeyDown, ...props }: any, ref: any) => (
    <input
      type="password"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
      ref={ref}
      {...props}
    />
  )),
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogFooter: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, variant }: any) => (
    <button onClick={onClick} data-variant={variant}>{children}</button>
  ),
}));

import PasswordConfirm from '../PasswordConfirm';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('PasswordConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    renderWithRouter(
      <PasswordConfirm isOpen={false} title="Confirm" onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('renders dialog when open', () => {
    renderWithRouter(
      <PasswordConfirm isOpen={true} title="Confirm Action" onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
    expect(screen.getByText('Confirm Action')).toBeInTheDocument();
  });

  it('renders password input', () => {
    renderWithRouter(
      <PasswordConfirm isOpen={true} title="Test" onClose={vi.fn()} onConfirm={vi.fn()} />
    );
    expect(screen.getByPlaceholderText('password.inputPassword')).toBeInTheDocument();
  });

  it('calls onConfirm with raw password when correct password entered', async () => {
    const onConfirm = vi.fn();
    const onClose = vi.fn();
    renderWithRouter(
      <PasswordConfirm isOpen={true} title="Test" onClose={onClose} onConfirm={onConfirm} />
    );
    const input = screen.getByPlaceholderText('password.inputPassword');
    fireEvent.change(input, { target: { value: 'correct' } });
    fireEvent.click(screen.getByText('public.ok'));

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('correct');
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('does not call onConfirm when wrong password entered', async () => {
    const onConfirm = vi.fn();
    renderWithRouter(
      <PasswordConfirm isOpen={true} title="Test" onClose={vi.fn()} onConfirm={onConfirm} />
    );
    const input = screen.getByPlaceholderText('password.inputPassword');
    fireEvent.change(input, { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByText('public.ok'));

    await waitFor(() => {
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  it('clears password and calls onClose on cancel', () => {
    const onClose = vi.fn();
    renderWithRouter(
      <PasswordConfirm isOpen={true} title="Test" onClose={onClose} onConfirm={vi.fn()} />
    );
    fireEvent.click(screen.getByText('public.cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('submits on Enter keypress', async () => {
    const onConfirm = vi.fn();
    renderWithRouter(
      <PasswordConfirm isOpen={true} title="Test" onClose={vi.fn()} onConfirm={onConfirm} />
    );
    const input = screen.getByPlaceholderText('password.inputPassword');
    fireEvent.change(input, { target: { value: 'correct' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(onConfirm).toHaveBeenCalledWith('correct');
    });
  });
});

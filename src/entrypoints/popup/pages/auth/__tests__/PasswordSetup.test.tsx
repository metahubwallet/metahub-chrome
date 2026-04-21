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

const mockSetPassword = vi.fn().mockResolvedValue(undefined);
const mockSetPasshash = vi.fn().mockResolvedValue(undefined);

vi.mock('@/stores/userStore', () => ({
  useUserStore: {
    getState: vi.fn(() => ({
      setPassword: mockSetPassword,
      setPasshash: mockSetPasshash,
    })),
  },
}));

vi.mock('@/stores/settingStore', () => ({
  useSettingStore: {
    getState: vi.fn(() => ({
      setLang: vi.fn().mockResolvedValue(undefined),
    })),
  },
}));

vi.mock('@/utils/crypto', () => ({
  hashPassword: vi.fn(async (v: string) => `hashed:${v}`),
}));

vi.mock('@/i18n', () => ({
  default: { changeLanguage: vi.fn() },
}));

vi.mock('@/components/ImportBackup', () => ({
  default: ({ isOpen }: any) =>
    isOpen ? <div data-testid="import-backup">ImportBackup</div> : null,
}));

vi.mock('@/components/PasswordInput', () => ({
  default: React.forwardRef(({ placeholder, ...props }: any, ref: any) => (
    <input type="password" placeholder={placeholder} ref={ref} {...props} />
  )),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type }: any) => (
    <button type={type || 'button'} onClick={onClick}>{children}</button>
  ),
}));

import PasswordSetup from '../PasswordSetup';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('PasswordSetup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders password and confirm inputs', () => {
    renderWithRouter(<PasswordSetup />);
    expect(screen.getByPlaceholderText('public.password')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('public.repeatPassword')).toBeInTheDocument();
  });

  it('renders start button', () => {
    renderWithRouter(<PasswordSetup />);
    expect(screen.getByText('public.start')).toBeInTheDocument();
  });

  it('renders import backup button', () => {
    renderWithRouter(<PasswordSetup />);
    expect(screen.getByText('public.importBackup')).toBeInTheDocument();
  });

  it('opens import backup dialog on import click', () => {
    renderWithRouter(<PasswordSetup />);
    fireEvent.click(screen.getByText('public.importBackup'));
    expect(screen.getByTestId('import-backup')).toBeInTheDocument();
  });

  it('shows password mismatch error', async () => {
    renderWithRouter(<PasswordSetup />);

    fireEvent.change(screen.getByPlaceholderText('public.password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('public.repeatPassword'), {
      target: { value: 'different456' },
    });
    fireEvent.click(screen.getByText('public.start'));

    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('navigates to / on valid password match', async () => {
    renderWithRouter(<PasswordSetup />);

    fireEvent.change(screen.getByPlaceholderText('public.password'), {
      target: { value: 'password123' },
    });
    fireEvent.change(screen.getByPlaceholderText('public.repeatPassword'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByText('public.start'));

    await waitFor(() => {
      expect(mockSetPasshash).toHaveBeenCalledWith('hashed:password123');
      expect(mockSetPassword).toHaveBeenCalledWith('password123');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});

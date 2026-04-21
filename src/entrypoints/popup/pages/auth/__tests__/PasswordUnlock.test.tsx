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

const mockVerifyAndUnlock = vi.fn();

vi.mock('@/stores/userStore', () => ({
  useUserStore: Object.assign(
    vi.fn((selector: any) => selector({})),
    {
      getState: vi.fn(() => ({
        verifyAndUnlock: mockVerifyAndUnlock,
      })),
    }
  ),
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

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

import PasswordUnlock from '../PasswordUnlock';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('PasswordUnlock', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAndUnlock.mockResolvedValue(false);
  });

  it('renders password input', () => {
    renderWithRouter(<PasswordUnlock />);
    expect(screen.getByPlaceholderText('password.toUnlock')).toBeInTheDocument();
  });

  it('renders unlock button', () => {
    renderWithRouter(<PasswordUnlock />);
    expect(screen.getByText('password.unlock')).toBeInTheDocument();
  });

  it('shows warning when password is empty', async () => {
    renderWithRouter(<PasswordUnlock />);
    fireEvent.click(screen.getByText('password.unlock'));
    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('shows error when password is wrong', async () => {
    mockVerifyAndUnlock.mockResolvedValue(false);
    renderWithRouter(<PasswordUnlock />);
    const input = screen.getByPlaceholderText('password.toUnlock');
    fireEvent.change(input, { target: { value: 'wrongpassword' } });
    fireEvent.click(screen.getByText('password.unlock'));
    await waitFor(() => {
      expect(mockVerifyAndUnlock).toHaveBeenCalledWith('wrongpassword');
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('navigates to / on correct password', async () => {
    mockVerifyAndUnlock.mockResolvedValue(true);
    renderWithRouter(<PasswordUnlock />);
    const input = screen.getByPlaceholderText('password.toUnlock');
    fireEvent.change(input, { target: { value: 'correct' } });
    fireEvent.click(screen.getByText('password.unlock'));
    await waitFor(() => {
      expect(mockVerifyAndUnlock).toHaveBeenCalledWith('correct');
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  it('submits on Enter keypress', async () => {
    mockVerifyAndUnlock.mockResolvedValue(true);
    renderWithRouter(<PasswordUnlock />);
    const input = screen.getByPlaceholderText('password.toUnlock');
    fireEvent.change(input, { target: { value: 'correct' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});

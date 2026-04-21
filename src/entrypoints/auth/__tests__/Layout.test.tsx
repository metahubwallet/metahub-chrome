import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockVerifyAndUnlock = vi.fn();

let mockIsLock = true;

vi.mock('@/stores/userStore', () => ({
  useUserStore: Object.assign(
    vi.fn((selector: any) =>
      selector({
        isLock: () => mockIsLock,
      })
    ),
    {
      getState: vi.fn(() => ({
        verifyAndUnlock: mockVerifyAndUnlock,
      })),
    }
  ),
}));

import Layout from '../Layout';

const OutletContent = () => <div data-testid="outlet-content">Outlet rendered</div>;

const renderLayout = (locked: boolean) => {
  mockIsLock = locked;
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route path="login" element={<OutletContent />} />
        </Route>
      </Routes>
    </MemoryRouter>
  );
};

describe('Layout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockVerifyAndUnlock.mockResolvedValue(false);
  });

  it('renders password input and submit button when locked', () => {
    renderLayout(true);
    expect(screen.getByPlaceholderText('password.toUnlock')).toBeInTheDocument();
    expect(screen.getByText('password.unlock')).toBeInTheDocument();
  });

  it('renders lock screen texts when locked', () => {
    renderLayout(true);
    expect(screen.getByText('password.inputPassword')).toBeInTheDocument();
    expect(screen.getByText('password.unlockTip')).toBeInTheDocument();
  });

  it('renders Outlet when unlocked', () => {
    renderLayout(false);
    expect(screen.getByTestId('outlet-content')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('password.toUnlock')).not.toBeInTheDocument();
  });

  it('shows warning when submitting empty password', async () => {
    renderLayout(true);
    fireEvent.click(screen.getByText('password.unlock'));
    await waitFor(() => {
      expect(mockVerifyAndUnlock).not.toHaveBeenCalled();
    });
  });

  it('shows error when password is wrong', async () => {
    mockVerifyAndUnlock.mockResolvedValue(false);
    renderLayout(true);
    const input = screen.getByPlaceholderText('password.toUnlock');
    fireEvent.change(input, { target: { value: 'wrong' } });
    fireEvent.click(screen.getByText('password.unlock'));
    await waitFor(() => {
      expect(mockVerifyAndUnlock).toHaveBeenCalledWith('wrong');
    });
  });

  it('calls verifyAndUnlock on correct password', async () => {
    mockVerifyAndUnlock.mockResolvedValue(true);
    renderLayout(true);
    const input = screen.getByPlaceholderText('password.toUnlock');
    fireEvent.change(input, { target: { value: 'correct' } });
    fireEvent.click(screen.getByText('password.unlock'));
    await waitFor(() => {
      expect(mockVerifyAndUnlock).toHaveBeenCalledWith('correct');
    });
  });

  it('submits on Enter keypress', async () => {
    mockVerifyAndUnlock.mockResolvedValue(true);
    renderLayout(true);
    const input = screen.getByPlaceholderText('password.toUnlock');
    fireEvent.change(input, { target: { value: 'correct' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    await waitFor(() => {
      expect(mockVerifyAndUnlock).toHaveBeenCalledWith('correct');
    });
  });
});

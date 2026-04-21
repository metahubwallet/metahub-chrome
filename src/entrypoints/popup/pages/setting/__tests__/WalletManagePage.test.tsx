import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
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
  useChainStore: vi.fn((selector: any) =>
    selector({ currentChainId: () => 'eos-chain-id' })
  ),
}));

vi.mock('@/stores/userStore', () => ({
  useUserStore: {
    getState: vi.fn(() => ({ setLocked: vi.fn().mockResolvedValue(undefined) })),
  },
}));

vi.mock('@/utils/network', () => ({
  eosChainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
}));

vi.mock('@/utils/cache', () => ({
  localCache: { remove: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock('@/components/PageHeader', () => ({
  default: ({ title }: any) => <div data-testid="page-header">{title}</div>,
}));

vi.mock('../components/ExportWallet', () => ({
  default: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="export-wallet">ExportWallet <button onClick={onClose}>close</button></div> : null,
}));

vi.mock('../components/DestroyWallet', () => ({
  default: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="destroy-wallet">DestroyWallet <button onClick={onClose}>close</button></div> : null,
}));

vi.mock('../components/ChangePassword', () => ({
  default: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="change-password">ChangePassword <button onClick={onClose}>close</button></div> : null,
}));

import WalletManagePage from '../WalletManagePage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <WalletManagePage />
    </MemoryRouter>
  );

describe('WalletManagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header', () => {
    renderPage();
    expect(screen.getByTestId('page-header')).toHaveTextContent('setting.manageWallets');
  });

  it('renders all menu items', () => {
    renderPage();
    expect(screen.getByText('setting.managePermissions')).toBeInTheDocument();
    expect(screen.getByText('setting.exportWallet')).toBeInTheDocument();
    expect(screen.getByText('setting.destroyWallet')).toBeInTheDocument();
    expect(screen.getByText('setting.changePassword')).toBeInTheDocument();
    expect(screen.getByText('setting.clearAbiCache')).toBeInTheDocument();
    expect(screen.getByText('setting.lockWallets')).toBeInTheDocument();
  });

  it('navigates to account manage on manage permissions click', () => {
    renderPage();
    fireEvent.click(screen.getByText('setting.managePermissions'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/account-manage'));
  });

  it('opens export wallet dialog', () => {
    renderPage();
    expect(screen.queryByTestId('export-wallet')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText('setting.exportWallet'));
    expect(screen.getByTestId('export-wallet')).toBeInTheDocument();
  });

  it('closes export wallet dialog', () => {
    renderPage();
    fireEvent.click(screen.getByText('setting.exportWallet'));
    fireEvent.click(screen.getByText('close'));
    expect(screen.queryByTestId('export-wallet')).not.toBeInTheDocument();
  });

  it('opens destroy wallet dialog', () => {
    renderPage();
    fireEvent.click(screen.getByText('setting.destroyWallet'));
    expect(screen.getByTestId('destroy-wallet')).toBeInTheDocument();
  });

  it('opens change password dialog', () => {
    renderPage();
    fireEvent.click(screen.getByText('setting.changePassword'));
    expect(screen.getByTestId('change-password')).toBeInTheDocument();
  });
});

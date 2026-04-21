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

vi.mock('@/components/PageHeader', () => ({
  default: ({ title }: any) => <div data-testid="page-header">{title}</div>,
}));

vi.mock('@/components/EmptyState', () => ({
  default: () => <div data-testid="empty-state">Empty</div>,
}));

vi.mock('@/stores/settingStore', () => ({
  useSettingStore: vi.fn(),
}));

import WhiteListPage from '../WhiteListPage';
import { useSettingStore } from '@/stores/settingStore';

const mockUseSettingStore = useSettingStore as unknown as ReturnType<typeof vi.fn>;

const renderPage = () =>
  render(
    <MemoryRouter>
      <WhiteListPage />
    </MemoryRouter>
  );

describe('WhiteListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header', () => {
    mockUseSettingStore.mockImplementation((selector: any) =>
      selector({ whitelist: [] })
    );
    renderPage();
    expect(screen.getByTestId('page-header')).toHaveTextContent('setting.whitelist');
  });

  it('renders empty state when no whitelist', () => {
    mockUseSettingStore.mockImplementation((selector: any) =>
      selector({ whitelist: [] })
    );
    renderPage();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  it('renders unique domains from whitelist', () => {
    mockUseSettingStore.mockImplementation((selector: any) =>
      selector({
        whitelist: [
          { domain: 'defibox.io', actor: 'alice', contract: 'token', action: 'transfer', permission: 'active', chainId: 'eos', properties: {}, hash: '' },
          { domain: 'defibox.io', actor: 'alice', contract: 'token', action: 'swap', permission: 'active', chainId: 'eos', properties: {}, hash: '' },
          { domain: 'wallet.eos.io', actor: 'bob', contract: 'eosio', action: 'vote', permission: 'active', chainId: 'eos', properties: {}, hash: '' },
        ],
      })
    );
    renderPage();
    expect(screen.getByText('defibox.io')).toBeInTheDocument();
    expect(screen.getByText('wallet.eos.io')).toBeInTheDocument();
  });

  it('does not show duplicate domains', () => {
    mockUseSettingStore.mockImplementation((selector: any) =>
      selector({
        whitelist: [
          { domain: 'defibox.io', actor: 'alice', contract: 'token', action: 'transfer', permission: 'active', chainId: 'eos', properties: {}, hash: '' },
          { domain: 'defibox.io', actor: 'bob', contract: 'token', action: 'swap', permission: 'active', chainId: 'eos', properties: {}, hash: '' },
        ],
      })
    );
    renderPage();
    const domainElements = screen.getAllByText('defibox.io');
    expect(domainElements).toHaveLength(1);
  });

  it('navigates to whitelist detail on domain click', () => {
    mockUseSettingStore.mockImplementation((selector: any) =>
      selector({
        whitelist: [
          { domain: 'defibox.io', actor: 'alice', contract: 'token', action: 'transfer', permission: 'active', chainId: 'eos', properties: {}, hash: '' },
        ],
      })
    );
    renderPage();
    fireEvent.click(screen.getByText('defibox.io'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/whitelist-detail'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('defibox.io'));
  });
});

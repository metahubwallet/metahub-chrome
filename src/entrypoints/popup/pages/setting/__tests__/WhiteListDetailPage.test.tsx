import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams({ domain: 'defibox.io' })],
  };
});

vi.mock('@/components/PageHeader', () => ({
  default: ({ title }: any) => <div data-testid="page-header">{title}</div>,
}));

const mockSetWhitelist = vi.fn().mockResolvedValue(undefined);
vi.mock('@/stores/settingStore', () => ({
  useSettingStore: vi.fn(),
}));

import WhiteListDetailPage from '../WhiteListDetailPage';
import { useSettingStore } from '@/stores/settingStore';

const mockUseSettingStore = useSettingStore as unknown as ReturnType<typeof vi.fn>;

const mockWhitelist = [
  {
    domain: 'defibox.io',
    actor: 'alice',
    contract: 'token.defi',
    action: 'transfer',
    permission: 'active',
    chainId: 'eos',
    properties: { quantity: '1.0000 EOS', memo: 'test' },
    hash: 'h1',
  },
  {
    domain: 'defibox.io',
    actor: 'alice',
    contract: 'token.defi',
    action: 'swap',
    permission: 'active',
    chainId: 'eos',
    properties: {},
    hash: 'h2',
  },
  {
    domain: 'other.io',
    actor: 'bob',
    contract: 'eosio',
    action: 'vote',
    permission: 'active',
    chainId: 'eos',
    properties: {},
    hash: 'h3',
  },
];

const renderPage = () =>
  render(
    <MemoryRouter>
      <WhiteListDetailPage />
    </MemoryRouter>
  );

describe('WhiteListDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSettingStore.mockImplementation((selector: any) =>
      selector({ whitelist: mockWhitelist, setWhitelist: mockSetWhitelist })
    );
  });

  it('renders page header', () => {
    renderPage();
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });

  it('shows actor name', () => {
    renderPage();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('shows contract key', () => {
    renderPage();
    expect(screen.getByText('token.defi')).toBeInTheDocument();
  });

  it('shows action name', () => {
    renderPage();
    expect(screen.getByText('transfer')).toBeInTheDocument();
    expect(screen.getByText('swap')).toBeInTheDocument();
  });

  it('shows properties', () => {
    renderPage();
    expect(screen.getByText(/quantity: 1.0000 EOS/)).toBeInTheDocument();
  });

  it('does not show items from other domains', () => {
    renderPage();
    expect(screen.queryByText('bob')).not.toBeInTheDocument();
  });

  it('calls setWhitelist when cancel all contract items', () => {
    renderPage();
    const cancelButtons = screen.getAllByText('setting.whiteListCancel2');
    fireEvent.click(cancelButtons[0]);
    expect(mockSetWhitelist).toHaveBeenCalled();
  });

  it('calls setWhitelist when cancel single action item', () => {
    renderPage();
    const cancelButtons = screen.getAllByText('setting.whiteListCancel');
    fireEvent.click(cancelButtons[0]);
    expect(mockSetWhitelist).toHaveBeenCalled();
  });
});

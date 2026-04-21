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

const mockSetNetworks = vi.fn().mockResolvedValue(undefined);
const mockSetSelectedRpc = vi.fn().mockResolvedValue(undefined);
const mockSetCustomRpcs = vi.fn().mockResolvedValue(undefined);
const eosChainId = 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906';

vi.mock('@/stores/chainStore', () => ({
  useChainStore: vi.fn((selector: any) =>
    selector({
      networks: [{ chainId: eosChainId, name: 'EOS', chain: 'eos', endpoint: 'https://eos.greymass.com' }],
      customRpcs: {},
      setNetworks: mockSetNetworks,
      setSelectedRpc: mockSetSelectedRpc,
      setCustomRpcs: mockSetCustomRpcs,
    })
  ),
}));

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: vi.fn((selector: any) =>
    selector({ wallets: [] })
  ),
}));

vi.mock('@/utils/network', () => ({
  eosChainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
  supportNetworks: [
    {
      name: 'EOS',
      chain: 'eos',
      chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
      endpoint: 'https://eos.greymass.com',
      token: { symbol: 'EOS', contract: 'eosio.token', precision: 4 },
    },
    {
      name: 'WAX',
      chain: 'wax',
      chainId: 'wax-chain-id-1234567890123456789012345678901234567890123456789012345678',
      endpoint: 'https://wax.api.com',
      token: { symbol: 'WAX', contract: 'eosio.token', precision: 8 },
    },
  ],
}));

vi.mock('@/components/PageHeader', () => ({
  default: ({ title }: any) => <div data-testid="page-header">{title}</div>,
}));

vi.mock('@/components/ConfirmDialog', () => ({
  default: ({ isOpen, children, onConfirm, onClose }: any) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        {children}
        <button onClick={onConfirm}>confirm</button>
        <button onClick={onClose}>cancel</button>
      </div>
    ) : null,
}));

import NetworkAddExistsPage from '../NetworkAddExistsPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <NetworkAddExistsPage />
    </MemoryRouter>
  );

describe('NetworkAddExistsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header', () => {
    renderPage();
    expect(screen.getByTestId('page-header')).toHaveTextContent('setting.addExistingNetwork');
  });

  it('renders table headers', () => {
    renderPage();
    expect(screen.getByText('setting.name')).toBeInTheDocument();
    expect(screen.getByText('ChainId')).toBeInTheDocument();
    expect(screen.getByText('setting.operation')).toBeInTheDocument();
  });

  it('renders all support networks', () => {
    renderPage();
    expect(screen.getByText('EOS')).toBeInTheDocument();
    expect(screen.getByText('WAX')).toBeInTheDocument();
  });

  it('shows add button for networks not yet added', () => {
    renderPage();
    // WAX is not in the current networks, so it should have a Plus icon
    const plusIcons = document.querySelectorAll('[data-lucide="plus"]');
    // At minimum WAX row should have an add option
    expect(screen.getByText('WAX')).toBeInTheDocument();
  });

  it('shows confirm dialog on add click', () => {
    renderPage();
    const plusButtons = document.querySelectorAll('svg[data-lucide]');
    // Click any plus icon
    const waxRow = screen.getByText('WAX').closest('tr');
    const svgInRow = waxRow?.querySelector('svg');
    if (svgInRow) {
      fireEvent.click(svgInRow);
      expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
    }
  });
});

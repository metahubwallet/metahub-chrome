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

const networks = [
  {
    chainId: 'aca376',
    name: 'EOS',
    chain: 'eos',
    endpoint: 'https://eos.greymass.com',
    token: { contract: 'eosio.token', symbol: 'EOS', precision: 4 },
  },
  {
    chainId: 'wax123',
    name: 'WAX',
    chain: 'wax',
    endpoint: 'https://api.waxsweden.org',
    token: { contract: 'eosio.token', symbol: 'WAX', precision: 8 },
  },
];

const wallets = [
  { name: 'alice', chainId: 'aca376', seed: '', blockchain: 'eos', smoothMode: false, keys: [{ publicKey: 'EOS6ABC...', privateKey: 'enc', permissions: [] }] },
  { name: 'charlie', chainId: 'wax123', seed: '', blockchain: 'eos', smoothMode: false, keys: [{ publicKey: 'EOS7DEF...', privateKey: 'enc', permissions: [] }] },
];

vi.mock('@/stores/chainStore', () => ({
  useChainStore: vi.fn((selector: any) =>
    selector({
      currentChainId: () => 'aca376',
      networks,
    })
  ),
}));

const mockSetSelectedIndex = vi.fn().mockResolvedValue(undefined);

const walletState = {
  wallets,
  selectedIndex: 0,
  setSelectedIndex: mockSetSelectedIndex,
};

vi.mock('@/stores/walletStore', () => {
  const useWalletStore: any = vi.fn((selector?: any) => {
    if (selector) return selector(walletState);
    return walletState;
  });
  useWalletStore.getState = vi.fn(() => walletState);
  return { useWalletStore };
});

const mockSetLocked = vi.fn().mockResolvedValue(undefined);
vi.mock('@/stores/userStore', () => ({
  useUserStore: {
    getState: vi.fn(() => ({ setLocked: mockSetLocked })),
  },
}));

vi.mock('@/utils/network', () => ({
  getNetworkLocalIcon: vi.fn(() => '/icon.png'),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => (
    <button onClick={onClick}>{children}</button>
  ),
}));

import AccountSelector from '../AccountSelector';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('AccountSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders hidden (translated off-screen) when closed', () => {
    const { container } = renderWithRouter(<AccountSelector isOpen={false} onClose={vi.fn()} />);
    expect(container.querySelector('.translate-y-full')).toBeInTheDocument();
  });

  it('renders visible when open', () => {
    const { container } = renderWithRouter(<AccountSelector isOpen={true} onClose={vi.fn()} />);
    expect(container.querySelector('.translate-y-0')).toBeInTheDocument();
    expect(screen.getByText('auth.chooseAccount')).toBeInTheDocument();
  });

  it('displays network tabs', () => {
    renderWithRouter(<AccountSelector isOpen={true} onClose={vi.fn()} />);
    const networkIcons = screen.getAllByAltText('EOS');
    expect(networkIcons.length).toBeGreaterThan(0);
  });

  it('displays accounts for active chain', () => {
    renderWithRouter(<AccountSelector isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('selects account and closes on click', async () => {
    const onClose = vi.fn();
    renderWithRouter(<AccountSelector isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('alice').closest('div') as HTMLElement);
    await waitFor(() => {
      expect(mockSetSelectedIndex).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('locks wallet and closes on lock button click', async () => {
    const onClose = vi.fn();
    const { container } = renderWithRouter(<AccountSelector isOpen={true} onClose={onClose} />);
    // Lock button is the first button in the title bar (leading a Lock icon).
    const lockBtn = container.querySelector('.h-14 > button') as HTMLElement;
    fireEvent.click(lockBtn);
    await waitFor(() => {
      expect(mockSetLocked).toHaveBeenCalled();
      expect(onClose).toHaveBeenCalled();
    });
  });
});

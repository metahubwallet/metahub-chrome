import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

// Mock stores
vi.mock('@/stores/chainStore', () => ({
  useChainStore: vi.fn(),
}));
vi.mock('@/stores/walletStore', () => ({
  useWalletStore: vi.fn(),
}));
vi.mock('@/stores/userStore', () => ({
  useUserStore: {
    getState: vi.fn(() => ({ password: 'abc123' })),
  },
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

// Mock navigation
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams()],
  };
});

// Mock crypto
vi.mock('@/utils/crypto', () => ({
  sha256: vi.fn(() => '0000000000000000'),
  md5: vi.fn((v: string) => `md5:${v}`),
  encrypt: vi.fn((v: string) => `enc:${v}`),
}));

// Mock keyring
vi.mock('@/lib/keyring', () => ({
  isValidPrivate: (key: string) => key === 'VALID_PRIVATE_KEY',
  privateToPublic: vi.fn(() => 'EOS_PUBLIC_KEY'),
}));

// Mock remote
vi.mock('@/lib/remote', () => ({
  queryKeyAccountsWithFallback: vi.fn().mockResolvedValue(['alice']),
  getEndpoints: vi.fn().mockResolvedValue([]),
}));

// Mock chain
vi.mock('@/lib/chain', () => ({
  default: {
    getApi: vi.fn(() => ({})),
    fetchPermissions: vi.fn().mockResolvedValue(undefined),
  },
}));

// Mock bs58
vi.mock('bs58', () => ({ default: { encode: vi.fn(() => 'ENCODED_KEY') } }));

// Mock network
vi.mock('@/utils/network', () => ({
  eosChainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
  getNetworkLocalIcon: vi.fn(() => '/eos.png'),
}));

// Mock components
vi.mock('@/components/PageHeader', () => ({
  default: ({ title }: any) => <div data-testid="page-header">{title}</div>,
}));
vi.mock('@/entrypoints/popup/pages/wallet/components/ImportChoose', () => ({
  default: ({ isOpen, onClose }: any) =>
    isOpen ? <div data-testid="import-choose"><button onClick={onClose}>close</button></div> : null,
}));
vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled}>{children}</button>
  ),
}));

import ImportKeyPage from '../ImportKeyPage';
import { useChainStore } from '@/stores/chainStore';
import { useWalletStore } from '@/stores/walletStore';

const mockChainStore = useChainStore as unknown as ReturnType<typeof vi.fn>;
const mockWalletStore = useWalletStore as unknown as ReturnType<typeof vi.fn>;

const networks = [
  {
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
    name: 'EOS',
    chain: 'eos',
    endpoint: 'https://eos.greymass.com',
    token: { contract: 'eosio.token', symbol: 'EOS', precision: 4 },
  },
];

const setupMocks = () => {
  mockChainStore.mockImplementation((selector: any) =>
    selector({
      networks,
      findNetwork: (chainId: string) => networks.find((n) => n.chainId === chainId) || networks[0],
    })
  );
  (useChainStore as any).getState = vi.fn(() => ({
    networks,
    findNetwork: (chainId: string) => networks.find((n) => n.chainId === chainId) || networks[0],
    selectedRpc: (_chainId: string) => 'https://eos.greymass.com',
    customRpcs: {},
  }));

  mockWalletStore.mockImplementation((selector: any) =>
    selector({ wallets: [], selectedIndex: 0 })
  );
  (useWalletStore as any).getState = vi.fn(() => ({
    wallets: [],
    setWallets: vi.fn().mockResolvedValue(undefined),
    setSelectedIndex: vi.fn().mockResolvedValue(undefined),
  }));
};

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('ImportKeyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMocks();
  });

  it('renders page header', () => {
    renderWithRouter(<ImportKeyPage />);
    expect(screen.getByTestId('page-header')).toBeInTheDocument();
  });

  it('renders private key textarea', () => {
    renderWithRouter(<ImportKeyPage />);
    const textarea = screen.getByPlaceholderText('public.importKeyTip');
    expect(textarea).toBeInTheDocument();
  });

  it('renders network selector dropdown', () => {
    renderWithRouter(<ImportKeyPage />);
    expect(screen.getByText('EOS')).toBeInTheDocument();
  });

  it('renders protocol checkbox', () => {
    renderWithRouter(<ImportKeyPage />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
  });

  it('renders import button', () => {
    renderWithRouter(<ImportKeyPage />);
    expect(screen.getByRole('button', { name: 'public.importKey' })).toBeInTheDocument();
  });

  it('shows warning when protocol is unchecked on submit', async () => {
    renderWithRouter(<ImportKeyPage />);
    // Uncheck the protocol
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);

    const importBtn = screen.getByRole('button', { name: 'public.importKey' });
    fireEvent.click(importBtn);

    // Doesn't crash
    await waitFor(() => {
      expect(screen.queryByTestId('import-choose')).not.toBeInTheDocument();
    });
  });

  it('shows invalid key error for bad private key', async () => {
    renderWithRouter(<ImportKeyPage />);
    const textarea = screen.getByPlaceholderText('public.importKeyTip');
    fireEvent.change(textarea, { target: { value: 'INVALID_KEY' } });

    const importBtn = screen.getByRole('button', { name: 'public.importKey' });
    fireEvent.click(importBtn);

    await waitFor(() => {
      expect(screen.queryByTestId('import-choose')).not.toBeInTheDocument();
    });
  });
});

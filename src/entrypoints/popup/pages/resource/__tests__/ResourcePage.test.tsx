import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ResourcePage from '@/entrypoints/popup/pages/resource/ResourcePage';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockResourceInfo = {
  accountInfo: {
    core_liquid_balance: '10.0000 EOS',
    cpu_limit: { max: 2000000, used: 500000 },
    net_limit: { max: 1000000, used: 200000 },
    ram_quota: 65536,
    ram_usage: 16384,
    refund_request: null,
    total_resources: {
      cpu_weight: '5.0000 EOS',
      net_weight: '2.0000 EOS',
    },
    self_delegated_bandwidth: {
      cpu_weight: '3.0000 EOS',
      net_weight: '1.0000 EOS',
    },
  },
  delegatebw: [],
  ramMarket: { rows: [{ quote: { balance: '1000.0000 EOS' }, base: { balance: '10000000 RAM' } }] },
};

vi.mock('@/hooks/useResourceInfo', () => ({
  useResourceInfo: () => ({
    data: mockResourceInfo,
    isLoading: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSmoothModeTime', () => ({
  useSmoothModeTime: () => ({ data: { code: 200, result: 5000 } }),
}));

vi.mock('@/hooks/useChainInstance', () => ({
  getChainInstance: () => ({
    getApi: () => ({
      refund: vi.fn().mockResolvedValue({}),
    }),
    getAuth: () => 'alice@active',
    getErrorMsg: (e: unknown) => String(e),
  }),
  useChainInstance: () => ({}),
}));

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: (selector?: Function) => {
    const state = {
      currentWallet: () => ({ name: 'alice', chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906', smoothMode: false }),
      wallets: [{ name: 'alice', chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906', smoothMode: false }],
      selectedIndex: 0,
      setWallets: vi.fn().mockResolvedValue(undefined),
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/stores/chainStore', () => ({
  useChainStore: (selector?: Function) => {
    const state = {
      currentChainId: () => 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
      currentSymbol: () => 'EOS',
      currentNetwork: { token: { symbol: 'EOS', precision: 4 } },
    };
    return selector ? selector(state) : state;
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderPage = () => {
  const client = createClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/resource']}>
        <Routes>
          <Route path="/resource" element={<ResourcePage />} />
          <Route path="/resource/recharge" element={<div>RechargePage</div>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ResourcePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header', () => {
    renderPage();
    expect(screen.getByText('resource.resources')).toBeInTheDocument();
  });

  it('renders smooth mode toggle on EOS mainnet', () => {
    renderPage();
    expect(screen.getByText('resource.smoothMode')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox').length).toBeGreaterThan(0);
  });

  it('displays smooth mode CPU time', () => {
    renderPage();
    expect(screen.getByText(/5 ms/)).toBeInTheDocument();
  });

  it('renders EOS/A system-contract toggle with EOS active by default', () => {
    renderPage();
    const eosTab = screen.getByRole('tab', { name: 'EOS' });
    const aTab = screen.getByRole('tab', { name: 'A' });
    expect(eosTab).toBeInTheDocument();
    expect(aTab).toBeInTheDocument();
    expect(eosTab).toHaveAttribute('aria-selected', 'true');
    expect(aTab).toHaveAttribute('aria-selected', 'false');
  });

  it('renders trade REX external link', () => {
    renderPage();
    expect(screen.getByText('resource.tradeREX')).toBeInTheDocument();
  });

  it('renders CPU and NET resource rows', () => {
    renderPage();
    expect(screen.getByText('CPU')).toBeInTheDocument();
    expect(screen.getByText('resource.net')).toBeInTheDocument();
  });

  it('renders RAM row', () => {
    renderPage();
    expect(screen.getByText('resource.ram')).toBeInTheDocument();
  });

  it('toggles smooth mode when switch is clicked', async () => {
    renderPage();
    // Smooth mode Switch is the one adjacent to "resource.smoothMode" text.
    const smoothText = screen.getByText('resource.smoothMode');
    const smoothCard = smoothText.closest('div')!.parentElement!;
    const toggle = smoothCard.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(toggle).toBeInTheDocument();
    await userEvent.click(toggle);
    expect(toggle.checked).toBe(true);
  });

  it('navigates to recharge when recharge link is clicked', async () => {
    renderPage();
    const rechargeBtn = screen.getByText(/resource.recharge/);
    await userEvent.click(rechargeBtn);
    await waitFor(() => {
      expect(screen.getByText('RechargePage')).toBeInTheDocument();
    });
  });
});

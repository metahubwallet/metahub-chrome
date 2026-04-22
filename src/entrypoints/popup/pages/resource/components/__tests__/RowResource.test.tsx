import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RowResource from '@/entrypoints/popup/pages/resource/components/RowResource';
import { ResourceData } from '@/entrypoints/popup/pages/resource/ResourcePage';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockRefund = vi.fn().mockResolvedValue({});

vi.mock('@/hooks/useChainInstance', () => ({
  getChainInstance: () => ({
    getApi: () => ({
      refund: mockRefund,
      getDelegatebwList: vi.fn().mockResolvedValue([]),
      delegatebw: vi.fn().mockResolvedValue({}),
      undelegatebw: vi.fn().mockResolvedValue({}),
      powerup: vi.fn().mockResolvedValue({}),
    }),
    getAuth: () => 'alice@active',
    getErrorMsg: (e: unknown) => String(e),
  }),
  useChainInstance: () => ({}),
}));

vi.mock('@/hooks/usePowupState', () => ({
  usePowupState: () => ({ data: null }),
}));

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: (selector?: Function) => {
    const state = {
      currentWallet: () => ({ name: 'alice', chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906' }),
      wallets: [{ name: 'alice' }],
      selectedIndex: 0,
      setWallets: vi.fn(),
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

// ── Test data ─────────────────────────────────────────────────────────────────

const mockResourceData: ResourceData = {
  core_liquid_balance: '10.0000 EOS',
  use_percentage: 25,
  use_limit: { max: 2000000, used: 500000 },
  stake_max: 10,
  refund_request: { amount: 0, request_time: 0, left_time: '' },
  total_resources_weight: '5.0000 EOS',
  self_delegated_bandwidth_weight: '3.0000 EOS',
  staked_for_others: 1.5,
  staked_for_user: 2.0,
};

const mockResources = { cpu: mockResourceData, net: mockResourceData };

// ── Helpers ───────────────────────────────────────────────────────────────────

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderComponent = (type: 'cpu' | 'net' = 'cpu', onRefresh = vi.fn()) => {
  const client = createClient();
  return render(
    <QueryClientProvider client={client}>
      <RowResource type={type} resources={mockResources} onRefresh={onRefresh} />
    </QueryClientProvider>,
  );
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RowResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders CPU title for cpu type', () => {
    renderComponent('cpu');
    expect(screen.getByText('CPU')).toBeInTheDocument();
  });

  it('renders NET title for net type', () => {
    renderComponent('net');
    expect(screen.getByText('resource.net')).toBeInTheDocument();
  });

  it('renders progress bar', () => {
    renderComponent('cpu');
    expect(screen.getByText('resource.used')).toBeInTheDocument();
    expect(screen.getByText(/500.00 ms \/ 2000.00 ms/)).toBeInTheDocument();
  });

  it('renders staked info', () => {
    renderComponent('cpu');
    expect(screen.getByText('resource.staked')).toBeInTheDocument();
    expect(screen.getByText('5.0000 EOS')).toBeInTheDocument();
  });

  it('renders staked for others info', () => {
    renderComponent('cpu');
    expect(screen.getByText('resource.stakeForOthers')).toBeInTheDocument();
    expect(screen.getByText(/1\.5000 EOS/)).toBeInTheDocument();
  });

  it('renders Stake, Unstake, Rent buttons', () => {
    renderComponent('cpu');
    expect(screen.getByText('resource.stake')).toBeInTheDocument();
    expect(screen.getByText('resource.unstake')).toBeInTheDocument();
    expect(screen.getByText('resource.rent')).toBeInTheDocument();
  });

  it('does not render refund section when no refund pending', () => {
    renderComponent('cpu');
    // Refund hourglass button should not be rendered (it has aria-label of resource.refunding)
    expect(screen.queryByRole('button', { name: 'resource.refunding' })).not.toBeInTheDocument();
  });

  it('renders refund section when refund is pending', () => {
    const resourceWithRefund: ResourceData = {
      ...mockResourceData,
      refund_request: { amount: 2.5, request_time: Date.now() - 1000, left_time: '2d 12h 30m' },
    };
    const client = createClient();
    render(
      <QueryClientProvider client={client}>
        <RowResource
          type="cpu"
          resources={{ cpu: resourceWithRefund, net: resourceWithRefund }}
          onRefresh={vi.fn()}
        />
      </QueryClientProvider>,
    );
    expect(screen.getAllByText('resource.refunding').length).toBeGreaterThan(0);
    expect(screen.getByText('2d 12h 30m')).toBeInTheDocument();
  });

  it('shows "Refund Now" button when refund countdown is done', () => {
    const resourceReady: ResourceData = {
      ...mockResourceData,
      refund_request: { amount: 2.5, request_time: Date.now() - 9999999999, left_time: '-' },
    };
    const client = createClient();
    render(
      <QueryClientProvider client={client}>
        <RowResource
          type="cpu"
          resources={{ cpu: resourceReady, net: resourceReady }}
          onRefresh={vi.fn()}
        />
      </QueryClientProvider>,
    );
    expect(screen.getByText('resource.refundNow')).toBeInTheDocument();
  });

  it('opens StakedDetail when staked row is clicked', async () => {
    renderComponent('cpu');
    const stakedBtn = screen.getByText('resource.staked').closest('button')!;
    await userEvent.click(stakedBtn);
    await waitFor(() => {
      // StakedDetail and StakedOtherDetail both render in DOM, check that at least one opens
      const allStakeInfoTitles = screen.getAllByText('resource.stakeInfo');
      expect(allStakeInfoTitles.length).toBeGreaterThan(0);
    });
  });

  it('opens ResourceOption dialog when Stake is clicked', async () => {
    renderComponent('cpu');
    await userEvent.click(screen.getByText('resource.stake'));
    await waitFor(() => {
      expect(screen.getByText(/resource\.stake.*resource\.resources/)).toBeInTheDocument();
    });
  });
});

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import ResourceOption from '@/entrypoints/popup/pages/resource/components/ResourceOption';
import { ResourceData } from '@/entrypoints/popup/pages/resource/ResourcePage';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockDelegatebw = vi.fn().mockResolvedValue({});
const mockUndelegatebw = vi.fn().mockResolvedValue({});
const mockPowerup = vi.fn().mockResolvedValue({});

vi.mock('@/hooks/useChainInstance', () => ({
  getChainInstance: () => ({
    getApi: () => ({
      delegatebw: mockDelegatebw,
      undelegatebw: mockUndelegatebw,
      powerup: mockPowerup,
    }),
    getAuth: () => 'alice@active',
    getErrorMsg: (e: unknown) => String(e),
  }),
  useChainInstance: () => ({}),
}));

vi.mock('@/hooks/usePowupState', () => ({
  usePowupState: () => ({
    data: {
      cpu: { weight: '1.0', weight_ratio: '1', assumed_stake_weight: '1', adjusted_utilization: '0', utilization: '0', utilization_timestamp: 0, exponent: 1, decay_secs: 86400, min_price: '0.0001 EOS', max_price: '1.0000 EOS' },
      net: { weight: '1.0', weight_ratio: '1', assumed_stake_weight: '1', adjusted_utilization: '0', utilization: '0', utilization_timestamp: 0, exponent: 1, decay_secs: 86400, min_price: '0.0001 EOS', max_price: '1.0000 EOS' },
      powerup_days: 1,
      min_powerup_fee: '0.0001 EOS',
    },
  }),
}));

vi.mock('@/lib/powerup', () => ({
  powerup: () => ({ max_payment: '0.1000 EOS', payer: 'alice', receiver: 'alice', days: 1, net_frac: '0', cpu_frac: '0' }),
}));

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: (selector?: Function) => {
    const state = {
      currentWallet: () => ({ name: 'alice', chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906' }),
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

const renderComponent = (
  action: 'stake' | 'refund' | 'rent',
  isOpen = true,
  onClose = vi.fn(),
  onRefresh = vi.fn()
) => {
  const client = createClient();
  return render(
    <QueryClientProvider client={client}>
      <ResourceOption
        isOpen={isOpen}
        action={action}
        resources={mockResources}
        onClose={onClose}
        onRefresh={onRefresh}
      />
    </QueryClientProvider>,
  );
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ResourceOption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Stake mode', () => {
    it('renders stake title', () => {
      renderComponent('stake');
      expect(screen.getByText('resource.stake resource.resources')).toBeInTheDocument();
    });

    it('renders receiver field in stake mode', () => {
      renderComponent('stake');
      expect(screen.getByText('resource.stakeReceiver')).toBeInTheDocument();
    });

    it('renders CPU and NET amount inputs', () => {
      renderComponent('stake');
      expect(screen.getByText(/CPU.*resource\.amount/)).toBeInTheDocument();
      expect(screen.getByText(/NET.*resource\.amount/)).toBeInTheDocument();
    });

    it('renders transfer stake checkbox in stake mode', () => {
      renderComponent('stake');
      expect(screen.getByText('resource.transferStake')).toBeInTheDocument();
    });

    it('does not render estimated cost in stake mode', () => {
      renderComponent('stake');
      expect(screen.queryByText(/resource\.estimatedCost/)).not.toBeInTheDocument();
    });

    it('calls delegatebw on confirm', async () => {
      renderComponent('stake');
      // Set a non-zero CPU value by clicking increment
      const incrementBtns = screen.getAllByLabelText('Increase value');
      await userEvent.click(incrementBtns[0]);
      await userEvent.click(screen.getByText('public.ok'));
      await waitFor(() => {
        expect(mockDelegatebw).toHaveBeenCalled();
      });
    });
  });

  describe('Unstake mode', () => {
    it('renders unstake title', () => {
      renderComponent('refund');
      expect(screen.getByText('resource.unstake resource.resources')).toBeInTheDocument();
    });

    it('does not render receiver field in unstake mode', () => {
      renderComponent('refund');
      expect(screen.queryByText('resource.stakeReceiver')).not.toBeInTheDocument();
    });

    it('does not render transfer stake checkbox in unstake mode', () => {
      renderComponent('refund');
      expect(screen.queryByText('resource.transferStake')).not.toBeInTheDocument();
    });

    it('calls undelegatebw on confirm', async () => {
      renderComponent('refund');
      const incrementBtns = screen.getAllByLabelText('Increase value');
      await userEvent.click(incrementBtns[0]);
      await userEvent.click(screen.getByText('public.ok'));
      await waitFor(() => {
        expect(mockUndelegatebw).toHaveBeenCalled();
      });
    });
  });

  describe('Rent mode', () => {
    it('renders rent title', () => {
      renderComponent('rent');
      expect(screen.getByText('resource.rent resource.resources')).toBeInTheDocument();
    });

    it('renders receiver field in rent mode', () => {
      renderComponent('rent');
      expect(screen.getByText('resource.stakeReceiver')).toBeInTheDocument();
    });

    it('does not render transfer stake checkbox in rent mode', () => {
      renderComponent('rent');
      expect(screen.queryByText('resource.transferStake')).not.toBeInTheDocument();
    });

    it('calls powerup on confirm', async () => {
      renderComponent('rent');
      await userEvent.click(screen.getByText('public.ok'));
      await waitFor(() => {
        expect(mockPowerup).toHaveBeenCalled();
      });
    });
  });

  it('calls onClose when cancel is clicked', async () => {
    const onClose = vi.fn();
    renderComponent('stake', true, onClose);
    await userEvent.click(screen.getByText('public.cancel'));
    expect(onClose).toHaveBeenCalled();
  });

  it('does not render when isOpen is false', () => {
    const { container } = renderComponent('stake', false);
    // Sheet content should be hidden via translate-y-full class
    expect(container.querySelector('.translate-y-full')).toBeInTheDocument();
  });
});

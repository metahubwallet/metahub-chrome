import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RowRam from '@/entrypoints/popup/pages/resource/components/RowRam';
import { ResourceBase } from '@/entrypoints/popup/pages/resource/ResourcePage';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockBuyRam = vi.fn().mockResolvedValue({});
const mockSellRam = vi.fn().mockResolvedValue({});

vi.mock('@/hooks/useChainInstance', () => ({
  getChainInstance: () => ({
    getApi: () => ({
      buyRam: mockBuyRam,
      sellRam: mockSellRam,
    }),
    getAuth: () => 'alice@active',
    getErrorMsg: (e: unknown) => String(e),
  }),
  useChainInstance: () => ({}),
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

const mockMemory: ResourceBase = {
  core_liquid_balance: '10.0000 EOS',
  use_percentage: 50,
  use_limit: { max: 65536, used: 32768 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderComponent = (onRefresh = vi.fn()) => {
  const client = createClient();
  return render(
    <QueryClientProvider client={client}>
      <RowRam memory={mockMemory} ramprice={0.1234} onRefresh={onRefresh} />
    </QueryClientProvider>,
  );
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RowRam', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders RAM title', () => {
    renderComponent();
    expect(screen.getByText('resource.ram')).toBeInTheDocument();
  });

  it('renders progress bar with usage info', () => {
    renderComponent();
    expect(screen.getByText('resource.used')).toBeInTheDocument();
    expect(screen.getByText(/32\.00 KB \/ 64\.00 KB/)).toBeInTheDocument();
  });

  it('renders RAM price', () => {
    renderComponent();
    expect(screen.getByText('resource.price')).toBeInTheDocument();
    expect(screen.getByText(/0\.1234 EOS\/KB/)).toBeInTheDocument();
  });

  it('renders Buy and Sell buttons', () => {
    renderComponent();
    expect(screen.getByText('resource.buy')).toBeInTheDocument();
    expect(screen.getByText('resource.sell')).toBeInTheDocument();
  });

  it('opens buy modal when Buy is clicked', async () => {
    renderComponent();
    await userEvent.click(screen.getByText('resource.buy'));
    await waitFor(() => {
      expect(screen.getByText('resource.buy resource.ram')).toBeInTheDocument();
    });
  });

  it('opens sell modal when Sell is clicked', async () => {
    renderComponent();
    await userEvent.click(screen.getByText('resource.sell'));
    await waitFor(() => {
      expect(screen.getByText('resource.sell resource.ram')).toBeInTheDocument();
    });
  });

  it('shows receiver input in buy modal', async () => {
    renderComponent();
    await userEvent.click(screen.getByText('resource.buy'));
    await waitFor(() => {
      expect(screen.getByText('resource.stakeReceiver')).toBeInTheDocument();
    });
  });

  it('does not show receiver input in sell modal', async () => {
    renderComponent();
    await userEvent.click(screen.getByText('resource.sell'));
    await waitFor(() => {
      expect(screen.queryByText('resource.stakeReceiver')).not.toBeInTheDocument();
    });
  });

  it('shows amount input in modal', async () => {
    renderComponent();
    await userEvent.click(screen.getByText('resource.buy'));
    await waitFor(() => {
      expect(screen.getByText('resource.amount')).toBeInTheDocument();
    });
  });

  it('closes modal on cancel', async () => {
    renderComponent();
    await userEvent.click(screen.getByText('resource.buy'));
    await waitFor(() => {
      expect(screen.getByText('resource.buy resource.ram')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('public.cancel'));
    await waitFor(() => {
      expect(screen.queryByText('resource.buy resource.ram')).not.toBeInTheDocument();
    });
  });
});

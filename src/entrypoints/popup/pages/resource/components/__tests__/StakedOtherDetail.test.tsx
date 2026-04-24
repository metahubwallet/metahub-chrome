import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import StakedOtherDetail from '@/entrypoints/popup/pages/resource/components/StakedOtherDetail';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockGetDelegatebwList = vi.fn();
const mockUndelegatebw = vi.fn().mockResolvedValue({});

vi.mock('@/hooks/useChainInstance', () => ({
  getChainInstance: () => ({
    getApi: () => ({
      getDelegatebwList: mockGetDelegatebwList,
      undelegatebw: mockUndelegatebw,
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
    };
    return selector ? selector(state) : state;
  },
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderComponent = (
  type: 'cpu' | 'net',
  isOpen = true,
  stakeList: any[] = []
) => {
  mockGetDelegatebwList.mockResolvedValue(stakeList);
  const client = createClient();
  return render(
    <QueryClientProvider client={client}>
      <StakedOtherDetail
        isOpen={isOpen}
        onClose={vi.fn()}
        onRefresh={vi.fn()}
        type={type}
      />
    </QueryClientProvider>,
  );
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StakedOtherDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders with pointer-events-none (closed) when isOpen is false', () => {
    mockGetDelegatebwList.mockResolvedValue([]);
    renderComponent('cpu', false);
    // Sheet is always in DOM but has pointer-events-none when closed
    const wrapper = document.querySelector('.pointer-events-none');
    expect(wrapper).toBeInTheDocument();
  });

  it('renders title when open', async () => {
    renderComponent('cpu', true, []);
    await waitFor(() => {
      expect(screen.getByText('resource.stakeInfo')).toBeInTheDocument();
    });
  });

  it('shows empty message when no stakes for others', async () => {
    renderComponent('cpu', true, [
      { from: 'alice', to: 'alice', cpu_weight: '5.0000 EOS', net_weight: '2.0000 EOS' },
    ]);
    await waitFor(() => {
      expect(screen.getByText('resource.noStakeForOthers')).toBeInTheDocument();
    });
  });

  it('renders CPU stakes for other accounts', async () => {
    renderComponent('cpu', true, [
      { from: 'alice', to: 'alice', cpu_weight: '5.0000 EOS', net_weight: '2.0000 EOS' },
      { from: 'alice', to: 'bob', cpu_weight: '1.0000 EOS', net_weight: '0.0000 EOS' },
    ]);
    await waitFor(() => {
      expect(screen.getByText('bob:')).toBeInTheDocument();
      expect(screen.getByText('1.0000 EOS')).toBeInTheDocument();
    });
  });

  it('renders NET stakes for other accounts', async () => {
    renderComponent('net', true, [
      { from: 'alice', to: 'alice', cpu_weight: '0.0000 EOS', net_weight: '2.0000 EOS' },
      { from: 'alice', to: 'carol', cpu_weight: '0.0000 EOS', net_weight: '0.5000 EOS' },
    ]);
    await waitFor(() => {
      expect(screen.getByText('carol:')).toBeInTheDocument();
      expect(screen.getByText('0.5000 EOS')).toBeInTheDocument();
    });
  });

  it('renders unstake button for each row', async () => {
    renderComponent('cpu', true, [
      { from: 'alice', to: 'bob', cpu_weight: '1.0000 EOS', net_weight: '0.0000 EOS' },
      { from: 'alice', to: 'carol', cpu_weight: '2.0000 EOS', net_weight: '0.0000 EOS' },
    ]);
    await waitFor(() => {
      const unstakeButtons = screen.getAllByText('resource.unstake');
      expect(unstakeButtons.length).toBe(2);
    });
  });

  it('calls undelegatebw when unstake button is clicked', async () => {
    const stakeList = [
      { from: 'alice', to: 'bob', cpu_weight: '1.0000 EOS', net_weight: '0.0000 EOS' },
    ];
    renderComponent('cpu', true, stakeList);
    await waitFor(() => {
      expect(screen.getByText('resource.unstake')).toBeInTheDocument();
    });
    await userEvent.click(screen.getByText('resource.unstake'));
    await waitFor(() => {
      expect(mockUndelegatebw).toHaveBeenCalledWith(
        'alice',
        'bob',
        '0.0000 EOS',
        '1.0000 EOS',
        'alice@active',
        'eosio'
      );
    });
  });

  it('shows empty when other account has zero cpu weight for cpu type', async () => {
    renderComponent('cpu', true, [
      { from: 'alice', to: 'bob', cpu_weight: '0.0000 EOS', net_weight: '2.0000 EOS' },
    ]);
    await waitFor(() => {
      expect(screen.getByText('resource.noStakeForOthers')).toBeInTheDocument();
    });
  });
});

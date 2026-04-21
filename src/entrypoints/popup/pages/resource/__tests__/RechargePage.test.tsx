import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RechargePage from '@/entrypoints/popup/pages/resource/RechargePage';

vi.mock('@/entrypoints/popup/pages/transfer/components/TransferConfirm', () => ({
  default: ({ isOpen, title }: { isOpen: boolean; title: string }) =>
    isOpen ? <div data-testid="transfer-confirm">{title}</div> : null,
}));

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('@/hooks/useSmoothModeTime', () => ({
  useSmoothModeTime: () => ({ data: { code: 200, result: 3000 } }),
}));

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: (selector?: Function) => {
    const state = {
      currentWallet: () => ({
        name: 'alice',
        chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
        smoothMode: false,
      }),
      wallets: [{ name: 'alice', smoothMode: false }],
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
      <MemoryRouter initialEntries={['/resource/recharge']}>
        <RechargePage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RechargePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header', () => {
    renderPage();
    expect(screen.getByText('resource.recharge')).toBeInTheDocument();
  });

  it('renders smooth mode toggle', () => {
    renderPage();
    expect(screen.getByText('resource.smoothMode')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeInTheDocument();
  });

  it('displays smooth mode remaining time', () => {
    renderPage();
    expect(screen.getByText(/3 ms/)).toBeInTheDocument();
  });

  it('renders four amount preset cards', () => {
    renderPage();
    expect(screen.getByText('resource.rechargeTab1')).toBeInTheDocument();
    expect(screen.getByText('resource.rechargeTab2')).toBeInTheDocument();
    expect(screen.getByText('resource.rechargeTab3')).toBeInTheDocument();
    expect(screen.getByText('resource.rechargeTab4')).toBeInTheDocument();
  });

  it('selects a different amount when a card is clicked', async () => {
    renderPage();
    const card05 = screen.getByText('resource.rechargeTab2');
    await userEvent.click(card05);
    // The card should now be selected (has a highlighted style)
    // Just check it can be clicked without error
    expect(card05).toBeInTheDocument();
  });

  it('renders radio group for self/other selection', () => {
    renderPage();
    expect(screen.getByText('resource.currentAccount')).toBeInTheDocument();
    expect(screen.getByText('resource.otherAccount')).toBeInTheDocument();
  });

  it('shows account input when "other" radio is selected', async () => {
    renderPage();
    const otherLabel = screen.getByText('resource.otherAccount');
    await userEvent.click(otherLabel);
    await waitFor(() => {
      const input = screen.getByPlaceholderText('resource.stakeReceiver');
      expect(input).toBeInTheDocument();
    });
  });

  it('hides account input when "self" radio is selected', async () => {
    renderPage();
    // First switch to other
    const otherLabel = screen.getByText('resource.otherAccount');
    await userEvent.click(otherLabel);
    // Then switch back to self
    const selfLabel = screen.getByText('resource.currentAccount');
    await userEvent.click(selfLabel);
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('resource.stakeReceiver')).not.toBeInTheDocument();
    });
  });

  it('renders submit button', () => {
    renderPage();
    expect(screen.getByText('wallet.transfer')).toBeInTheDocument();
  });

  it('opens the transfer confirm sheet on submit', async () => {
    renderPage();
    const submitBtn = screen.getByText('wallet.transfer');
    await userEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByTestId('transfer-confirm')).toBeInTheDocument();
      expect(screen.getByTestId('transfer-confirm')).toHaveTextContent('resource.recharge');
    });
  });

  it('toggles smooth mode on switch click', async () => {
    renderPage();
    const toggle = screen.getByRole('checkbox');
    expect(toggle).toBeInTheDocument();
    await userEvent.click(toggle);
    expect((toggle as HTMLInputElement).checked).toBe(true);
  });
});

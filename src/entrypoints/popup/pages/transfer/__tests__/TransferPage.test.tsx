import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TransferPage from '@/entrypoints/popup/pages/transfer/TransferPage';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockGetApi = {
  getAccount: vi.fn().mockResolvedValue({ account_name: 'alice' }),
  getCurrencyBalance: vi.fn().mockResolvedValue('10.0000 EOS'),
  transfer: vi.fn().mockResolvedValue({}),
};

vi.mock('@/hooks/useChainInstance', () => ({
  getChainInstance: () => ({
    getApi: () => mockGetApi,
    getAuth: () => ({ actor: 'alice', permission: 'active' }),
    getErrorMsg: (e: unknown) => String(e),
  }),
  useChainInstance: () => ({
    getApi: () => mockGetApi,
    getAuth: () => ({ actor: 'alice', permission: 'active' }),
  }),
}));

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: (selector?: Function) => {
    const state = {
      currentWallet: () => ({
        name: 'alice',
        chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
      }),
      currentUserTokens: () => [
        { symbol: 'EOS', contract: 'eosio.token', precision: 4, amount: 10, chain: 'eos' },
        { symbol: 'USDT', contract: 'tethertether', precision: 4, amount: 5, chain: 'eos' },
      ],
      getToken: (token: { symbol: string; contract: string; logo?: string }) => ({
        ...token,
        logo: token.logo || '',
      }),
      recentTransfers: [],
      addRecentTransfer: vi.fn().mockResolvedValue(undefined),
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/stores/chainStore', () => ({
  useChainStore: Object.assign(
    (selector?: Function) => {
      const state = {
        currentNetwork: {
          name: 'EOS Mainnet',
          chain: 'eos',
          token: { symbol: 'EOS', contract: 'eosio.token', precision: 4 },
        },
        currentChain: () => 'eos',
        currentChainId: () => 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
        currentSymbol: () => 'EOS',
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({
        currentSymbol: () => 'EOS',
        currentChainId: () => 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
      }),
    },
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderPage = () => {
  const client = createClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/transfer']}>
        <Routes>
          <Route path="/transfer" element={<TransferPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TransferPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page header', () => {
    renderPage();
    // The page header is inside a h1 element
    expect(screen.getByRole('heading', { name: 'wallet.transfer' })).toBeInTheDocument();
  });

  it('renders sender field as readonly with current wallet name', () => {
    renderPage();
    expect(screen.getByText('wallet.paymentAccount')).toBeInTheDocument();
    // Sender is rendered as a span, not an input.
    expect(screen.getAllByText(/alice/i).length).toBeGreaterThan(0);
  });

  it('renders receiver input label', () => {
    renderPage();
    expect(screen.getByText('wallet.receiverAccount')).toBeInTheDocument();
  });

  it('renders amount section label', () => {
    renderPage();
    // The amount label appears in both the main page and the confirm sheet.
    expect(screen.getAllByText('wallet.amount').length).toBeGreaterThan(0);
  });

  it('renders token symbol button', () => {
    renderPage();
    // The token button contains the symbol text
    const symbolBtn = screen.getAllByRole('button').find(
      (btn) => btn.textContent?.includes('EOS') && !btn.closest('form'),
    );
    expect(symbolBtn).toBeTruthy();
  });

  it('renders All button', () => {
    renderPage();
    expect(screen.getByText('wallet.all')).toBeInTheDocument();
  });

  it('renders Memo field label', () => {
    renderPage();
    // Memo label is hardcoded literal "Memo"
    const memoLabels = screen.getAllByText(/Memo/);
    expect(memoLabels.length).toBeGreaterThan(0);
  });

  it('renders submit Transfer button', () => {
    renderPage();
    // There are multiple wallet.transfer buttons (page + confirm sheet always in DOM)
    const buttons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent?.trim() === 'wallet.transfer',
    );
    expect(buttons.length).toBeGreaterThan(0);
  });

  it('shows receiver validation error when submitting without receiver', async () => {
    renderPage();
    // The page-level submit button is the first one with this text
    // (TransferConfirm sheet button is also rendered but with pointer-events-none)
    const buttons = screen.getAllByRole('button').filter(
      (btn) => btn.textContent?.trim() === 'wallet.transfer',
    );
    // Click the first one (main page button, before the confirm sheet button)
    const submitBtn = buttons[0];
    await userEvent.click(submitBtn);
    await waitFor(() => {
      expect(screen.getByText('wallet.emptyReceiver')).toBeInTheDocument();
    });
  });

  it('shows transferSelf error when receiver equals sender', async () => {
    renderPage();
    // Find the receiver input (not disabled)
    const allTextboxes = screen.getAllByRole('textbox');
    const receiverInput = allTextboxes.find((el) => !(el as HTMLInputElement).disabled);
    if (!receiverInput) throw new Error('receiver input not found');

    await userEvent.clear(receiverInput);
    await userEvent.type(receiverInput, 'alice');
    await userEvent.tab();
    await waitFor(() => {
      expect(screen.getByText('wallet.transferSelf')).toBeInTheDocument();
    });
  });

  it('opens RecentTransfer when history icon is clicked', async () => {
    renderPage();
    const historyBtn = screen.getByLabelText('Recent transfers');
    await userEvent.click(historyBtn);
    await waitFor(() => {
      expect(screen.getByText('wallet.recentTransfers')).toBeInTheDocument();
    });
  });

  it('sets amount to max when All button is clicked', async () => {
    renderPage();
    const allBtn = screen.getByText('wallet.all');
    await userEvent.click(allBtn);
    // After clicking "All", the amount input should contain the max amount (10)
    await waitFor(() => {
      const inputs = document.querySelectorAll('input[inputmode="decimal"]');
      const hasMax = Array.from(inputs).some(
        (el) => (el as HTMLInputElement).value === '10',
      );
      expect(hasMax).toBe(true);
    });
  });
});

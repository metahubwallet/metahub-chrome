import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const mockTransactions = [
  {
    trx_id: 'abc123',
    block_num: 12345,
    sender: 'bob',
    receiver: 'alice',
    quantity: '1.0000 EOS',
    memo: 'hello',
    time: '2024-01-15T10:00:00',
    contract: 'eosio.token',
  },
  {
    trx_id: 'def456',
    block_num: 12346,
    sender: 'alice',
    receiver: 'charlie',
    quantity: '2.0000 EOS',
    memo: '',
    time: '2024-01-14T09:00:00',
    contract: 'eosio.token',
  },
];

let transactionListData: typeof mockTransactions | undefined = mockTransactions;
let transactionListLoading = false;

vi.mock('@/hooks/useTransactionList', () => ({
  useTransactionList: () => ({
    data: transactionListData,
    isLoading: transactionListLoading,
  }),
}));

vi.mock('@/hooks/useBalance', () => ({
  useBalance: () => ({ data: '8.5000 EOS' }),
}));

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: (selector?: Function) => {
    const state = {
      currentWallet: () => ({
        name: 'alice',
        chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
      }),
      currentUserTokens: () => [
        {
          symbol: 'EOS',
          contract: 'eosio.token',
          precision: 4,
          amount: 10,
          chain: 'eos',
          logo: '',
        },
      ],
      getToken: (token: { symbol: string; contract: string; logo?: string }) => ({
        ...token,
        logo: token.logo || '',
      }),
    };
    return selector ? selector(state) : state;
  },
}));

import TokenTracesPage from '@/entrypoints/popup/pages/transfer/TokenTracesPage';

// ── Helpers ───────────────────────────────────────────────────────────────────

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderPage = (tokenParam = 'eosio.token-EOS') => {
  const client = createClient();
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/token-traces/${tokenParam}`]}>
        <Routes>
          <Route path="/token-traces/:token" element={<TokenTracesPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TokenTracesPage', () => {
  beforeEach(() => {
    transactionListData = mockTransactions;
    transactionListLoading = false;
  });

  it('renders page header with detail title', () => {
    renderPage();
    expect(screen.getByText('wallet.detail')).toBeInTheDocument();
  });

  it('displays the token symbol', () => {
    renderPage();
    // Symbol appears in header, balance row, and swap dialog — use getAllByText
    expect(screen.getAllByText('EOS').length).toBeGreaterThan(0);
  });

  it('shows live balance from useBalance hook', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByText(/8\.5/).length).toBeGreaterThan(0);
    });
  });

  it('renders transaction list', () => {
    renderPage();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('charlie')).toBeInTheDocument();
  });

  it('shows + prefix for incoming transactions', () => {
    renderPage();
    expect(screen.getByText('+1.0000 EOS')).toBeInTheDocument();
  });

  it('shows - prefix for outgoing transactions', () => {
    renderPage();
    expect(screen.getByText('-2.0000 EOS')).toBeInTheDocument();
  });

  it('renders the Transfer button', () => {
    renderPage();
    expect(screen.getByText('wallet.transfer')).toBeInTheDocument();
  });

  it('renders trade history section title', () => {
    renderPage();
    expect(screen.getByText('wallet.tradeHistory')).toBeInTheDocument();
  });

  it('shows skeleton loading state when isLoading is true', () => {
    transactionListLoading = true;
    transactionListData = undefined;
    renderPage();
    // Skeletons are rendered — the page should not crash and show no transaction data
    expect(screen.queryByText('bob')).not.toBeInTheDocument();
  });

  it('shows noData when transaction list is empty', () => {
    transactionListData = [];
    renderPage();
    expect(screen.getByText('public.noData')).toBeInTheDocument();
  });
});

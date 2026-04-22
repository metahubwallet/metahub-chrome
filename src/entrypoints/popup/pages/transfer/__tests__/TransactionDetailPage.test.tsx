import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import TransactionDetailPage from '@/entrypoints/popup/pages/transfer/TransactionDetailPage';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: (selector?: Function) => {
    const state = {
      currentWallet: () => ({ name: 'alice' }),
    };
    return selector ? selector(state) : state;
  },
}));

// ── Fixture data ──────────────────────────────────────────────────────────────

const trxFixture = {
  trx_id: 'abc123def456abc123def456abc123def456abc123def456abc123def456abc123',
  block_num: 12345,
  sender: 'bob',
  receiver: 'alice',
  quantity: '5.0000 EOS',
  memo: 'test memo',
  time: '2024-01-15T10:00:00Z',
};

const tokenFixture = {
  contract: 'eosio.token',
  symbol: 'EOS',
  precision: 4,
};

const buildSearch = () =>
  `?token=${encodeURIComponent(JSON.stringify(tokenFixture))}&trx=${encodeURIComponent(JSON.stringify(trxFixture))}`;

// ── Helpers ───────────────────────────────────────────────────────────────────

const renderPage = (search = buildSearch()) => {
  return render(
    <MemoryRouter initialEntries={[`/transaction-detail${search}`]}>
      <Routes>
        <Route path="/transaction-detail" element={<TransactionDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TransactionDetailPage', () => {
  it('renders the page header', () => {
    renderPage();
    expect(screen.getByText('wallet.transaction')).toBeInTheDocument();
  });

  it('shows the amount display in the success header', () => {
    renderPage();
    // No transferSuccess label in current design; amount serves as the main header
    expect(screen.getByText('+5.0000 EOS')).toBeInTheDocument();
  });

  it('shows positive amount for incoming transaction (receiver === currentWallet)', () => {
    renderPage();
    expect(screen.getByText('+5.0000 EOS')).toBeInTheDocument();
  });

  it('shows negative amount for outgoing transaction', () => {
    const outTrx = { ...trxFixture, sender: 'alice', receiver: 'charlie' };
    const search = `?token=${encodeURIComponent(JSON.stringify(tokenFixture))}&trx=${encodeURIComponent(JSON.stringify(outTrx))}`;
    renderPage(search);
    expect(screen.getByText('-5.0000 EOS')).toBeInTheDocument();
  });

  it('displays receiver account', () => {
    renderPage();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('displays sender account', () => {
    renderPage();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('displays memo', () => {
    renderPage();
    expect(screen.getByText('test memo')).toBeInTheDocument();
  });

  it('displays transaction hash (truncated)', () => {
    renderPage();
    // Hash is formatted as first-11...last-11
    const hash = 'abc123def456abc123def456abc123def456abc123def456abc123def456abc123';
    const truncated = `${hash.slice(0, 11)}...${hash.slice(-11)}`;
    expect(screen.getByText(truncated)).toBeInTheDocument();
  });

  it('displays block number', () => {
    renderPage();
    expect(screen.getByText('12345')).toBeInTheDocument();
  });

  it('displays contract name', () => {
    renderPage();
    expect(screen.getByText('eosio.token')).toBeInTheDocument();
  });

  it('renders explorer links', () => {
    renderPage();
    expect(screen.getByText('vaultascan')).toBeInTheDocument();
    expect(screen.getByText('eosauthority')).toBeInTheDocument();
    expect(screen.getByText('eosflare')).toBeInTheDocument();
    expect(screen.getByText('eoseyes')).toBeInTheDocument();
  });

  it('vaultascan link points to correct URL', () => {
    renderPage();
    const link = screen.getByText('vaultascan').closest('a');
    expect(link).toHaveAttribute(
      'href',
      `https://vaultascan.io/tx/${trxFixture.trx_id}`,
    );
  });

  it('eosflare link points to correct URL', () => {
    renderPage();
    const eosflareLink = screen.getByText('eosflare').closest('a');
    expect(eosflareLink).toHaveAttribute(
      'href',
      `https://eosflare.io/tx/${trxFixture.trx_id}`,
    );
  });

  it('eosauthority link points to correct URL', () => {
    renderPage();
    const link = screen.getByText('eosauthority').closest('a');
    expect(link).toHaveAttribute(
      'href',
      `https://eosauthority.com/transaction/${trxFixture.trx_id}`,
    );
  });

  it('eoseyes link points to correct URL', () => {
    renderPage();
    const link = screen.getByText('eoseyes').closest('a');
    expect(link).toHaveAttribute(
      'href',
      `https://eoseyes.com/tx/${trxFixture.trx_id}`,
    );
  });

  it('renders without crashing when given empty search params', () => {
    renderPage('');
    expect(screen.getByText('wallet.transaction')).toBeInTheDocument();
  });
});

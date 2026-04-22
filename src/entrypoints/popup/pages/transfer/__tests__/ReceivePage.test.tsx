import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ReceivePage from '@/entrypoints/popup/pages/transfer/ReceivePage';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

// Mock QRCode so we don't need a real canvas in jsdom
vi.mock('qrcode', () => ({
  default: {
    toCanvas: vi.fn((_canvas: unknown, _data: unknown, _opts: unknown, cb: (err: null) => void) =>
      cb(null),
    ),
  },
}));

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: (selector?: Function) => {
    const state = {
      currentWallet: () => ({
        name: 'alice',
        chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
      }),
    };
    return selector ? selector(state) : state;
  },
}));

vi.mock('@/stores/chainStore', () => ({
  useChainStore: Object.assign(
    (selector?: Function) => {
      const state = {
        currentNetwork: { name: 'EOS Mainnet', chain: 'eos' },
        currentSymbol: () => 'EOS',
      };
      return selector ? selector(state) : state;
    },
    {
      getState: () => ({ currentSymbol: () => 'EOS' }),
    },
  ),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const renderPage = (search = '') => {
  return render(
    <MemoryRouter initialEntries={[`/receive${search}`]}>
      <Routes>
        <Route path="/receive" element={<ReceivePage />} />
      </Routes>
    </MemoryRouter>,
  );
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ReceivePage', () => {
  it('renders the page header with receive title', () => {
    renderPage();
    expect(screen.getByText('wallet.receive')).toBeInTheDocument();
  });

  it('displays the current wallet name', () => {
    renderPage();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('displays network name', () => {
    renderPage();
    expect(screen.getByText(/EOS Mainnet/i)).toBeInTheDocument();
  });

  it('renders the QR code canvas element', () => {
    renderPage();
    const canvas = document.getElementById('qrccode-canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('renders a copy button for the wallet address', () => {
    renderPage();
    const copyBtn = screen.getByRole('button', { name: /copy address/i });
    expect(copyBtn).toBeInTheDocument();
  });

  it('shows accountAddress i18n label', () => {
    renderPage();
    expect(screen.getByText(/wallet.accountAddress/i)).toBeInTheDocument();
  });
});

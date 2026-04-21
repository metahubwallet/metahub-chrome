import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const mockTokens = [
  { symbol: 'EOS', contract: 'eosio.token', precision: 4, amount: 10, chain: 'eos', logo: '' },
  { symbol: 'USDT', contract: 'tethertether', precision: 4, amount: 5, chain: 'eos', logo: '' },
];

// The selector-based hook — we expose a setter so individual tests can override
let currentTokensFn = () => mockTokens;

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: (selector?: Function) => {
    const state = {
      currentUserTokens: currentTokensFn,
    };
    return selector ? selector(state) : state;
  },
}));

// Mock Sheet components used by PopupBottom
vi.mock('@/components/ui/sheet', () => ({
  Sheet: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
    open ? <div data-testid="sheet">{children}</div> : null,
  SheetContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="sheet-content">{children}</div>
  ),
  SheetHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  SheetTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
  SheetClose: ({ onClose }: { onClose: () => void }) => (
    <button onClick={onClose} aria-label="Close">
      ×
    </button>
  ),
}));

// ── Lazy import ───────────────────────────────────────────────────────────────

// Import after mocks are set up
import SelectCoin from '@/entrypoints/popup/pages/transfer/components/SelectCoin';

// ── Helpers ───────────────────────────────────────────────────────────────────

const setup = (props?: Partial<Parameters<typeof SelectCoin>[0]>) => {
  const onClose = vi.fn();
  const onChangeToken = vi.fn();
  const user = userEvent.setup();

  const result = render(
    <SelectCoin
      isOpen={true}
      onClose={onClose}
      onChangeToken={onChangeToken}
      {...props}
    />,
  );

  return { ...result, onClose, onChangeToken, user };
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('SelectCoin', () => {
  beforeEach(() => {
    currentTokensFn = () => mockTokens;
  });

  it('renders token list when open', () => {
    setup();
    expect(screen.getByText('EOS')).toBeInTheDocument();
    expect(screen.getByText('USDT')).toBeInTheDocument();
  });

  it('shows contract address for each token', () => {
    setup();
    expect(screen.getByText('eosio.token')).toBeInTheDocument();
    expect(screen.getByText('tethertether')).toBeInTheDocument();
  });

  it('shows balance for each token', () => {
    setup();
    expect(screen.getByText('10')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('calls onChangeToken with correct coin when a token is clicked', async () => {
    const { onChangeToken, user } = setup();
    const eosBtn = screen.getByText('EOS').closest('button')!;
    await user.click(eosBtn);
    await waitFor(() => {
      expect(onChangeToken).toHaveBeenCalledWith(mockTokens[0]);
    });
  });

  it('calls onChangeToken with USDT when USDT row is clicked', async () => {
    const { onChangeToken, user } = setup();
    const usdtBtn = screen.getByText('USDT').closest('button')!;
    await user.click(usdtBtn);
    await waitFor(() => {
      expect(onChangeToken).toHaveBeenCalledWith(mockTokens[1]);
    });
  });

  it('does not render when isOpen is false', () => {
    setup({ isOpen: false });
    expect(screen.queryByText('EOS')).not.toBeInTheDocument();
  });

  it('renders header labels', () => {
    setup();
    expect(screen.getByText('wallet.symbol')).toBeInTheDocument();
    expect(screen.getByText('wallet.balance')).toBeInTheDocument();
  });

  it('shows noData when token list is empty', () => {
    currentTokensFn = () => [];
    render(<SelectCoin isOpen={true} onClose={vi.fn()} onChangeToken={vi.fn()} />);
    expect(screen.getByText('public.noData')).toBeInTheDocument();
  });
});

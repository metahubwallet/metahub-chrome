import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

const mockTransfers = [
  {
    account: 'bob',
    memo: 'payment',
    time: new Date('2024-01-15T10:30:00').getTime(),
    token: { symbol: 'EOS', contract: 'eosio.token', precision: 4 },
  },
  {
    account: 'charlie',
    memo: '',
    time: new Date('2024-01-14T09:00:00').getTime(),
    token: { symbol: 'EOS', contract: 'eosio.token', precision: 4 },
  },
];

// Allow individual tests to override
let currentTransfers = mockTransfers;

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: (selector?: Function) => {
    const state = {
      recentTransfers: currentTransfers,
    };
    return selector ? selector(state) : state;
  },
}));

// Mock Dialog components
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({
    open,
    onOpenChange,
    children,
  }: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    children: React.ReactNode;
  }) =>
    open ? (
      <div data-testid="dialog" onClick={() => onOpenChange(false)}>
        {children}
      </div>
    ) : null,
  DialogContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="dialog-content" onClick={(e) => e.stopPropagation()}>
      {children}
    </div>
  ),
  DialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  DialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
}));

import RecentTransfer from '@/entrypoints/popup/pages/transfer/components/RecentTransfer';

// ── Helpers ───────────────────────────────────────────────────────────────────

const setup = (props?: Partial<Parameters<typeof RecentTransfer>[0]>) => {
  const onClose = vi.fn();
  const onSelect = vi.fn();
  const user = userEvent.setup();

  const result = render(
    <RecentTransfer
      isOpen={true}
      onClose={onClose}
      onSelect={onSelect}
      {...props}
    />,
  );

  return { ...result, onClose, onSelect, user };
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('RecentTransfer', () => {
  beforeEach(() => {
    currentTransfers = mockTransfers;
  });

  it('renders dialog title', () => {
    setup();
    expect(screen.getByText('wallet.recentTransfers')).toBeInTheDocument();
  });

  it('renders all recent transfer accounts', () => {
    setup();
    expect(screen.getByText('bob')).toBeInTheDocument();
    expect(screen.getByText('charlie')).toBeInTheDocument();
  });

  it('renders formatted time for each entry', () => {
    setup();
    // dayjs MM-DD HH:mm format
    expect(screen.getByText('01-15 10:30')).toBeInTheDocument();
    expect(screen.getByText('01-14 09:00')).toBeInTheDocument();
  });

  it('calls onSelect with the correct record when clicking a row', async () => {
    const { onSelect, user } = setup();
    await user.click(screen.getByText('bob'));
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(mockTransfers[0]);
    });
  });

  it('calls onSelect with second record when clicking charlie', async () => {
    const { onSelect, user } = setup();
    await user.click(screen.getByText('charlie'));
    await waitFor(() => {
      expect(onSelect).toHaveBeenCalledWith(mockTransfers[1]);
    });
  });

  it('does not render when isOpen is false', () => {
    setup({ isOpen: false });
    expect(screen.queryByText('wallet.recentTransfers')).not.toBeInTheDocument();
  });

  it('shows noData when list is empty', () => {
    currentTransfers = [];
    render(<RecentTransfer isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />);
    expect(screen.getByText('public.noData')).toBeInTheDocument();
  });

  it('renders column headers', () => {
    setup();
    expect(screen.getByText('wallet.receiverAccount')).toBeInTheDocument();
    expect(screen.getByText('wallet.transactionTime')).toBeInTheDocument();
  });

  it('truncates ETH-style addresses (42 chars)', () => {
    const ethAddress = '0x' + 'a'.repeat(40); // 42 chars
    currentTransfers = [
      {
        account: ethAddress,
        memo: '',
        time: Date.now(),
        token: { symbol: 'EOS', contract: 'eosio.token', precision: 4 },
      },
    ];
    render(<RecentTransfer isOpen={true} onClose={vi.fn()} onSelect={vi.fn()} />);
    // Component renders: account.substring(0, 10) + "..." + account.substring(36)
    // ethAddress[0..9] = "0xaaaaaaaa" (2 prefix + 8 a's), ethAddress[36..41] = "aaaaaa"
    expect(screen.getByText(/0xaaaaaaaa\.\.\.aaaaaa/)).toBeInTheDocument();
  });
});

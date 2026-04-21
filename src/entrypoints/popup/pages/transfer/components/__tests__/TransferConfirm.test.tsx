import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import TransferConfirm from '@/entrypoints/popup/pages/transfer/components/TransferConfirm';
import { Transfer } from '@/types/transaction';

// ── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const mockTransfer = vi.fn().mockResolvedValue({});
const mockGetApi = {
  transfer: mockTransfer,
};

vi.mock('@/hooks/useChainInstance', () => ({
  getChainInstance: () => ({
    getApi: () => mockGetApi,
    getAuth: () => ({ actor: 'alice', permission: 'active' }),
    getErrorMsg: (e: unknown) => String(e),
  }),
}));

const mockAddRecentTransfer = vi.fn().mockResolvedValue(undefined);

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: (selector?: Function) => {
    const state = {
      currentWallet: () => ({
        name: 'alice',
        chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
      }),
      addRecentTransfer: mockAddRecentTransfer,
    };
    return selector ? selector(state) : state;
  },
}));

// Mock Sheet used by PopupBottom
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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const defaultTransfer: Transfer = {
  sender: 'alice',
  receiver: 'bob',
  amount: 5,
  memo: 'test memo',
  token: { symbol: 'EOS', contract: 'eosio.token', precision: 4 },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const createClient = () =>
  new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

const setup = (transfer: Transfer = defaultTransfer) => {
  const onClose = vi.fn();
  const client = createClient();
  const user = userEvent.setup();

  const result = render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <TransferConfirm
          isOpen={true}
          title="wallet.transferConfirm"
          transfer={transfer}
          onClose={onClose}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  );

  return { ...result, onClose, user };
};

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('TransferConfirm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the title', () => {
    setup();
    expect(screen.getByText('wallet.transferConfirm')).toBeInTheDocument();
  });

  it('displays sender', () => {
    setup();
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('displays receiver', () => {
    setup();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });

  it('displays formatted amount with symbol', () => {
    setup();
    expect(screen.getByText('5.0000 EOS')).toBeInTheDocument();
  });

  it('displays memo', () => {
    setup();
    expect(screen.getByText('test memo')).toBeInTheDocument();
  });

  it('hides memo for ETH address (42-char receiver)', () => {
    const ethTransfer: Transfer = {
      ...defaultTransfer,
      receiver: '0x' + 'a'.repeat(40),
    };
    setup(ethTransfer);
    expect(screen.queryByText('wallet.remark：')).not.toBeInTheDocument();
  });

  it('truncates ETH address in display', () => {
    const ethAddress = '0x' + 'a'.repeat(40); // 42 chars
    const ethTransfer: Transfer = {
      ...defaultTransfer,
      receiver: ethAddress,
    };
    setup(ethTransfer);
    // Should show truncated form: first 14 chars + '...' + last 8 chars
    const expectedDisplay = `${ethAddress.substring(0, 14)}...${ethAddress.substring(34)}`.toLowerCase();
    expect(screen.getByText(expectedDisplay)).toBeInTheDocument();
  });

  it('renders the submit Transfer button', () => {
    setup();
    expect(screen.getByText('wallet.transfer')).toBeInTheDocument();
  });

  it('calls api.transfer on submit', async () => {
    const { user } = setup();
    const submitBtn = screen.getByText('wallet.transfer');
    await user.click(submitBtn);
    await waitFor(() => {
      expect(mockTransfer).toHaveBeenCalled();
    });
  });

  it('calls addRecentTransfer on successful submit', async () => {
    const { user } = setup();
    await user.click(screen.getByText('wallet.transfer'));
    await waitFor(() => {
      expect(mockAddRecentTransfer).toHaveBeenCalledWith(
        expect.objectContaining({ account: 'bob', memo: 'test memo' }),
      );
    });
  });

  it('routes ETH address transfer through etheraccount', async () => {
    const ethAddress = '0x' + 'b'.repeat(40);
    const ethTransfer: Transfer = {
      ...defaultTransfer,
      receiver: ethAddress,
      memo: '',
    };
    const { user } = setup(ethTransfer);
    await user.click(screen.getByText('wallet.transfer'));
    await waitFor(() => {
      expect(mockTransfer).toHaveBeenCalledWith(
        'eosio.token',
        'alice',
        'etheraccount',
        '5.0000 EOS',
        ethAddress, // memo becomes the eth address
        expect.anything(),
      );
    });
  });

  it('shows loading spinner while submitting', async () => {
    // Make transfer hang to capture loading state
    mockTransfer.mockImplementationOnce(
      () => new Promise<void>((resolve) => setTimeout(resolve, 2000)),
    );
    const { user } = setup();
    await user.click(screen.getByText('wallet.transfer'));
    // The button should be disabled while loading
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /wallet.transfer/ });
      expect(btn).toBeDisabled();
    });
  });
});

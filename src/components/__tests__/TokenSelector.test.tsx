import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockTokens = [
  { contract: 'dapp.token', symbol: 'DAPP', chain: 'eos', logo: '', precision: 4 },
  { contract: 'pizza.token', symbol: 'PIZZA', chain: 'eos', logo: '', precision: 4 },
];

const mockChainTokens = vi.fn(() => mockTokens);
const mockCurrentUserTokens = vi.fn(() => []);
const mockSetCurrentUserTokens = vi.fn().mockResolvedValue(undefined);
const mockSetUserTokens = vi.fn().mockResolvedValue(undefined);

// Stable object reference — if the mock returned a new object every call the
// component's `const walletStore = useWalletStore()` would be a new reference
// each render, invalidating its useCallback/useEffect deps and triggering an
// infinite re-render loop (which causes an OOM under vitest).
const mockWalletState = {
  chainTokens: mockChainTokens,
  currentUserTokens: mockCurrentUserTokens,
  setCurrentUserTokens: mockSetCurrentUserTokens,
  setUserTokens: mockSetUserTokens,
  userTokens: {},
};
vi.mock('@/stores/walletStore', () => ({
  useWalletStore: vi.fn((selector?: any) =>
    selector ? selector(mockWalletState) : mockWalletState
  ),
}));

import TokenSelector from '@/components/TokenSelector';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('TokenSelector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockChainTokens.mockReturnValue(mockTokens);
    mockCurrentUserTokens.mockReturnValue([]);
  });

  it('renders hidden (translated off-screen) when closed', () => {
    const { container } = renderWithRouter(<TokenSelector isOpen={false} onClose={vi.fn()} />);
    expect(container.querySelector('.translate-y-full')).toBeInTheDocument();
  });

  it('renders visible when open', () => {
    const { container } = renderWithRouter(<TokenSelector isOpen={true} onClose={vi.fn()} />);
    expect(container.querySelector('.translate-y-0')).toBeInTheDocument();
    expect(screen.getByText('wallet.addNewTokens')).toBeInTheDocument();
  });

  it('shows all tokens when open', () => {
    renderWithRouter(<TokenSelector isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('DAPP')).toBeInTheDocument();
    expect(screen.getByText('PIZZA')).toBeInTheDocument();
  });

  it('filters tokens by search keyword', async () => {
    renderWithRouter(<TokenSelector isOpen={true} onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText('wallet.searchKeyWord');
    fireEvent.change(input, { target: { value: 'dapp' } });
    await waitFor(() => {
      expect(screen.getByText('DAPP')).toBeInTheDocument();
      expect(screen.queryByText('PIZZA')).not.toBeInTheDocument();
    });
  });

  it('navigates to add-token page when clicking the + button', () => {
    const onClose = vi.fn();
    const { container } = renderWithRouter(<TokenSelector isOpen={true} onClose={onClose} />);
    // The "+" button is the second header-level button (after the X close button).
    const buttons = container.querySelectorAll('.h-14 button, .h-\\[50px\\] button');
    // Second button in the header area (Plus icon navigates to /add-token).
    const plusBtn = Array.from(buttons).find((b) =>
      b.querySelector('.lucide-plus')
    ) as HTMLElement;
    fireEvent.click(plusBtn);
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/add-token');
  });

  it('toggles token on click', async () => {
    renderWithRouter(<TokenSelector isOpen={true} onClose={vi.fn()} />);
    const toggleButtons = screen.getAllByLabelText(/add token/i);
    fireEvent.click(toggleButtons[0]);
    await waitFor(() => {
      expect(mockSetCurrentUserTokens).toHaveBeenCalled();
    });
  });
});

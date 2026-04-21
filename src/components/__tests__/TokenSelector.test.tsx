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

vi.mock('@/stores/walletStore', () => ({
  useWalletStore: vi.fn((selector?: any) => {
    if (selector) {
      return selector({
        chainTokens: mockChainTokens,
        currentUserTokens: mockCurrentUserTokens,
        setCurrentUserTokens: mockSetCurrentUserTokens,
        setUserTokens: mockSetUserTokens,
        userTokens: {},
      });
    }
    return {
      chainTokens: mockChainTokens,
      currentUserTokens: mockCurrentUserTokens,
      setCurrentUserTokens: mockSetCurrentUserTokens,
      setUserTokens: mockSetUserTokens,
      userTokens: {},
    };
  }),
}));

vi.mock('@/components/PopupBottom', () => ({
  default: ({ isOpen, children, title }: any) =>
    isOpen ? (
      <div data-testid="popup-bottom">
        <div data-testid="popup-title">{title}</div>
        {children}
      </div>
    ) : null,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, placeholder }: any) => (
    <input
      data-testid="search-input"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
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

  it('renders nothing when closed', () => {
    renderWithRouter(<TokenSelector isOpen={false} onClose={vi.fn()} />);
    expect(screen.queryByTestId('popup-bottom')).not.toBeInTheDocument();
  });

  it('renders popup when open', () => {
    renderWithRouter(<TokenSelector isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByTestId('popup-bottom')).toBeInTheDocument();
  });

  it('shows all tokens when open', () => {
    renderWithRouter(<TokenSelector isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('DAPP')).toBeInTheDocument();
    expect(screen.getByText('PIZZA')).toBeInTheDocument();
  });

  it('filters tokens by search keyword', async () => {
    renderWithRouter(<TokenSelector isOpen={true} onClose={vi.fn()} />);
    const input = screen.getByTestId('search-input');
    fireEvent.change(input, { target: { value: 'dapp' } });
    await waitFor(() => {
      expect(screen.getByText('DAPP')).toBeInTheDocument();
      expect(screen.queryByText('PIZZA')).not.toBeInTheDocument();
    });
  });

  it('shows add-more-tokens link', () => {
    renderWithRouter(<TokenSelector isOpen={true} onClose={vi.fn()} />);
    expect(screen.getByText('wallet.addMoreTokens')).toBeInTheDocument();
  });

  it('navigates to add-token page when clicking the link', () => {
    const onClose = vi.fn();
    renderWithRouter(<TokenSelector isOpen={true} onClose={onClose} />);
    fireEvent.click(screen.getByText('wallet.addMoreTokens'));
    expect(onClose).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/add-token');
  });

  it('toggles token on click', async () => {
    renderWithRouter(<TokenSelector isOpen={true} onClose={vi.fn()} />);
    const toggleButtons = screen.getAllByRole('button');
    fireEvent.click(toggleButtons[0]);
    await waitFor(() => {
      expect(mockSetCurrentUserTokens).toHaveBeenCalled();
    });
  });
});

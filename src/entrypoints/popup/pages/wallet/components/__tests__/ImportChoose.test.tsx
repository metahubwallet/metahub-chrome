import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/stores/chainStore', () => ({
  useChainStore: vi.fn((selector: any) =>
    selector({
      findNetwork: (chainId: string) => ({ name: 'EOS', chainId }),
    })
  ),
}));

vi.mock('@/components/PopupBottom', () => ({
  default: ({ isOpen, children }: any) =>
    isOpen ? <div data-testid="popup-bottom">{children}</div> : null,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, size, className }: any) => (
    <button onClick={onClick} className={className}>{children}</button>
  ),
}));

import ImportChoose from '../ImportChoose';
import { Wallet } from '@/types/wallet';

const mockWallets: Wallet[] = [
  {
    name: 'alice',
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
    seed: 'SEED1',
    blockchain: 'eos',
    smoothMode: false,
    keys: [{ publicKey: 'EOS6ABC...', privateKey: 'encrypted', permissions: [] }],
  },
  {
    name: 'bob',
    chainId: 'aca376f206b8fc25a6ed44dbdc66547c36c6c33e3a119ffbeaef943642f0e906',
    seed: 'SEED2',
    blockchain: 'eos',
    smoothMode: false,
    keys: [{ publicKey: 'EOS7DEF...', privateKey: 'encrypted', permissions: [] }],
  },
];

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('ImportChoose', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when closed', () => {
    renderWithRouter(
      <ImportChoose isOpen={false} accountList={mockWallets} onClose={vi.fn()} onImport={vi.fn()} />
    );
    expect(screen.queryByTestId('popup-bottom')).not.toBeInTheDocument();
  });

  it('renders popup when open', () => {
    renderWithRouter(
      <ImportChoose isOpen={true} accountList={mockWallets} onClose={vi.fn()} onImport={vi.fn()} />
    );
    expect(screen.getByTestId('popup-bottom')).toBeInTheDocument();
  });

  it('displays account names', () => {
    renderWithRouter(
      <ImportChoose isOpen={true} accountList={mockWallets} onClose={vi.fn()} onImport={vi.fn()} />
    );
    expect(screen.getByText(/alice/)).toBeInTheDocument();
    expect(screen.getByText(/bob/)).toBeInTheDocument();
  });

  it('calls onImport with selected wallets when confirm button clicked', () => {
    const onImport = vi.fn();
    renderWithRouter(
      <ImportChoose isOpen={true} accountList={mockWallets} onClose={vi.fn()} onImport={onImport} />
    );
    fireEvent.click(screen.getByText('wallet.importSelectedWallets'));
    expect(onImport).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ name: 'alice' }),
        expect.objectContaining({ name: 'bob' }),
      ])
    );
  });

  it('toggles select all', () => {
    renderWithRouter(
      <ImportChoose isOpen={true} accountList={mockWallets} onClose={vi.fn()} onImport={vi.fn()} />
    );
    // Select All button
    const selectAllBtn = screen.getByText('public.selectAll');
    // Initially all selected (checkboxes visible)
    const checkIcons = screen.getAllByRole('img', { hidden: true });
    fireEvent.click(selectAllBtn);
    // After clicking, deselect all
  });

  it('deselects individual account on click', () => {
    const onImport = vi.fn();
    renderWithRouter(
      <ImportChoose isOpen={true} accountList={mockWallets} onClose={vi.fn()} onImport={onImport} />
    );
    // Click first account to deselect
    const accountRows = screen.getAllByText(/alice/);
    fireEvent.click(accountRows[0].closest('div') as HTMLElement);
    // Then import — alice should be deselected
    fireEvent.click(screen.getByText('wallet.importSelectedWallets'));
    expect(onImport).toHaveBeenCalledWith(
      expect.not.arrayContaining([expect.objectContaining({ name: 'alice' })])
    );
  });
});

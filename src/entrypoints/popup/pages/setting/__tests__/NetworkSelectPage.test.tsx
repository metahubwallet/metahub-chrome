import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [new URLSearchParams({ type: 'node' })],
  };
});

vi.mock('@/stores/chainStore', () => ({
  useChainStore: vi.fn((selector: any) =>
    selector({
      networks: [
        { chainId: 'eos-chain-id', name: 'EOS', chain: 'eos', endpoint: 'https://eos.greymass.com' },
        { chainId: 'wax-chain-id', name: 'WAX', chain: 'wax', endpoint: 'https://wax.api.com' },
      ],
      selectedRpc: (chainId: string) => `https://rpc.${chainId}.com`,
    })
  ),
}));

vi.mock('@/components/PageHeader', () => ({
  default: ({ title }: any) => <div data-testid="page-header">{title}</div>,
}));

import NetworkSelectPage from '../NetworkSelectPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <NetworkSelectPage />
    </MemoryRouter>
  );

describe('NetworkSelectPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header', () => {
    renderPage();
    expect(screen.getByTestId('page-header')).toHaveTextContent('setting.blockchainFoundation');
  });

  it('renders network list', () => {
    renderPage();
    expect(screen.getByText('EOS')).toBeInTheDocument();
    expect(screen.getByText('WAX')).toBeInTheDocument();
  });

  it('navigates to setting/node when type=node', () => {
    renderPage();
    fireEvent.click(screen.getByText('EOS'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('/setting/node'));
    expect(mockNavigate).toHaveBeenCalledWith(expect.stringContaining('eos-chain-id'));
  });
});

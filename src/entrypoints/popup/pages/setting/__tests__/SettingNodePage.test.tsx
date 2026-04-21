import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useSearchParams: () => [new URLSearchParams({ chainId: 'test-chain-id' })],
  };
});

vi.mock('@/stores/chainStore', () => ({
  useChainStore: vi.fn((selector: any) =>
    selector({
      findNetwork: () => ({ name: 'EOS Mainnet', chain: 'eos', chainId: 'test-chain-id', endpoint: 'https://eos.greymass.com' }),
      selectedRpc: () => 'https://eos.greymass.com',
      setSelectedRpc: vi.fn(),
      customRpcs: {},
      setCustomRpcs: vi.fn(),
    })
  ),
}));

vi.mock('@/hooks/useEndpoints', () => ({
  useEndpoints: () => ({
    data: [{ name: 'Greymass', endpoint: 'https://eos.greymass.com' }],
    isLoading: false,
  }),
}));

const mockTestHttpEndpoint = vi.fn().mockResolvedValue(undefined);
const mockUpdateHttpEndpoint = vi.fn();
vi.mock('@/hooks/useChainInstance', () => ({
  getChainInstance: () => ({
    getApi: () => ({
      testHttpEndpoint: mockTestHttpEndpoint,
      updateHttpEndpoint: mockUpdateHttpEndpoint,
    }),
  }),
}));

vi.mock('@/components/PageHeader', () => ({
  default: ({ title }: any) => <div data-testid="page-header">{title}</div>,
}));

vi.mock('@/components/ConfirmDialog', () => ({
  default: ({ isOpen, title, children, onConfirm, onClose }: any) =>
    isOpen ? (
      <div data-testid="confirm-dialog">
        <span>{title}</span>
        {children}
        <button onClick={onConfirm}>confirm</button>
        <button onClick={onClose}>cancel</button>
      </div>
    ) : null,
}));

import SettingNodePage from '../SettingNodePage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <SettingNodePage />
    </MemoryRouter>
  );

describe('SettingNodePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page with network name', async () => {
    renderPage();
    expect(screen.getByTestId('page-header')).toHaveTextContent('EOS Mainnet');
  });

  it('renders default nodes section', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('setting.defaultNodes')).toBeInTheDocument();
    });
  });

  it('renders recommend endpoints', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText('https://eos.greymass.com')).toBeInTheDocument();
    });
  });

  it('renders add node button', () => {
    renderPage();
    expect(screen.getByText('setting.addNode')).toBeInTheDocument();
  });

  it('shows add node dialog on button click', () => {
    renderPage();
    fireEvent.click(screen.getByText('setting.addNode'));
    expect(screen.getByTestId('confirm-dialog')).toBeInTheDocument();
  });
});

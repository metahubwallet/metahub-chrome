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

const mockSetNetworks = vi.fn().mockResolvedValue(undefined);
const mockSetSelectedRpc = vi.fn().mockResolvedValue(undefined);
const mockSetCustomRpcs = vi.fn().mockResolvedValue(undefined);

vi.mock('@/stores/chainStore', () => ({
  useChainStore: vi.fn((selector: any) =>
    selector({
      networks: [],
      customRpcs: {},
      setNetworks: mockSetNetworks,
      setSelectedRpc: mockSetSelectedRpc,
      setCustomRpcs: mockSetCustomRpcs,
    })
  ),
}));

vi.mock('@/utils/network', () => ({
  supportNetworks: [],
}));

vi.mock('@/components/PageHeader', () => ({
  default: ({ title }: any) => <div data-testid="page-header">{title}</div>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type }: any) => (
    <button type={type || 'button'} onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ placeholder, ...props }: any) => (
    <input placeholder={placeholder} {...props} />
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label>{children}</label>,
}));

import NetworkAddCustomPage from '../NetworkAddCustomPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <NetworkAddCustomPage />
    </MemoryRouter>
  );

describe('NetworkAddCustomPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header', () => {
    renderPage();
    expect(screen.getByTestId('page-header')).toHaveTextContent('setting.addCustomNetwork');
  });

  it('renders all form fields', () => {
    renderPage();
    expect(screen.getByPlaceholderText('setting.nodeName')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('ChainId')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('https://')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('setting.symbol')).toBeInTheDocument();
  });

  it('renders submit button', () => {
    renderPage();
    expect(screen.getByText('password.submit')).toBeInTheDocument();
  });

  it('shows token diy fields when checkbox is checked', () => {
    renderPage();
    const checkbox = screen.getByLabelText('setting.defineContractNameAndPrecision') as HTMLInputElement;
    expect(screen.queryByPlaceholderText('setting.contractName')).not.toBeInTheDocument();
    fireEvent.click(checkbox);
    expect(screen.getByPlaceholderText('setting.contractName')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('setting.precision')).toBeInTheDocument();
  });

  it('shows validation error for empty name on submit', async () => {
    renderPage();
    fireEvent.click(screen.getByText('password.submit'));
    await waitFor(() => {
      expect(mockNavigate).not.toHaveBeenCalled();
    });
  });

  it('successfully adds network with valid data', async () => {
    renderPage();

    const chainIdValue = 'a'.repeat(64);
    fireEvent.change(screen.getByPlaceholderText('setting.nodeName'), { target: { value: 'TestNet' } });
    fireEvent.change(screen.getByPlaceholderText('ChainId'), { target: { value: chainIdValue } });
    fireEvent.change(screen.getByPlaceholderText('https://'), { target: { value: 'https://testnet.example.com' } });
    fireEvent.change(screen.getByPlaceholderText('setting.symbol'), { target: { value: 'TEST' } });

    fireEvent.click(screen.getByText('password.submit'));

    await waitFor(() => {
      expect(mockSetNetworks).toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });
});

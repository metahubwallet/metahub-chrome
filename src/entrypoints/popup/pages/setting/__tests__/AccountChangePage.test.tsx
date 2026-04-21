import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockNavigate = vi.fn();

const mockParams = JSON.stringify({
  account: 'alice',
  perms: [],
  operatePerm: 'active',
  operateType: 'modify',
  oldOperateKey: 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV',
});

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
    useSearchParams: () => [
      new URLSearchParams({ params: mockParams, chainId: 'eos-chain-id' }),
    ],
  };
});

const mockUpdatePerms = vi.fn().mockResolvedValue(undefined);
const mockMakeNewPermissions = vi.fn().mockReturnValue([{ perm_name: 'active' }]);

vi.mock('@/hooks/useChainInstance', () => ({
  getChainInstance: () => ({
    getApi: () => ({
      makeNewPermissions: mockMakeNewPermissions,
      updatePerms: mockUpdatePerms,
    }),
  }),
}));

vi.mock('@/lib/keyring', () => ({
  isValidPublic: (key: string) => key.startsWith('EOS'),
}));

vi.mock('@tanstack/react-query', () => ({
  useMutation: ({ onSuccess, onError, mutationFn }: any) => ({
    mutate: async () => {
      try {
        const result = await mutationFn();
        onSuccess?.(result);
      } catch (e) {
        onError?.(e);
      }
    },
    isPending: false,
  }),
}));

vi.mock('@/components/PageHeader', () => ({
  default: ({ title }: any) => <div data-testid="page-header">{title}</div>,
}));

vi.mock('@/components/PasswordConfirm', () => ({
  default: ({ isOpen, title, onClose, onConfirm }: any) =>
    isOpen ? (
      <div data-testid="password-confirm">
        <span>{title}</span>
        <button onClick={() => onConfirm('test-password')}>confirm</button>
        <button onClick={onClose}>close</button>
      </div>
    ) : null,
}));

vi.mock('../components/GeneratePublicKey', () => ({
  default: ({ isOpen, onClose, onUseKey }: any) =>
    isOpen ? (
      <div data-testid="generate-key">
        <button onClick={() => onUseKey('EOS_GENERATED_KEY')}>use</button>
        <button onClick={onClose}>close</button>
      </div>
    ) : null,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button disabled={disabled} onClick={onClick}>{children}</button>
  ),
}));

vi.mock('@/components/ui/textarea', () => ({
  Textarea: ({ placeholder, value, onChange, rows }: any) => (
    <textarea placeholder={placeholder} value={value} onChange={onChange} rows={rows} />
  ),
}));

import AccountChangePage from '../AccountChangePage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <AccountChangePage />
    </MemoryRouter>
  );

describe('AccountChangePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header', () => {
    renderPage();
    expect(screen.getByTestId('page-header')).toHaveTextContent('setting.changeAuthority');
  });

  it('shows current public key when oldOperateKey exists', () => {
    renderPage();
    expect(screen.getByText('setting.currentPublicKey')).toBeInTheDocument();
    expect(screen.getByText('EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV')).toBeInTheDocument();
  });

  it('shows new public key input', () => {
    renderPage();
    expect(screen.getByText('setting.newPublicKey')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('setting.enterPublicKeyTip')).toBeInTheDocument();
  });

  it('shows generate public key button', () => {
    renderPage();
    expect(screen.getByText('setting.generatePublicKey')).toBeInTheDocument();
  });

  it('shows submit button', () => {
    renderPage();
    expect(screen.getByText('setting.submit')).toBeInTheDocument();
  });

  it('opens generate key dialog', () => {
    renderPage();
    fireEvent.click(screen.getByText('setting.generatePublicKey'));
    expect(screen.getByTestId('generate-key')).toBeInTheDocument();
  });

  it('sets key from generate dialog', () => {
    renderPage();
    fireEvent.click(screen.getByText('setting.generatePublicKey'));
    fireEvent.click(screen.getByText('use'));
    const textarea = screen.getByPlaceholderText('setting.enterPublicKeyTip') as HTMLTextAreaElement;
    expect(textarea.value).toBe('EOS_GENERATED_KEY');
  });

  it('shows password confirm when submitting valid key', () => {
    renderPage();
    const textarea = screen.getByPlaceholderText('setting.enterPublicKeyTip');
    fireEvent.change(textarea, { target: { value: 'EOS_VALID_PUBLIC_KEY' } });
    fireEvent.click(screen.getByText('setting.submit'));
    expect(screen.getByTestId('password-confirm')).toBeInTheDocument();
  });

  it('does not show password confirm for invalid key', async () => {
    renderPage();
    const textarea = screen.getByPlaceholderText('setting.enterPublicKeyTip');
    fireEvent.change(textarea, { target: { value: 'invalid-key' } });
    fireEvent.click(screen.getByText('setting.submit'));
    await waitFor(() => {
      expect(screen.queryByTestId('password-confirm')).not.toBeInTheDocument();
    });
  });

  it('calls updatePerms and navigates on confirm', async () => {
    renderPage();
    const textarea = screen.getByPlaceholderText('setting.enterPublicKeyTip');
    fireEvent.change(textarea, { target: { value: 'EOS_VALID_KEY' } });
    fireEvent.click(screen.getByText('setting.submit'));
    fireEvent.click(screen.getByText('confirm'));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith(-1);
    });
  });
});

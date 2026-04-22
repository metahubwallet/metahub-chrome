import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

const mockGetRandomKeyPair = vi.fn().mockResolvedValue({
  publicKey: 'EOS_GENERATED_PUBLIC_KEY',
  privateKey: 'GENERATED_PRIVATE_KEY',
});

vi.mock('@/lib/keyring', () => ({
  getRandomKeyPair: () => mockGetRandomKeyPair(),
}));

vi.mock('@/components/ClipButton', () => ({
  default: ({ value }: any) => <button data-testid="clip-btn">{value}</button>,
}));

vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: any) => (open ? <div data-testid="dialog">{children}</div> : null),
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant }: any) => (
    <button disabled={disabled} data-variant={variant} onClick={onClick}>{children}</button>
  ),
}));

import GeneratePublicKey from '../GeneratePublicKey';

const mockOnClose = vi.fn();
const mockOnUseKey = vi.fn();

const renderComponent = (isOpen = true) =>
  render(
    <MemoryRouter>
      <GeneratePublicKey
        isOpen={isOpen}
        chainId="eos-chain-id"
        onClose={mockOnClose}
        onUseKey={mockOnUseKey}
      />
    </MemoryRouter>
  );

describe('GeneratePublicKey', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetRandomKeyPair.mockResolvedValue({
      publicKey: 'EOS_GENERATED_PUBLIC_KEY',
      privateKey: 'GENERATED_PRIVATE_KEY',
    });
  });

  it('renders dialog when open', () => {
    renderComponent(true);
    expect(screen.getByTestId('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    renderComponent(false);
    expect(screen.queryByTestId('dialog')).not.toBeInTheDocument();
  });

  it('generates key pair on open', async () => {
    renderComponent(true);
    await waitFor(() => {
      expect(mockGetRandomKeyPair).toHaveBeenCalled();
    });
  });

  it('shows public key label', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('public.publicKey')).toBeInTheDocument();
    });
  });

  it('shows private key label', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getByText('public.privateKey')).toBeInTheDocument();
    });
  });

  it('shows generated public key', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getAllByText('EOS_GENERATED_PUBLIC_KEY').length).toBeGreaterThan(0);
    });
  });

  it('shows generated private key', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getAllByText('GENERATED_PRIVATE_KEY').length).toBeGreaterThan(0);
    });
  });

  it('shows refresh button', () => {
    renderComponent();
    expect(screen.getByText('setting.refresh')).toBeInTheDocument();
  });

  it('shows use it button', () => {
    renderComponent();
    expect(screen.getByText('setting.useIt')).toBeInTheDocument();
  });

  it('generates new key on refresh click', async () => {
    renderComponent();
    await waitFor(() => expect(mockGetRandomKeyPair).toHaveBeenCalledTimes(1));
    fireEvent.click(screen.getByText('setting.refresh'));
    await waitFor(() => expect(mockGetRandomKeyPair).toHaveBeenCalledTimes(2));
  });

  it('calls onUseKey and onClose on use it click', async () => {
    renderComponent();
    await waitFor(() => {
      expect(screen.getAllByText('EOS_GENERATED_PUBLIC_KEY').length).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByText('setting.useIt'));
    expect(mockOnUseKey).toHaveBeenCalledWith('EOS_GENERATED_PUBLIC_KEY');
    expect(mockOnClose).toHaveBeenCalled();
  });

  it('shows notices', () => {
    renderComponent();
    expect(screen.getByText('setting.notice')).toBeInTheDocument();
  });
});

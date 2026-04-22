import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (k: string) => k }),
}));

vi.mock('@/utils/crypto', () => ({
  md5: vi.fn((v: string) => `md5:${v}`),
}));

vi.mock('@/types/account', () => ({}));
vi.mock('@/types/settings', () => ({}));

const mockWindowClose = vi.fn();
Object.defineProperty(window, 'close', { value: mockWindowClose, writable: true });

import TransactionPage from '../TransactionPage';

const singleActionParams = {
  domain: 'example.com',
  chainId: 'chain123',
  actions: [
    {
      account: 'eosio.token',
      name: 'transfer',
      authorization: [{ actor: 'testuser', permission: 'active' }],
      data: { from: 'testuser', to: 'receiver', quantity: '1.0000 EOS', memo: 'test' },
    },
  ],
  dataKeys: [['from', 'to', 'quantity', 'memo']],
  encryptText: '',
  authorization: { actor: 'testuser', permission: 'active' },
  buffer: [],
};

const signatureParams = {
  domain: 'example.com',
  chainId: 'chain123',
  actions: [],
  dataKeys: [],
  encryptText: 'Sign this message please',
  authorization: { actor: 'testuser', permission: 'active' },
  buffer: [],
};

describe('TransactionPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders action details in property view', async () => {
    (chrome.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      windowParams: singleActionParams,
    });
    render(<TransactionPage />);
    await waitFor(() => {
      expect(screen.getByText('auth.executionContract')).toBeInTheDocument();
    });
    expect(screen.getByText('testuser@active')).toBeInTheDocument();
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('from')).toBeInTheDocument();
    expect(screen.getByText('to')).toBeInTheDocument();
    expect(screen.getByText('1.0000 EOS')).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('renders signature mode when encryptText is present', async () => {
    (chrome.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      windowParams: signatureParams,
    });
    render(<TransactionPage />);
    await waitFor(() => {
      expect(screen.getByText('auth.requestSignature')).toBeInTheDocument();
    });
    expect(screen.getByText('Sign this message please')).toBeInTheDocument();
  });

  it('whitelist checkbox rejects multiple actions', async () => {
    const multiParams = {
      ...singleActionParams,
      actions: [
        ...singleActionParams.actions,
        {
          account: 'eosio',
          name: 'buyram',
          authorization: [{ actor: 'testuser', permission: 'active' }],
          data: { payer: 'testuser', receiver: 'testuser', quant: '1.0000 EOS' },
        },
      ],
      dataKeys: [
        ['from', 'to', 'quantity', 'memo'],
        ['payer', 'receiver', 'quant'],
      ],
    };
    (chrome.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      windowParams: multiParams,
    });
    const { container } = render(<TransactionPage />);
    await waitFor(() => {
      expect(screen.getByText('auth.joinWhitelist')).toBeInTheDocument();
    });
    // Checkbox is now a styled span; click label text to toggle
    fireEvent.click(screen.getByText('auth.joinWhitelist'));
    // Should not stay checked for multiple actions — inner checkmark svg absent
    await waitFor(() => {
      const checkmark = container.querySelector('span.bg-\\[\\#7C3AED\\]');
      expect(checkmark).not.toBeInTheDocument();
    });
  });

  it('cancel button closes window', async () => {
    (chrome.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      windowParams: singleActionParams,
    });
    render(<TransactionPage />);
    await waitFor(() => {
      expect(screen.getByText('auth.cancel')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('auth.cancel'));
    expect(mockWindowClose).toHaveBeenCalled();
  });

  it('submit saves result and closes window', async () => {
    (chrome.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      windowParams: singleActionParams,
    });
    render(<TransactionPage />);
    await waitFor(() => {
      expect(screen.getByText('auth.submit')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('auth.submit'));
    await waitFor(() => {
      expect(chrome.storage.session.set).toHaveBeenCalledWith({
        windowResult: { approve: true, whitelist: [] },
      });
      expect(mockWindowClose).toHaveBeenCalled();
    });
  });

  it('submit with whitelist checked includes whitelist data', async () => {
    (chrome.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      windowParams: singleActionParams,
    });
    const { container } = render(<TransactionPage />);
    await waitFor(() => {
      expect(screen.getByText('auth.joinWhitelist')).toBeInTheDocument();
    });
    // Checkbox is a styled span — click its label text
    fireEvent.click(screen.getByText('auth.joinWhitelist'));
    await waitFor(() => {
      const checkmark = container.querySelector('span.bg-\\[\\#7C3AED\\]');
      expect(checkmark).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('auth.submit'));
    await waitFor(() => {
      expect(chrome.storage.session.set).toHaveBeenCalledWith({
        windowResult: {
          approve: true,
          whitelist: [
            expect.objectContaining({
              domain: 'example.com',
              chainId: 'chain123',
              contract: 'eosio.token',
              action: 'transfer',
              actor: 'testuser',
              permission: 'active',
              properties: {
                from: '*',
                to: '*',
                quantity: '*',
                memo: '*',
              },
              hash: expect.stringContaining('md5:'),
            }),
          ],
        },
      });
      expect(mockWindowClose).toHaveBeenCalled();
    });
  });

  it('switches between property and JSON tabs', async () => {
    (chrome.storage.session.get as ReturnType<typeof vi.fn>).mockResolvedValue({
      windowParams: singleActionParams,
    });
    render(<TransactionPage />);
    await waitFor(() => {
      expect(screen.getByText('from')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByText('JSON'));
    await waitFor(() => {
      // JSON view should show pre-formatted JSON with indentation
      expect(screen.getByText(/"from"/)).toBeInTheDocument();
    });
  });
});

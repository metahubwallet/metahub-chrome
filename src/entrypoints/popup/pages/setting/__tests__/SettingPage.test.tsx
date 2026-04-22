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
  return { ...actual, useNavigate: () => mockNavigate };
});

vi.mock('@/components/PageHeader', () => ({
  default: ({ title }: any) => <div data-testid="page-header">{title}</div>,
}));

// Mock chrome.runtime
Object.defineProperty(global, 'chrome', {
  value: {
    runtime: {
      getManifest: () => ({ version: '2.0.0' }),
    },
  },
  writable: true,
});

import SettingPage from '../SettingPage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <SettingPage />
    </MemoryRouter>
  );

describe('SettingPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header with setting title', () => {
    renderPage();
    expect(screen.getByTestId('page-header')).toHaveTextContent('setting.setting');
  });

  it('renders node settings menu item', () => {
    renderPage();
    expect(screen.getByText('setting.nodesSetting')).toBeInTheDocument();
  });

  it('renders manage wallets menu item', () => {
    renderPage();
    expect(screen.getByText('setting.manageWallets')).toBeInTheDocument();
  });

  it('renders whitelist menu item', () => {
    renderPage();
    expect(screen.getByText('setting.whitelist')).toBeInTheDocument();
  });

  it('renders manage networks menu item', () => {
    renderPage();
    expect(screen.getByText('setting.manageNetworks')).toBeInTheDocument();
  });

  it('renders language menu item with subtitle', () => {
    renderPage();
    expect(screen.getByText('public.setLanguage')).toBeInTheDocument();
    expect(screen.getByText('public.language')).toBeInTheDocument();
  });

  it('renders current version with version number', () => {
    renderPage();
    expect(screen.getByText('setting.currentVersion')).toBeInTheDocument();
    expect(screen.getByText('2.0.0')).toBeInTheDocument();
  });

  it('renders about us menu item', () => {
    renderPage();
    expect(screen.getByText('setting.aboutUs')).toBeInTheDocument();
  });

  it('navigates to node settings on click', () => {
    renderPage();
    fireEvent.click(screen.getByText('setting.nodesSetting'));
    expect(mockNavigate).toHaveBeenCalledWith('/setting/network-select?type=node');
  });

  it('navigates to wallet manage on click', () => {
    renderPage();
    fireEvent.click(screen.getByText('setting.manageWallets'));
    expect(mockNavigate).toHaveBeenCalledWith('/setting/wallet-manage');
  });

  it('navigates to whitelist on click', () => {
    renderPage();
    fireEvent.click(screen.getByText('setting.whitelist'));
    expect(mockNavigate).toHaveBeenCalledWith('/setting/whitelist');
  });

  it('navigates to network manage on click', () => {
    renderPage();
    fireEvent.click(screen.getByText('setting.manageNetworks'));
    expect(mockNavigate).toHaveBeenCalledWith('/setting/network-manage');
  });

  it('navigates to language setting on click', () => {
    renderPage();
    fireEvent.click(screen.getByText('public.setLanguage'));
    expect(mockNavigate).toHaveBeenCalledWith('/setting/language');
  });
});

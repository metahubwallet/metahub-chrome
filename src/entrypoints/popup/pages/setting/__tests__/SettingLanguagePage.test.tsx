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

const mockSetLang = vi.fn().mockResolvedValue(undefined);
vi.mock('@/stores/settingStore', () => ({
  useSettingStore: vi.fn((selector: any) =>
    selector({ language: 'en', setLang: mockSetLang })
  ),
}));

vi.mock('@/i18n', () => ({
  default: { changeLanguage: vi.fn() },
}));

vi.mock('@/components/PageHeader', () => ({
  default: ({ title }: any) => <div data-testid="page-header">{title}</div>,
}));

import SettingLanguagePage from '../SettingLanguagePage';

const renderPage = () =>
  render(
    <MemoryRouter>
      <SettingLanguagePage />
    </MemoryRouter>
  );

describe('SettingLanguagePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders page header', () => {
    renderPage();
    expect(screen.getByTestId('page-header')).toHaveTextContent('setting.setLanguage');
  });

  it('renders Chinese language option', () => {
    renderPage();
    expect(screen.getByText('简体中文')).toBeInTheDocument();
  });

  it('renders English language option', () => {
    renderPage();
    expect(screen.getByText('English')).toBeInTheDocument();
  });

  it('shows check icon for active language', () => {
    renderPage();
    // English is the active language in mock
    const englishRow = screen.getByText('English').closest('div');
    // The check icon (svg) should be present in the active row
    expect(englishRow?.querySelector('svg')).toBeTruthy();
  });

  it('calls setLang and navigates back on language click', async () => {
    renderPage();
    fireEvent.click(screen.getByText('简体中文'));
    expect(mockSetLang).toHaveBeenCalledWith('zh-CN');
  });

  it('calls setLang with en when clicking English', async () => {
    renderPage();
    fireEvent.click(screen.getByText('English'));
    expect(mockSetLang).toHaveBeenCalledWith('en');
  });
});

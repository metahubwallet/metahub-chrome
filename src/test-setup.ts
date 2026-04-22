import '@testing-library/jest-dom';

// Mock the i18n singleton so tests importing modules that transitively init
// i18n (via @/i18n -> react-i18next.initReactI18next) don't blow up.
vi.mock('@/i18n', () => ({
  default: {
    t: (key: string) => key,
    use: () => ({ init: () => undefined }),
    init: () => undefined,
    changeLanguage: () => Promise.resolve(),
    language: 'en',
  },
}));

// Mock chrome API
const chromeMock = {
  storage: {
    local: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
    session: {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    },
  },
  runtime: {
    id: 'test-extension-id',
    sendMessage: vi.fn(),
    onMessage: { addListener: vi.fn() },
    getManifest: vi.fn(() => ({ version: '2.1.4' })),
  },
  windows: {
    create: vi.fn(),
    remove: vi.fn(),
    getCurrent: vi.fn().mockResolvedValue({ left: 0, top: 0, width: 800, height: 600 }),
    onRemoved: { addListener: vi.fn() },
  },
  i18n: { getUILanguage: vi.fn(() => 'en') },
  scripting: { registerContentScripts: vi.fn() },
};

vi.stubGlobal('chrome', chromeMock);

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getPassword, createWindow, closeWindow } from '../windowManager';

describe('windowManager', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPassword', () => {
    it('should return password from session storage', async () => {
      vi.mocked(chrome.storage.session.get as any).mockResolvedValue({ password: 'test123' });
      const result = await getPassword();
      expect(result).toBe('test123');
    });

    it('should return empty string when no password set', async () => {
      vi.mocked(chrome.storage.session.get as any).mockResolvedValue({});
      const result = await getPassword();
      expect(result).toBe('');
    });
  });

  describe('createWindow', () => {
    beforeEach(() => {
      vi.mocked(chrome.windows.getCurrent as any).mockResolvedValue({
        left: 100,
        top: 100,
        width: 1200,
        height: 800,
      });
    });

    it('should resolve login type to auth.html#/login', async () => {
      vi.mocked(chrome.windows.create).mockResolvedValue({ id: 1 } as any);
      // Don't await - test the URL parameter
      const promise = createWindow('login', 450, 600, { test: true });

      // Wait a tick for the async code to run
      await new Promise((r) => setTimeout(r, 0));

      expect(chrome.windows.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'auth.html#/login',
          type: 'popup',
          width: 450,
          height: 600,
        })
      );
    });

    it('should resolve unlock type to auth.html#/unlock', async () => {
      vi.mocked(chrome.windows.create).mockResolvedValue({ id: 2 } as any);
      createWindow('unlock', 500, 450, null);

      await new Promise((r) => setTimeout(r, 0));

      expect(chrome.windows.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'auth.html#/unlock',
        })
      );
    });

    it('should resolve transaction type to transaction.html', async () => {
      vi.mocked(chrome.windows.create).mockResolvedValue({ id: 3 } as any);
      createWindow('transaction', 600, 518, { actions: [] });

      await new Promise((r) => setTimeout(r, 0));

      expect(chrome.windows.create).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'transaction.html',
        })
      );
    });

    it('should store params in session storage when not null', async () => {
      vi.mocked(chrome.windows.create).mockResolvedValue({ id: 4 } as any);
      createWindow('login', 450, 600, { appName: 'TestApp' });

      await new Promise((r) => setTimeout(r, 0));

      expect(chrome.storage.session.set).toHaveBeenCalledWith({
        windowParams: { appName: 'TestApp' },
      });
    });

    it('should not store params when null', async () => {
      vi.mocked(chrome.windows.create).mockResolvedValue({ id: 5 } as any);
      createWindow('unlock', 500, 450, null);

      await new Promise((r) => setTimeout(r, 0));

      expect(chrome.storage.session.set).not.toHaveBeenCalled();
    });
  });

  describe('closeWindow', () => {
    it('should resolve with windowResult from session storage', async () => {
      vi.mocked(chrome.windows.create).mockResolvedValue({ id: 10 } as any);
      vi.mocked(chrome.windows.getCurrent as any).mockResolvedValue({
        left: 0,
        top: 0,
        width: 800,
        height: 600,
      });

      const promise = createWindow('login', 450, 600, null);

      await new Promise((r) => setTimeout(r, 0));

      vi.mocked(chrome.storage.session.get as any).mockResolvedValue({
        windowResult: { name: 'testuser', chainId: 'abc123' },
      });

      closeWindow(10);

      await new Promise((r) => setTimeout(r, 50));

      const result = await promise;
      expect(result).toEqual({ name: 'testuser', chainId: 'abc123' });
    });

    it('should do nothing for unknown windowId', async () => {
      await closeWindow(999);
      // no error thrown
      expect(chrome.storage.session.get).not.toHaveBeenCalled();
    });
  });
});

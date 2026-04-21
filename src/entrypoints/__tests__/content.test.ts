import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('content script event bridging', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Simulate content script main() - register the bridge handler
    document.addEventListener('chromeMessageRequest', (event: any) => {
      const data = event.detail;
      chrome.runtime.sendMessage(data.msg, (response: any) => {
        document.dispatchEvent(
          new CustomEvent('chromeMessageResponse', {
            detail: { id: data.id, response },
          })
        );
      });
    });
  });

  it('should forward chromeMessageRequest to chrome.runtime.sendMessage', () => {
    const testMsg = JSON.stringify({ type: 'test', payload: {} });
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((_msg: any, _callback?: any) => {
      return undefined as any;
    });

    document.dispatchEvent(
      new CustomEvent('chromeMessageRequest', {
        detail: { id: 1, msg: testMsg },
      })
    );

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(testMsg, expect.any(Function));
  });

  it('should dispatch chromeMessageResponse with correct id and response', async () => {
    const responseData = { signatures: ['SIG_test'] };
    vi.mocked(chrome.runtime.sendMessage).mockImplementation((_msg: any, callback?: any) => {
      if (callback) callback(responseData);
      return undefined as any;
    });

    const responsePromise = new Promise<any>((resolve) => {
      const handler = (event: any) => {
        resolve(event.detail);
        document.removeEventListener('chromeMessageResponse', handler);
      };
      document.addEventListener('chromeMessageResponse', handler);
    });

    document.dispatchEvent(
      new CustomEvent('chromeMessageRequest', {
        detail: { id: 42, msg: '{"type":"test"}' },
      })
    );

    const result = await responsePromise;
    expect(result.id).toBe(42);
    expect(result.response).toEqual(responseData);
  });
});

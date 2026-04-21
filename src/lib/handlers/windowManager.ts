/**
 * Window manager that survives MV3 Service Worker restarts.
 *
 * Instead of keeping resolve callbacks in memory (lost when the SW is killed),
 * we persist the pending window ID in chrome.storage.session and poll for the
 * result that the popup writes before closing.
 */

const PENDING_KEY = 'pendingWindowId';
const RESULT_KEY = 'windowResult';
const PARAMS_KEY = 'windowParams';
const POLL_INTERVAL = 200; // ms

export async function getPassword(): Promise<string> {
  const result: any = (await chrome.storage.session.get(['password'])) ?? {};
  return (result.password as string) || '';
}

export async function closeWindow(windowId: number, forceClose = false) {
  const stored: any = await chrome.storage.session.get([PENDING_KEY]);
  if (stored[PENDING_KEY] === windowId) {
    if (forceClose) {
      chrome.windows.remove(windowId).catch(() => {});
    }
    // Mark the window as closed so the polling loop can resolve.
    // If the popup already wrote a result, leave it; otherwise write null.
    const existing: any = await chrome.storage.session.get([RESULT_KEY]);
    if (existing[RESULT_KEY] === undefined) {
      await chrome.storage.session.set({ [RESULT_KEY]: null });
    }
    await chrome.storage.session.remove([PENDING_KEY]);
  }
}

export async function createWindow(
  type: string,
  width: number,
  height: number,
  params: any,
): Promise<any> {
  // Clean up stale state
  await chrome.storage.session.remove([RESULT_KEY, PENDING_KEY]);

  const cw = await chrome.windows.getCurrent();
  const left = Math.round(cw.left! + (cw.width! - width) / 2);
  const top = Math.round(cw.top! + (cw.height! - height) / 2);

  let url: string;
  if (type === 'login' || type === 'unlock') {
    url = `auth.html#/${type}`;
  } else {
    url = 'transaction.html';
  }

  if (params != null) {
    await chrome.storage.session.set({ [PARAMS_KEY]: params });
  }

  const win = await chrome.windows.create({
    url,
    focused: true,
    width,
    height,
    left,
    top,
    type: 'popup',
  });

  await chrome.storage.session.set({ [PENDING_KEY]: win?.id });

  // Poll for the result — survives SW restart because state is in storage.
  return new Promise<any>((resolve) => {
    const timer = setInterval(async () => {
      try {
        const data: any = await chrome.storage.session.get([RESULT_KEY]);
        if (data[RESULT_KEY] !== undefined) {
          clearInterval(timer);
          const result = data[RESULT_KEY];
          await chrome.storage.session.remove([RESULT_KEY, PENDING_KEY]);
          resolve(result);
        }
      } catch {
        // session storage may throw if context is invalidated; keep polling.
      }
    }, POLL_INTERVAL);
  });
}

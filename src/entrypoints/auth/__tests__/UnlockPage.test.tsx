import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';

const mockWindowClose = vi.fn();
Object.defineProperty(window, 'close', { value: mockWindowClose, writable: true });

import UnlockPage from '../UnlockPage';

describe('UnlockPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('sets windowResult with unlock:true and closes window on mount', async () => {
    render(<UnlockPage />);
    await waitFor(() => {
      expect(chrome.storage.session.set).toHaveBeenCalledWith({
        windowResult: { unlock: true },
      });
      expect(mockWindowClose).toHaveBeenCalled();
    });
  });
});

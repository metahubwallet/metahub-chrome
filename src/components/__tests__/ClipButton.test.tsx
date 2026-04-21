import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ClipButton from '@/components/ClipButton';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ClipButton', () => {
  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it('copies value to clipboard when clicked', async () => {
    const value = 'EOS6MRyAjQq8ud7hVNYcfnVPJqcVpscN5So8BhtHuGYqET5GDW5CV';
    render(<ClipButton value={value} />);

    const button = screen.getByRole('button', { name: /copy to clipboard/i });
    await userEvent.click(button);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(value);
  });

  it('renders text variant with label', () => {
    render(<ClipButton value="test" variant="text" label="Copy Address" />);
    expect(screen.getByText('Copy Address')).toBeInTheDocument();
  });
});

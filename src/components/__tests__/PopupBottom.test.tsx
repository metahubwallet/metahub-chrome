import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PopupBottom from '@/components/PopupBottom';

describe('PopupBottom', () => {
  it('renders children when open', () => {
    render(
      <PopupBottom isOpen={true} onClose={() => {}}>
        <p>Bottom sheet content</p>
      </PopupBottom>
    );
    expect(screen.getByText('Bottom sheet content')).toBeInTheDocument();
  });

  it('hides the overlay backdrop when closed', () => {
    render(
      <PopupBottom isOpen={false} onClose={() => {}}>
        <p>Hidden content</p>
      </PopupBottom>
    );
    // When closed the outer wrapper has pointer-events-none (visually hidden)
    const wrapper = document.querySelector('.pointer-events-none');
    expect(wrapper).toBeInTheDocument();
  });

  it('renders title when provided', () => {
    render(
      <PopupBottom isOpen={true} title="My Title" onClose={() => {}}>
        <p>Content</p>
      </PopupBottom>
    );
    expect(screen.getByText('My Title')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', async () => {
    const onClose = vi.fn();
    render(
      <PopupBottom isOpen={true} onClose={onClose}>
        <p>Content</p>
      </PopupBottom>
    );
    const closeBtn = screen.getByRole('button', { name: /close/i });
    await userEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

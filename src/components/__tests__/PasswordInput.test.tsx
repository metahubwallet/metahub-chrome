import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PasswordInput from '@/components/PasswordInput';

describe('PasswordInput', () => {
  it('renders as password type by default', () => {
    render(<PasswordInput />);
    const passwordInput = document.querySelector('input[type="password"]');
    expect(passwordInput).toBeInTheDocument();
  });

  it('toggles password visibility when eye button is clicked', async () => {
    render(<PasswordInput placeholder="Enter password" />);

    // Initially hidden
    expect(document.querySelector('input[type="password"]')).toBeInTheDocument();

    // Click to show
    const toggleBtn = screen.getByRole('button', { name: /show password/i });
    await userEvent.click(toggleBtn);

    expect(document.querySelector('input[type="text"]')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /hide password/i })).toBeInTheDocument();
  });

  it('toggles back to hidden on second click', async () => {
    render(<PasswordInput />);

    const toggleBtn = screen.getByRole('button', { name: /show password/i });
    await userEvent.click(toggleBtn);
    await userEvent.click(screen.getByRole('button', { name: /hide password/i }));

    expect(document.querySelector('input[type="password"]')).toBeInTheDocument();
  });
});

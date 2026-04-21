import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NumberInput from '@/components/NumberInput';

describe('NumberInput', () => {
  it('renders with the given value', () => {
    render(<NumberInput value={42} />);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('42');
  });

  it('renders with defaultValue', () => {
    render(<NumberInput defaultValue={10} />);
    const input = screen.getByRole('spinbutton') as HTMLInputElement;
    expect(input.value).toBe('10');
  });

  it('increments value when + button is clicked', async () => {
    const onChange = vi.fn();
    render(<NumberInput defaultValue={5} step={1} onChange={onChange} />);
    const incBtn = screen.getByRole('button', { name: /increase value/i });
    await userEvent.click(incBtn);
    expect(onChange).toHaveBeenCalledWith(6);
  });

  it('decrements value when - button is clicked', async () => {
    const onChange = vi.fn();
    render(<NumberInput defaultValue={5} step={1} onChange={onChange} />);
    const decBtn = screen.getByRole('button', { name: /decrease value/i });
    await userEvent.click(decBtn);
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it('respects minimum value — disables decrement at min', () => {
    render(<NumberInput defaultValue={0} min={0} />);
    const decBtn = screen.getByRole('button', { name: /decrease value/i });
    expect(decBtn).toBeDisabled();
  });

  it('respects maximum value — disables increment at max', () => {
    render(<NumberInput defaultValue={10} max={10} />);
    const incBtn = screen.getByRole('button', { name: /increase value/i });
    expect(incBtn).toBeDisabled();
  });

  it('clamps value to max when incrementing beyond max', async () => {
    const onChange = vi.fn();
    render(<NumberInput defaultValue={9} max={10} step={5} onChange={onChange} />);
    const incBtn = screen.getByRole('button', { name: /increase value/i });
    await userEvent.click(incBtn);
    expect(onChange).toHaveBeenCalledWith(10);
  });
});

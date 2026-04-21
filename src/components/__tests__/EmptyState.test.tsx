import { render, screen } from '@testing-library/react';
import EmptyState from '@/components/EmptyState';

describe('EmptyState', () => {
  it('renders default message when no message prop given', () => {
    render(<EmptyState />);
    expect(screen.getByText('No data available')).toBeInTheDocument();
  });

  it('renders custom message when provided', () => {
    render(<EmptyState message="No transactions found" />);
    expect(screen.getByText('No transactions found')).toBeInTheDocument();
  });

  it('renders custom icon when provided', () => {
    render(<EmptyState icon={<span data-testid="custom-icon" />} />);
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
  });
});

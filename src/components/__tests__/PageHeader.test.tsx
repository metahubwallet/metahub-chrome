import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';

const renderWithRouter = (ui: React.ReactElement) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

describe('PageHeader', () => {
  it('renders title text', () => {
    renderWithRouter(<PageHeader title="Test Page" />);
    expect(screen.getByText('Test Page')).toBeInTheDocument();
  });

  it('has a back button', () => {
    renderWithRouter(<PageHeader title="Settings" />);
    const backBtn = screen.getByRole('button', { name: /go back/i });
    expect(backBtn).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', async () => {
    const onBack = vi.fn();
    renderWithRouter(<PageHeader title="Settings" onBack={onBack} />);
    const backBtn = screen.getByRole('button', { name: /go back/i });
    await userEvent.click(backBtn);
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

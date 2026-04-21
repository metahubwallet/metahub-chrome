import { render, screen } from '@testing-library/react';
import StakedDetail from '@/entrypoints/popup/pages/resource/components/StakedDetail';
import { ResourceData } from '@/entrypoints/popup/pages/resource/ResourcePage';

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'en' } }),
}));

// ── Test data ─────────────────────────────────────────────────────────────────

const mockResourceData: ResourceData = {
  core_liquid_balance: '10.0000 EOS',
  use_percentage: 25,
  use_limit: { max: 2000000, used: 500000 },
  stake_max: 10,
  refund_request: { amount: 0, request_time: 0, left_time: '' },
  total_resources_weight: '5.0000 EOS',
  self_delegated_bandwidth_weight: '3.0000 EOS',
  staked_for_others: 1.5,
  staked_for_user: 2.0,
};

const mockResources = { cpu: mockResourceData, net: mockResourceData };

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('StakedDetail', () => {
  it('renders with pointer-events-none (closed) when isOpen is false', () => {
    render(
      <StakedDetail
        isOpen={false}
        onClose={() => {}}
        resources={mockResources}
        type="cpu"
      />
    );
    // Sheet still renders to DOM but uses pointer-events-none when closed
    const wrapper = document.querySelector('.pointer-events-none');
    expect(wrapper).toBeInTheDocument();
  });

  it('renders stake info title when open', () => {
    render(
      <StakedDetail
        isOpen={true}
        onClose={() => {}}
        resources={mockResources}
        type="cpu"
      />
    );
    expect(screen.getByText('resource.stakeInfo')).toBeInTheDocument();
  });

  it('renders self-staked label and value', () => {
    render(
      <StakedDetail
        isOpen={true}
        onClose={() => {}}
        resources={mockResources}
        type="cpu"
      />
    );
    expect(screen.getByText(/resource\.selfStake/)).toBeInTheDocument();
    expect(screen.getByText('3.0000 EOS')).toBeInTheDocument();
  });

  it('renders other-staked label and value', () => {
    render(
      <StakedDetail
        isOpen={true}
        onClose={() => {}}
        resources={mockResources}
        type="cpu"
      />
    );
    expect(screen.getByText(/resource\.otherStake/)).toBeInTheDocument();
    // staked_for_user is 2.0; React renders the number and " EOS" as separate text nodes in the span
    expect(screen.getByText(/resource\.otherStake/)).toBeInTheDocument();
    // Find the span containing the staked_for_user value
    const spans = document.querySelectorAll('span');
    const valueSpan = Array.from(spans).find((el) => el.textContent?.match(/2.*EOS/));
    expect(valueSpan).toBeTruthy();
  });

  it('shows NET data when type is net', () => {
    const netData: ResourceData = {
      ...mockResourceData,
      self_delegated_bandwidth_weight: '1.5000 EOS',
      staked_for_user: 0.5,
    };
    render(
      <StakedDetail
        isOpen={true}
        onClose={() => {}}
        resources={{ cpu: mockResourceData, net: netData }}
        type="net"
      />
    );
    expect(screen.getByText('1.5000 EOS')).toBeInTheDocument();
    const spans = document.querySelectorAll('span');
    const valueSpan = Array.from(spans).find((el) => el.textContent?.match(/0\.5.*EOS/));
    expect(valueSpan).toBeTruthy();
  });
});

import * as React from 'react';

interface VerticalBarProps {
  percentage: number;
  thick?: boolean;
  className?: string;
  highThreshold?: number;
}

const VerticalBar: React.FC<VerticalBarProps> = ({
  percentage,
  thick = false,
  className = '',
  highThreshold = 80,
}) => {
  const clampedPct = Math.min(100, Math.max(0, percentage));

  const background =
    clampedPct < 30
      ? 'linear-gradient(to top, #22C55E, #16A34A)'
      : clampedPct > highThreshold
      ? 'linear-gradient(to top, #E11D48, #BE123C)'
      : 'linear-gradient(to top, #BF01FA, #8F2BFF)';

  return (
    <div className={`${thick ? 'w-5' : 'w-2'} rounded-full bg-purple-bg flex flex-col justify-end h-full ${className}`}>
      <div
        className="w-full rounded-full transition-all duration-500 ease-in-out"
        style={{
          height: `${clampedPct}%`,
          minHeight: clampedPct > 0 ? 4 : 0,
          background,
        }}
      />
    </div>
  );
};

export default VerticalBar;

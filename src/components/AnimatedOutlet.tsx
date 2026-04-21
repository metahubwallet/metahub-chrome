import * as React from 'react';
import { useLocation, useOutlet } from 'react-router-dom';

/**
 * Animated page transition wrapper.
 * Forward: new page slides in from right.
 * Back: new page slides in from left.
 * No exit animation — instant swap eliminates white flash.
 */
const AnimatedOutlet: React.FC = () => {
  const location = useLocation();
  const outlet = useOutlet();

  const containerRef = React.useRef<HTMLDivElement>(null);
  const prevPathRef = React.useRef(location.pathname);
  const historyIndexRef = React.useRef<number>(
    (window.history.state?.idx as number) ?? 0
  );

  React.useEffect(() => {
    if (location.pathname === prevPathRef.current) return;

    const el = containerRef.current;
    if (!el) {
      prevPathRef.current = location.pathname;
      return;
    }

    const currentIdx = (window.history.state?.idx as number) ?? 0;
    const goingBack = currentIdx < historyIndexRef.current;
    historyIndexRef.current = currentIdx;
    prevPathRef.current = location.pathname;

    // Jump to start position (no transition)
    el.style.transition = 'none';
    el.style.transform = goingBack ? 'translateX(-100%)' : 'translateX(100%)';

    // Force reflow then animate to final position
    el.getBoundingClientRect();
    el.style.transition = 'transform 250ms cubic-bezier(0.4,0,0.2,1)';
    el.style.transform = 'translateX(0)';
  }, [location.pathname]);

  return (
    <div ref={containerRef} className="h-full w-full">
      {outlet}
    </div>
  );
};

export default AnimatedOutlet;

import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/utils/cn';

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

const Sheet: React.FC<SheetProps> = ({ open, onOpenChange, children }) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange?.(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onOpenChange]);

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 transition-all duration-300',
        open ? 'pointer-events-auto' : 'pointer-events-none'
      )}
    >
      <div
        className={cn(
          'fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300',
          open ? 'opacity-100' : 'opacity-0'
        )}
        onClick={() => onOpenChange?.(false)}
      />
      {children}
    </div>
  );
};
Sheet.displayName = 'Sheet';

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
}

const SheetContent = React.forwardRef<HTMLDivElement, SheetContentProps>(
  ({ className, children, open, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50 flex flex-col rounded-t-xl border border-border bg-background p-6 shadow-lg transition-transform duration-300 ease-in-out',
        open ? 'translate-y-0' : 'translate-y-full',
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
);
SheetContent.displayName = 'SheetContent';

const SheetHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div className={cn('flex flex-col space-y-1.5 text-center', className)} {...props} />
);
SheetHeader.displayName = 'SheetHeader';

const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2
      ref={ref}
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    />
  )
);
SheetTitle.displayName = 'SheetTitle';

interface SheetCloseProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  onClose?: () => void;
}

const SheetClose: React.FC<SheetCloseProps> = ({ className, onClose, ...props }) => (
  <button
    className={cn(
      'absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
      className
    )}
    onClick={onClose}
    {...props}
  >
    <X className="h-4 w-4" />
    <span className="sr-only">Close</span>
  </button>
);
SheetClose.displayName = 'SheetClose';

export { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose };

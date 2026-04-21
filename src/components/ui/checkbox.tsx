import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  onCheckedChange?: (checked: boolean) => void;
}

const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, onCheckedChange, onChange, ...props }, ref) => {
    const inputId = id || React.useId();

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange?.(e);
      onCheckedChange?.(e.target.checked);
    };

    return (
      <label htmlFor={inputId} className="flex items-center gap-2 cursor-pointer">
        <div className="relative">
          <input
            type="checkbox"
            id={inputId}
            ref={ref}
            className="sr-only peer"
            onChange={handleChange}
            {...props}
          />
          <div
            className={cn(
              'h-4 w-4 rounded border border-border bg-background flex items-center justify-center transition-colors peer-checked:bg-primary peer-checked:border-primary peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
              className
            )}
          >
            <Check className="h-3 w-3 text-white hidden peer-checked:block" />
          </div>
        </div>
        {label && <span className="text-sm">{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = 'Checkbox';

export { Checkbox };

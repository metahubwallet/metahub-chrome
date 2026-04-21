import * as React from 'react';
import { cn } from '@/utils/cn';

interface RadioGroupContextValue {
  value: string;
  onValueChange: (value: string) => void;
  name: string;
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({
  value: '',
  onValueChange: () => {},
  name: '',
});

interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  name?: string;
}

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className, value: controlledValue, defaultValue = '', onValueChange, name, children, ...props }, ref) => {
    const [internalValue, setInternalValue] = React.useState(defaultValue);
    const value = controlledValue ?? internalValue;
    const groupName = name || React.useId();

    const handleValueChange = (newValue: string) => {
      setInternalValue(newValue);
      onValueChange?.(newValue);
    };

    return (
      <RadioGroupContext.Provider value={{ value, onValueChange: handleValueChange, name: groupName }}>
        <div ref={ref} role="radiogroup" className={cn('grid gap-2', className)} {...props}>
          {children}
        </div>
      </RadioGroupContext.Provider>
    );
  }
);
RadioGroup.displayName = 'RadioGroup';

interface RadioGroupItemProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  value: string;
  label?: string;
}

const RadioGroupItem = React.forwardRef<HTMLInputElement, RadioGroupItemProps>(
  ({ className, value, label, id, ...props }, ref) => {
    const ctx = React.useContext(RadioGroupContext);
    const inputId = id || `radio-${ctx.name}-${value}`;
    const isChecked = ctx.value === value;

    return (
      <label htmlFor={inputId} className="flex items-center gap-2 cursor-pointer">
        <div className="relative flex items-center justify-center">
          <input
            ref={ref}
            type="radio"
            id={inputId}
            name={ctx.name}
            value={value}
            checked={isChecked}
            onChange={() => ctx.onValueChange(value)}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'h-4 w-4 rounded-full border border-border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
              isChecked ? 'border-primary' : 'bg-background',
              className
            )}
          >
            {isChecked && <div className="h-2 w-2 rounded-full bg-primary m-[2px]" />}
          </div>
        </div>
        {label && <span className="text-sm">{label}</span>}
      </label>
    );
  }
);
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };

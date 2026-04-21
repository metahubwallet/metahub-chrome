import * as React from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/utils/cn';

export interface NumberInputProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  precision?: number;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  onChange?: (value: number) => void;
}

const NumberInput: React.FC<NumberInputProps> = ({
  value: controlledValue,
  defaultValue = 0,
  min,
  max,
  step = 1,
  precision,
  disabled = false,
  placeholder,
  className,
  onChange,
}) => {
  const [internalValue, setInternalValue] = React.useState<number>(defaultValue);
  const [inputStr, setInputStr] = React.useState<string>(String(defaultValue));

  const value = controlledValue ?? internalValue;

  React.useEffect(() => {
    setInputStr((prev) => {
      const parsed = parseFloat(prev);
      return !isNaN(parsed) && parsed === value ? prev : String(value);
    });
  }, [value]);

  const clamp = (n: number): number => {
    let result = n;
    if (min !== undefined) result = Math.max(min, result);
    if (max !== undefined) result = Math.min(max, result);
    return result;
  };

  const applyPrecision = (n: number): number => {
    if (precision !== undefined) {
      return parseFloat(n.toFixed(precision));
    }
    return n;
  };

  const commit = (n: number) => {
    const clamped = applyPrecision(clamp(n));
    setInternalValue(clamped);
    setInputStr(String(clamped));
    onChange?.(clamped);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    if (raw !== '' && !/^-?\d*\.?\d*$/.test(raw)) return;
    setInputStr(raw);
    const parsed = parseFloat(raw);
    if (!isNaN(parsed)) {
      const clamped = applyPrecision(clamp(parsed));
      setInternalValue(clamped);
      onChange?.(clamped);
    }
  };

  const handleBlur = () => {
    const parsed = parseFloat(inputStr);
    if (isNaN(parsed)) {
      setInputStr(String(value));
    } else {
      commit(parsed);
    }
  };

  const decrement = () => commit(value - step);
  const increment = () => commit(value + step);

  const atMin = min !== undefined && value <= min;
  const atMax = max !== undefined && value >= max;

  return (
    <div className={cn('flex items-center border border-[#E9D8FD] rounded-xl overflow-hidden', className)}>
      <button
        type="button"
        aria-label="Decrease value"
        disabled={disabled || atMin}
        onClick={decrement}
        className="flex h-10 w-10 shrink-0 items-center justify-center border-r border-[#E9D8FD] bg-background text-primary hover:bg-[#F5F0FF] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Minus className="h-4 w-4" />
      </button>
      <input
        type="text"
        inputMode="decimal"
        value={inputStr}
        disabled={disabled}
        placeholder={placeholder}
        onChange={handleInputChange}
        onBlur={handleBlur}
        className="h-10 w-full bg-background px-3 py-2 text-center text-sm outline-none disabled:cursor-not-allowed disabled:opacity-50"
      />
      <button
        type="button"
        aria-label="Increase value"
        disabled={disabled || atMax}
        onClick={increment}
        className="flex h-10 w-10 shrink-0 items-center justify-center border-l border-[#E9D8FD] bg-background text-primary hover:bg-[#F5F0FF] transition-colors disabled:cursor-not-allowed disabled:opacity-50"
      >
        <Plus className="h-4 w-4" />
      </button>
    </div>
  );
};

export default NumberInput;

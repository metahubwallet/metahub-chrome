import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/utils/cn';

export interface ClipButtonProps {
  value: string;
  variant?: 'icon' | 'text';
  className?: string;
  label?: string;
}

const ClipButton: React.FC<ClipButtonProps> = ({
  value,
  variant = 'icon',
  className,
  label = 'Copy',
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = React.useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success(t('public.copySuccess'));
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy');
    }
  };

  if (variant === 'text') {
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={handleCopy}
        className={cn('gap-1.5', className)}
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {label}
      </Button>
    );
  }

  return (
    <button
      type="button"
      aria-label="Copy to clipboard"
      onClick={handleCopy}
      className={cn(
        'inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
        className
      )}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </button>
  );
};

export default ClipButton;

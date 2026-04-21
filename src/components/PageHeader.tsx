import * as React from 'react';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/utils/cn';

export interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  className?: string;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, onBack, className }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate(-1);
    }
  };

  return (
    <div className={cn('flex items-center gap-3 px-4 py-4 relative z-10', className)}>
      <button
        type="button"
        aria-label="Go back"
        onClick={handleBack}
        className="flex items-center justify-center rounded-md p-2 hover:bg-muted transition-colors cursor-pointer"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <h1 className="text-lg font-semibold">{title}</h1>
    </div>
  );
};

export default PageHeader;

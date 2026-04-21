import * as React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';

export interface PopupBottomProps {
  isOpen: boolean;
  title?: string;
  headerLeft?: React.ReactNode;
  onClose: () => void;
  children?: React.ReactNode;
}

const PopupBottom: React.FC<PopupBottomProps> = ({ isOpen, title, headerLeft, onClose, children }) => (
  <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <SheetContent open={isOpen}>
      {title && (
        headerLeft ? (
          <div className="flex items-center justify-center relative h-[28px]">
            <div className="absolute left-0">{headerLeft}</div>
            <h2 className="text-lg font-semibold leading-none tracking-tight">{title}</h2>
          </div>
        ) : (
          <SheetHeader>
            <SheetTitle>{title}</SheetTitle>
          </SheetHeader>
        )
      )}
      <SheetClose onClose={onClose} />
      <div className="mt-2">{children}</div>
    </SheetContent>
  </Sheet>
);

export default PopupBottom;

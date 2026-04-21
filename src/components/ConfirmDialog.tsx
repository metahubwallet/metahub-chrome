import * as React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  onClose: () => void;
  onConfirm: () => void;
  showCancel?: boolean;
  confirmText?: string;
  cancelText?: string;
  children?: React.ReactNode;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  onClose,
  onConfirm,
  showCancel = true,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  children,
}) => (
  <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
    <DialogContent>
      <DialogClose onClose={onClose} />
      {title && (
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
      )}
      {children && <div className="py-2">{children}</div>}
      <DialogFooter className="flex flex-row gap-3">
        {showCancel && (
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {cancelText}
          </Button>
        )}
        <Button className="flex-1" onClick={onConfirm}>{confirmText}</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
);

export default ConfirmDialog;

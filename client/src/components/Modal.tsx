import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

/** Portalled to <body> so fixed positioning isn't trapped by animated (transformed) ancestors. */
export function Modal({ children, onClose, wide }: { children: ReactNode; onClose?: () => void; wide?: boolean }) {
  return createPortal(
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className={`modal panel${wide ? ' wide' : ''}`}
        initial={{ y: 40, scale: 0.94, opacity: 0 }}
        animate={{ y: 0, scale: 1, opacity: 1 }}
        exit={{ y: 20, scale: 0.97, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal
      >
        {onClose && (
          <button className="modal-close" onClick={onClose} aria-label="Đóng">
            ×
          </button>
        )}
        {children}
      </motion.div>
    </motion.div>,
    document.body,
  );
}

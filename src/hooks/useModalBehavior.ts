import { useEffect } from 'react';

/**
 * Universal hook for predictable modal & drawer behavior:
 * - Listens for 'Escape' key to close
 * - Locks document body scroll while open
 * - Automatically cleans up on unmount or close
 */
export function useModalBehavior(isOpen: boolean, onClose: () => void) {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);
}

import { useEffect, useRef } from 'react';

/**
 * Universal hook for predictable modal & drawer behavior:
 * - Listens for 'Escape' key to close
 * - Locks document body scroll while open
 * - Uses an onClose ref so parent/store re-renders never re-lock scroll or tear down listeners
 */
export function useModalBehavior(isOpen: boolean, onClose: () => void) {
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);
}

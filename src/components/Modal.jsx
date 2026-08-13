import React, { useEffect, useRef } from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const titleId = `modal-title-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  useEffect(() => { closeRef.current = onClose; }, [onClose]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab' && dialogRef.current) {
        const items = [...dialogRef.current.querySelectorAll('button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')];
        if (!items.length) return;
        const first = items[0], last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      setTimeout(() => dialogRef.current?.focus(), 0);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="modal-content" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <div className="modal-header">
          <h2 className="modal-title" id={titleId}>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Tutup dialog">
            &times;
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;

import React, { useEffect, useRef } from 'react';

const Modal = ({ isOpen, onClose, title, children }) => {
  const overlayRef = useRef(null);
  const dialogRef = useRef(null);
  const titleId = `modal-title-${String(title).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
      setTimeout(() => dialogRef.current?.focus(), 0);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

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

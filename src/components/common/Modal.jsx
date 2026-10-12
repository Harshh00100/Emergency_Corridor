import { useEffect, useId, useRef } from 'react';

export const Modal = ({ open, title, onClose, children, wide = false }) => {
  const dialogRef = useRef(null);
  const previousFocus = useRef(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = dialogRef.current;
    let focusTimer;
    if (open) {
      previousFocus.current = document.activeElement;
      if (!dialog.open) dialog.showModal();
      focusTimer = window.setTimeout(() => dialog.querySelector('button, input, select, textarea, [tabindex="0"]')?.focus(), 0);
    } else if (dialog.open) dialog.close();
    return () => {
      window.clearTimeout(focusTimer);
      if (dialog.open) dialog.close();
      if (open) previousFocus.current?.focus?.();
    };
  }, [open]);
  const containTabFocus = (event) => {
    if (event.key !== 'Tab') return;
    const controls = [...event.currentTarget.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]')];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last?.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first?.focus();
    }
  };
  return (
    <dialog ref={dialogRef} className={wide ? 'project-dialog' : 'dialog'} aria-modal="true" aria-labelledby={titleId}
      onKeyDown={containTabFocus}
      onCancel={(event) => { event.preventDefault(); onClose(); }}>
      <div className="dialog-header"><h2 id={titleId}>{title}</h2><button type="button" className="button button-secondary" onClick={onClose}>Close</button></div>
      {open && children}
    </dialog>
  );
};

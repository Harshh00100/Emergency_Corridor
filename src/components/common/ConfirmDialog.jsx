import { Modal } from './Modal';

export const ConfirmDialog = ({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel }) => (
  <Modal open={open} title={title} onClose={onCancel}>
    <p>{message}</p>
    <div className="dialog-actions">
      <button type="button" className="button button-secondary" onClick={onCancel}>Cancel</button>
      <button type="button" className="button button-primary" onClick={onConfirm}>{confirmLabel}</button>
    </div>
  </Modal>
);

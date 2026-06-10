import { createPortal } from "react-dom";
import "./ConfirmModal.css";

type ConfirmModalProps = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  showInput?: boolean;
  inputLabel?: string;
  placeholder?: string;
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
};

export default function ConfirmModal({
  title,
  description,
  confirmLabel = "Onayla",
  cancelLabel = "İptal",
  showInput = false,
  inputLabel,
  placeholder,
  defaultValue = "",
  value,
  onChange,
  onConfirm,
  onCancel,
  danger = false,
}: ConfirmModalProps) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="confirm-modal-backdrop" onClick={onCancel}>
      <div
        className="confirm-modal-card"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="confirm-modal-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="confirm-modal-close"
            onClick={onCancel}
            aria-label="Kapat"
          >
            ×
          </button>
        </div>

        {description ? (
          <p className="confirm-modal-description">{description}</p>
        ) : null}

        {showInput ? (
          <label className="confirm-modal-field">
            {inputLabel}
            <input
              type="text"
              placeholder={placeholder}
              value={value ?? defaultValue}
              onChange={(e) => onChange?.(e.target.value)}
            />
          </label>
        ) : null}

        <div className="confirm-modal-actions">
          <button
            type="button"
            className="confirm-modal-button confirm-modal-button--cancel"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className={`confirm-modal-button confirm-modal-button--confirm ${
              danger ? "confirm-modal-button--danger" : ""
            }`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

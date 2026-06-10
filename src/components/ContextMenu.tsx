import { createPortal } from "react-dom";

type Action = {
  label: string;
  onClick: () => void | Promise<void>;
  danger?: boolean;
};

type Props = {
  x: number;
  y: number;
  actions: Action[];
  onClose: () => void;
};

export default function ContextMenu({ x, y, actions, onClose }: Props) {
  console.log("ContextMenu rendering at:", { x, y, actions: actions.length });
  
  const menu = (
    <div
      style={{
        position: "fixed",
        top: `${y}px`,
        left: `${x}px`,
        background: "#1a1a1a",
        border: "1px solid #333",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0,0,0,.5)",
        zIndex: 9999,
        minWidth: "160px",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {actions.map((action) => (
        <button
          key={action.label}
          type="button"
          onClick={async () => {
            try {
              await action.onClick();
            } finally {
              onClose();
            }
          }}
          style={{
            width: "100%",
            padding: "12px 16px",
            border: "none",
            borderTop: "1px solid #333",
            background: "transparent",
            color: action.danger ? "#ff6b6b" : "#fff",
            fontSize: "13px",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(menu, document.body);
}

type StatusBannerProps = {
  isRunning: boolean;
  onToggle: () => Promise<void> | void;
};

export default function StatusBanner({
  isRunning,
  onToggle,
}: StatusBannerProps) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "8px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
        }}
      >
        <span
          style={{
            color: isRunning ? "#C8AA6E" : "#4AFF91",
            fontWeight: 600,
          }}
        >
          {isRunning ? "● Çalışıyor" : "● Hazır"}
        </span>

        <button
          onClick={onToggle}
          style={{
            padding: "12px 28px",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            background: isRunning ? "#e84040" : "#c89b3c",
            color: "white",
            fontWeight: 700,
          }}
        >
          {isRunning ? "DURDUR" : "BAŞLAT"}
        </button>
      </div>
    </div>
  );
}

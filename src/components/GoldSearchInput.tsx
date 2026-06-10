import "./GoldSearchInput.css";

interface GoldSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export default function GoldSearchInput({
  value,
  onChange,
  placeholder = "Ara..",
}: GoldSearchInputProps) {
  const active = value.length > 0;

  return (
    <div
      className={
        active
          ? "goldSearchInputWrapper goldSearchInputWrapper--active"
          : "goldSearchInputWrapper"
      }
    >
      <input
        className={
          active
            ? "goldSearchInput goldSearchInput--active"
            : "goldSearchInput"
        }
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );
}

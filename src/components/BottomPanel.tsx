import { useState } from "react";
import { useMods } from "../context/ModContext";
import "./BottomPanel.css";

export default function BottomPanel() {
  const [expanded, setExpanded] = useState(false);
  const { mods, removeMod } = useMods();

  return (
    <div
      className={`bottom-panel ${expanded ? "bottom-panel--expanded" : ""}`}
      style={{ height: expanded ? "170px" : "50px" }}
    >
      <div className="bottom-panel__header" onClick={() => setExpanded(!expanded)}>
        <div className="bottom-panel__heading">
          <span className="bottom-panel__toggle">{expanded ? "▼" : "▲"}</span>
          <span className="bottom-panel__title">Selected Mods</span>
          <span className="bottom-panel__count">({mods.length})</span>
        </div>
      </div>

      {expanded && (
        <div className="bottom-panel__cards">
          {mods.map((mod, index) => (
            <div
              key={`${mod.champion}-${mod.skinId}-${index}`}
              className="bottom-panel__card"
              style={{ backgroundImage: `url(${mod.splash})` }}
            >
              <button
                onClick={() => removeMod(mod.skinId)}
                className="bottom-panel__remove"
              >
                ✕
              </button>

              <div className="bottom-panel__overlay" />

              <div className="bottom-panel__card-info">
                <div>{mod.skinName}</div>
                <div>{mod.champion}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

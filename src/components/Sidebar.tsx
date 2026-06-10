import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import logo from "../assets/logo.png";

type SidebarMode = "wide" | "compact" | "auto";

type SidebarProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
};

export default function Sidebar({
  activeTab,
  onTabChange,
}: SidebarProps) {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [mode, setMode] = useState<SidebarMode>("wide");

  const items = [
    "Champions",
    "HUD",
    "Fonts",
    "Custom",
    "Settings",
  ];

  const topItems = items.filter((item) => item !== "Settings");
  const bottomItem = "Settings";

  const sidebarMode: SidebarMode = "auto";
  const compactMode = mode === "compact";

  useEffect(() => {
    const updateMode = () => {
      if (sidebarMode === "auto") {
        setMode(window.innerWidth >= 1400 ? "wide" : "compact");
      } else {
        setMode(sidebarMode);
      }
    };

    updateMode();
    window.addEventListener("resize", updateMode);

    return () => window.removeEventListener("resize", updateMode);
  }, [sidebarMode]);

  return (
    <div
      style={{
        width: mode === "compact" ? "90px" : "240px",
        transition: "width .45s ease",
        background: "linear-gradient(180deg,#111 0%,#0d0d0d 100%)",
        borderRight: "1px solid #222",
        padding: "20px",
        overflow: "visible",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div
        style={{
          marginBottom: "30px",
          paddingTop: "12px",
          paddingBottom: "24px",
          borderBottom: "1px solid #222",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <img
          src={logo}
          alt="4RzyCustom Logo"
          style={{
            width: compactMode ? "56px" : "120px",
            height: compactMode ? "56px" : "120px",
          }}
        />

        {!compactMode && (
          <h2
            style={{
              margin: "12px 0 0",
              fontSize: "22px",
              fontWeight: 800,
              color: "#ffffff",
              textAlign: "center",
            }}
          >
            4RzyCustom
          </h2>
        )}
      </div>

      {topItems.map((item) => {
        const compactMap: Record<string, string> = {
          Champions: "⚔",
          HUD: "UI",
          Fonts: "F",
          Custom: "📦",
          Settings: "⚙",
        };

        const content = compactMode ? compactMap[item] ?? item.charAt(0) : item;

        const compactTextStyle: CSSProperties = compactMode
          ? {
              fontSize: item === "HUD" ? "16px" : "22px",
              fontWeight: 700,
              color: "inherit",
              textAlign: "center",
              lineHeight: 1,
            }
          : {};

        return (
          <div
            key={item}
            onClick={() => onTabChange(item)}
            onMouseEnter={() => setHoveredItem(item)}
            onMouseLeave={() => setHoveredItem(null)}
            style={{
              padding: compactMode ? "12px 8px" : "14px 16px",
              borderRadius: "12px",
              marginBottom: "10px",
              cursor: "pointer",

              display: "flex",
              alignItems: "center",
              justifyContent: compactMode ? "center" : "flex-start",
              position: compactMode ? "relative" : "static",

              background:
                activeTab === item
                  ? "rgba(200,170,110,.12)"
                  : "transparent",

              border:
                activeTab === item
                  ? "1px solid rgba(200,170,110,.35)"
                  : "1px solid transparent",

              borderLeft:
                activeTab === item
                  ? "4px solid #C8AA6E"
                  : "4px solid transparent",

              color: activeTab === item ? "#ffffff" : "#9f9f9f",

              transition: "all .2s ease",
            }}
          >
            <span style={compactTextStyle}>{content}</span>

            {compactMode && (
              <div
                style={{
                  position: "absolute",
                  left: "100%",
                  marginLeft: "10px",
                  top: "50%",
                  transform:
                    hoveredItem === item
                      ? "translateY(-50%) translateX(0)"
                      : "translateY(-50%) translateX(-8px)",
                  opacity: hoveredItem === item ? 1 : 0,
                  transition: "all .35s ease",
                  background: "#161616",
                  border: "1px solid rgba(200,170,110,.35)",
                  borderRadius: "10px",
                  padding: "8px 12px",
                  color: "white",
                  whiteSpace: "nowrap",
                  boxShadow: "0 8px 25px rgba(0,0,0,.35)",
                  zIndex: 99999,
                  pointerEvents: "none",
                }}
              >
                {item}
              </div>
            )}
          </div>
        );
      })}

      <div
        key={bottomItem}
        onClick={() => onTabChange(bottomItem)}
        onMouseEnter={() => setHoveredItem(bottomItem)}
        onMouseLeave={() => setHoveredItem(null)}
        style={{
          marginTop: "auto",
          padding: compactMode ? "12px 8px" : "14px 16px",
          borderRadius: "12px",
          marginBottom: "10px",
          cursor: "pointer",

          display: "flex",
          alignItems: "center",
          justifyContent: compactMode ? "center" : "flex-start",
          position: compactMode ? "relative" : "static",

          background:
            activeTab === bottomItem
              ? "rgba(200,170,110,.12)"
              : "transparent",

          border:
            activeTab === bottomItem
              ? "1px solid rgba(200,170,110,.35)"
              : "1px solid transparent",

          borderLeft:
            activeTab === bottomItem
              ? "4px solid #C8AA6E"
              : "4px solid transparent",

          color: activeTab === bottomItem ? "#ffffff" : "#9f9f9f",

          transition: "all .2s ease",
        }}
      >
        <span
          style={
            compactMode
              ? {
                  fontSize: "22px",
                  fontWeight: 700,
                  color: "inherit",
                  textAlign: "center",
                  lineHeight: 1,
                }
              : {}
          }
        >
          {compactMode ? "⚙" : bottomItem}
        </span>

        {compactMode && (
          <div
            style={{
              position: "absolute",
              left: "100%",
              marginLeft: "10px",
              top: "50%",
              transform:
                hoveredItem === bottomItem
                  ? "translateY(-50%) translateX(0)"
                  : "translateY(-50%) translateX(-8px)",
              opacity: hoveredItem === bottomItem ? 1 : 0,
              transition: "all .35s ease",
              background: "#161616",
              border: "1px solid rgba(200,170,110,.35)",
              borderRadius: "10px",
              padding: "8px 12px",
              color: "white",
              whiteSpace: "nowrap",
              boxShadow: "0 8px 25px rgba(0,0,0,.35)",
              zIndex: 99999,
              pointerEvents: "none",
            }}
          >
            {bottomItem}
          </div>
        )}
      </div>
    </div>
  );
}
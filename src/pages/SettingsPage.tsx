import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import StatusBanner from "../components/StatusBanner";

export default function SettingsPage() {
  const [cslolHidden, setCslolHidden] = useState<boolean>(true);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const raw = (await invoke("read_settings")) as string;
        const parsed = JSON.parse(raw);
        setCslolHidden(Boolean(parsed.cslolHidden));
      } catch (err) {
        console.error(err);
      } finally {
        setLoaded(true);
      }
    };

    load();
  }, []);

  const toggle = async () => {
    try {
      const newVal = !cslolHidden;
      setCslolHidden(newVal);

      const content = JSON.stringify({ cslolHidden: newVal }, null, 2);

      await invoke("write_settings", { content });
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ flex: 1, padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
        <h1 style={{ fontSize: 32, margin: 0 }}>Settings</h1>
        <StatusBanner isRunning={false} onToggle={async () => {}} />
      </div>

      {!loaded ? (
        <div>Loading...</div>
      ) : (
        <div style={{ maxWidth: 640 }}>
          <div style={{ marginBottom: 12, fontWeight: 700 }}>CSLOL Manager Görünürlüğü</div>

          <label style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <input type="checkbox" checked={cslolHidden} onChange={toggle} />
            <span>CSLOL Manager'ı gizli başlat</span>
          </label>
        </div>
      )}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useMods } from "../context/ModContext";
import StatusBanner from "../components/StatusBanner";
import ConfirmModal from "../components/ConfirmModal";
import "./HUDPage.css";
import ContextMenu from "../components/ContextMenu";
import GoldSearchInput from "../components/GoldSearchInput";

export default function HUDPage() {
  const [hudMods, setHudMods] = useState<{
    id: string;
    name: string;
    path?: string;
  }[]>([]);
  const [selectedHud, setSelectedHud] = useState<{
    id: string;
    name: string;
    path?: string;
  } | null>(null);
  const [search, setSearch] = useState("");
  const [contextMenu, setContextMenu] = useState<
    | {
        x: number;
        y: number;
        mod: {
          id: string;
          name: string;
          path?: string;
        };
      }
    | null
  >(null);
  const [renameTarget, setRenameTarget] = useState<{
    id: string;
    name: string;
    path?: string;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    path?: string;
  } | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [modsLoaded, setModsLoaded] = useState(false);

  const filteredHudMods = useMemo(
    () =>
      hudMods.filter((hud) =>
        hud.name.toLowerCase().includes(search.toLowerCase())
      ),
    [hudMods, search]
  );

  const { mods, addMod } = useMods();

  const renameHud = async (
    hud: {
      id: string;
      name: string;
      path?: string;
    },
    newName: string
  ) => {
    if (!newName || newName === hud.name) return;

    try {
      await invoke("rename_custom_mod", {
        championName: null,
        modName: hud.id,
        newName,
        category: "hud",
      });

      setHudMods((prev) =>
        prev.map((item) =>
          item.id === hud.id
            ? { ...item, id: newName, name: newName }
            : item
        )
      );

      if (selectedHud?.id === hud.id) {
        setSelectedHud({ ...hud, id: newName, name: newName });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteHud = async (hud: {
    id: string;
    name: string;
    path?: string;
  }) => {
    try {
      await invoke("delete_custom_mod", {
        championName: null,
        modName: hud.id,
        category: "hud",
      });

      setHudMods((prev) =>
        prev.filter((item) => item.id !== hud.id)
      );

      if (selectedHud?.id === hud.id) {
        setSelectedHud(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openRenameHud = (hud: { id: string; name: string; path?: string }) => {
    setRenameTarget(hud);
    setRenameValue(hud.name);
    setContextMenu(null);
  };

  const openDeleteHud = (hud: { id: string; name: string; path?: string }) => {
    setDeleteTarget(hud);
    setContextMenu(null);
  };

  const confirmRenameHud = async () => {
    if (!renameTarget) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === renameTarget.name) {
      setRenameTarget(null);
      return;
    }

    await renameHud(renameTarget, trimmed);
    setRenameTarget(null);
  };

  const confirmDeleteHud = async () => {
    if (!deleteTarget) return;
    await deleteHud(deleteTarget);
    setDeleteTarget(null);
  };
  const [isRunning, setIsRunning] = useState(false);
  const [hoveredHudId, setHoveredHudId] = useState<string | null>(null);

  const installHud = () => {
    if (!selectedHud) return;

    (async () => {
      try {
        const installed = (await invoke("custom_mod_installed", {
          modName: selectedHud.name,
        })) as boolean;

        let installedName = selectedHud.name;

        if (!installed) {
          installedName = (await invoke("install_custom_mod", {
            fantomePath: selectedHud.path ?? "",
          })) as string;
        }

        addMod(
          "HUD",
          selectedHud.id,
          selectedHud.name,
          installedName,
          "",
          "hud"
        );
      } catch (err) {
        console.error(err);
      } finally {
        setSelectedHud(null);
      }
    })();
  };

  const toggleRun = async () => {
    try {
      if (isRunning) {
        await invoke("stop_cslol");

        setIsRunning(false);

        return;
      }

      if (mods.length === 0) {
        alert("En az bir mod seçmelisiniz.");

        return;
      }

      const profileMods = mods.map((mod) => mod.installedName);

      await invoke("write_profile", {
        mods: profileMods,
      });

      await invoke("launch_cslol");

      setTimeout(async () => {
        const running = (await invoke(
          "is_cslol_running"
        )) as boolean;

        setIsRunning(running);
      }, 1000);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const loadHudMods = async () => {
      try {
        const mods = (await invoke("get_custom_mods", {
          category: "hud",
        })) as Array<{ name: string; path: string }>;

        setHudMods(
          mods.map((m) => ({ id: m.name, name: m.name, path: m.path }))
        );
      } catch {
        setHudMods([]);
      } finally {
        setModsLoaded(true);
      }
    };

    loadHudMods();
  }, []);

  useEffect(() => {
    const refreshStatus = async () => {
      try {
        const running = (await invoke(
          "is_cslol_running"
        )) as boolean;

        setIsRunning(running);
      } catch {}
    };

    refreshStatus();

    const interval = setInterval(refreshStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      <div style={{ flex: 1, padding: 20 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "25px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <h1 style={{ fontSize: 32, marginBottom: 0 }}>HUD</h1>

            <GoldSearchInput
              value={search}
              onChange={setSearch}
              placeholder="HUD ara.."
            />

            <button
              onClick={async () => {
                try {
                  const path = await invoke("pick_fantome_file");
                  if (!path) return;

                  const fileName = String(path)
                    .split("\\")
                    .pop()
                    ?.replace(/\.fantome$/i, "");

                  if (!fileName) return;

                  const savedPath = (await invoke("save_custom_mod", {
                    sourcePath: path,
                    championName: fileName,
                    category: "hud",
                  })) as string;

                  setHudMods((prev) => [
                    ...prev,
                    { id: fileName, name: fileName, path: savedPath },
                  ]);
                } catch (err) {
                  console.error(err);
                }
              }}
              style={{
                width: 140,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.06)",
                background: "#151515",
                color: "#d4aa4c",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              + HUD Ekle
            </button>
          </div>

          <StatusBanner
            isRunning={isRunning}
            onToggle={toggleRun}
          />
        </div>

        {modsLoaded && hudMods.length === 0 ? (
          <div
            style={{
              marginTop: 20,
              color: "#8f8f8f",
            }}
          >
            Mod bulunamadı.
            <br />
            Yeni bir mod eklemek için
            <br />
            "Ekle" butonunu kullanın.
          </div>
        ) : (
          <div className="hud-grid">
            {filteredHudMods.map((hud) => (
              <div
                key={hud.id}
                className={`hud-card ${
                  selectedHud?.id === hud.id ? "hud-card--selected" : ""
                } ${hoveredHudId === hud.id ? "hud-card--hovered" : ""}`}
                onClick={() => setSelectedHud(hud)}
                onMouseEnter={() => setHoveredHudId(hud.id)}
                onMouseLeave={() => setHoveredHudId(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    mod: hud,
                  });
                }}
              >
                <div className="hud-card__overlay" />
                <div className="hud-card__label">{hud.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedHud && (
        <button
          onClick={installHud}
          className="kur-button"
          style={{
            position: "fixed",
            right: 30,
            bottom: 100,
            width: 240,
            height: 64,
            zIndex: 1000,
          }}
        >
          KUR
        </button>
      )}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={() => setContextMenu(null)}
          actions={[
            {
              label: "Yeniden Adlandır",
              onClick: () => openRenameHud(contextMenu.mod),
            },
            {
              label: "Kaldır",
              danger: true,
              onClick: () => openDeleteHud(contextMenu.mod),
            },
          ]}
        />
      )}

      {renameTarget && (
        <ConfirmModal
          title="Mod ismini değiştir"
          description="Yeni ismi girip Kaydet'e bas."
          showInput
          inputLabel="Yeni isim"
          placeholder="Yeni isim"
          value={renameValue}
          onChange={setRenameValue}
          confirmLabel="Kaydet"
          cancelLabel="İptal"
          onConfirm={confirmRenameHud}
          onCancel={() => setRenameTarget(null)}
        />
      )}

      {deleteTarget && (
        <ConfirmModal
          title="Modu sil"
          description={`"${deleteTarget.name}" isimli modu silmek istediğine emin misin?`}
          confirmLabel="Sil"
          cancelLabel="İptal"
          danger
          onConfirm={confirmDeleteHud}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

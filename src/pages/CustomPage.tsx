import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useMods } from "../context/ModContext";
import StatusBanner from "../components/StatusBanner";
import ConfirmModal from "../components/ConfirmModal";
import "./HUDPage.css";
import ContextMenu from "../components/ContextMenu";
import GoldSearchInput from "../components/GoldSearchInput";

export default function CustomPage() {
  const [customMods, setCustomMods] = useState<{
    id: string;
    name: string;
    path?: string;
  }[]>([]);
  const [selectedCustom, setSelectedCustom] = useState<{
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

  const filteredCustomMods = useMemo(
    () =>
      customMods.filter((custom) =>
        custom.name.toLowerCase().includes(search.toLowerCase())
      ),
    [customMods, search]
  );

  const { mods, addMod } = useMods();

  const renameCustom = async (
    custom: {
      id: string;
      name: string;
      path?: string;
    },
    newName: string
  ) => {
    if (!newName || newName === custom.name) return;

    try {
      await invoke("rename_custom_mod", {
        championName: null,
        modName: custom.id,
        newName,
        category: "custom",
      });

      setCustomMods((prev) =>
        prev.map((item) =>
          item.id === custom.id
            ? { ...item, id: newName, name: newName }
            : item
        )
      );

      if (selectedCustom?.id === custom.id) {
        setSelectedCustom({ ...custom, id: newName, name: newName });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteCustom = async (custom: {
    id: string;
    name: string;
    path?: string;
  }) => {
    try {
      await invoke("delete_custom_mod", {
        championName: null,
        modName: custom.id,
        category: "custom",
      });

      setCustomMods((prev) =>
        prev.filter((item) => item.id !== custom.id)
      );

      if (selectedCustom?.id === custom.id) {
        setSelectedCustom(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openRenameCustom = (custom: { id: string; name: string; path?: string }) => {
    setRenameTarget(custom);
    setRenameValue(custom.name);
    setContextMenu(null);
  };

  const openDeleteCustom = (custom: { id: string; name: string; path?: string }) => {
    setDeleteTarget(custom);
    setContextMenu(null);
  };

  const confirmRenameCustom = async () => {
    if (!renameTarget) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === renameTarget.name) {
      setRenameTarget(null);
      return;
    }

    await renameCustom(renameTarget, trimmed);
    setRenameTarget(null);
  };

  const confirmDeleteCustom = async () => {
    if (!deleteTarget) return;
    await deleteCustom(deleteTarget);
    setDeleteTarget(null);
  };
  const [isRunning, setIsRunning] = useState(false);
  const [hoveredCustomId, setHoveredCustomId] = useState<string | null>(null);

  const installCustom = () => {
    if (!selectedCustom) return;
    (async () => {
      try {
        const installed = (await invoke("custom_mod_installed", {
          modName: selectedCustom.name,
        })) as boolean;

        let installedName = selectedCustom.name;

        if (!installed) {
          installedName = (await invoke("install_custom_mod", {
            fantomePath: selectedCustom.path ?? "",
          })) as string;
        }

        addMod(
          "Custom",
          selectedCustom.id,
          selectedCustom.name,
          installedName,
          "",
          "custom"
        );
      } catch (err) {
        console.error(err);
      } finally {
        setSelectedCustom(null);
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
    const loadCustomMods = async () => {
      try {
        const mods = (await invoke("get_custom_mods", {
          category: "custom",
        })) as Array<{ name: string; path: string }>;

        setCustomMods(mods.map((m) => ({ id: m.name, name: m.name, path: m.path })));
      } catch {
        setCustomMods([]);
      } finally {
        setModsLoaded(true);
      }
    };

    loadCustomMods();
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
            <h1 style={{ fontSize: 32, marginBottom: 0 }}>Custom</h1>

            <GoldSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Custom ara.."
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
                    category: "custom",
                  })) as string;

                  setCustomMods((prev) => [
                    ...prev,
                    { id: fileName, name: fileName, path: savedPath },
                  ]);
                } catch (err) {
                  console.error(err);
                }
              }}
              style={{
                width: 180,
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,.06)",
                background: "#151515",
                color: "#d4aa4c",
                cursor: "pointer",
                fontWeight: 700,
              }}
            >
              + Mod Ekle
            </button>
          </div>

          <StatusBanner
            isRunning={isRunning}
            onToggle={toggleRun}
          />
        </div>

        {modsLoaded && customMods.length === 0 ? (
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
            {filteredCustomMods.map((custom) => (
              <div
                key={custom.id}
                className={`hud-card ${
                  selectedCustom?.id === custom.id ? "hud-card--selected" : ""
                } ${hoveredCustomId === custom.id ? "hud-card--hovered" : ""}`}
                onClick={() => setSelectedCustom(custom)}
                onMouseEnter={() => setHoveredCustomId(custom.id)}
                onMouseLeave={() => setHoveredCustomId(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    mod: custom,
                  });
                }}
              >
                <div className="hud-card__overlay" />
                <div className="hud-card__label">{custom.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCustom && (
        <button
          onClick={installCustom}
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
              onClick: () => openRenameCustom(contextMenu.mod),
            },
            {
              label: "Kaldır",
              danger: true,
              onClick: () => openDeleteCustom(contextMenu.mod),
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
          onConfirm={confirmRenameCustom}
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
          onConfirm={confirmDeleteCustom}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

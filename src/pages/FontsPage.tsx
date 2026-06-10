import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useMods } from "../context/ModContext";
import StatusBanner from "../components/StatusBanner";
import ConfirmModal from "../components/ConfirmModal";
import "./HUDPage.css";
import ContextMenu from "../components/ContextMenu";
import GoldSearchInput from "../components/GoldSearchInput";

export default function FontsPage() {
  const [fontMods, setFontMods] = useState<{
    id: string;
    name: string;
    path?: string;
  }[]>([]);
  const [selectedFont, setSelectedFont] = useState<{
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

  const filteredFontMods = useMemo(
    () =>
      fontMods.filter((font) =>
        font.name.toLowerCase().includes(search.toLowerCase())
      ),
    [fontMods, search]
  );

  const { mods, addMod } = useMods();

  const renameFont = async (
    font: {
      id: string;
      name: string;
      path?: string;
    },
    newName: string
  ) => {
    if (!newName || newName === font.name) return;

    try {
      await invoke("rename_custom_mod", {
        championName: null,
        modName: font.id,
        newName,
        category: "fonts",
      });

      setFontMods((prev) =>
        prev.map((item) =>
          item.id === font.id
            ? { ...item, id: newName, name: newName }
            : item
        )
      );

      if (selectedFont?.id === font.id) {
        setSelectedFont({ ...font, id: newName, name: newName });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const deleteFont = async (font: {
    id: string;
    name: string;
    path?: string;
  }) => {
    try {
      await invoke("delete_custom_mod", {
        championName: null,
        modName: font.id,
        category: "fonts",
      });

      setFontMods((prev) =>
        prev.filter((item) => item.id !== font.id)
      );

      if (selectedFont?.id === font.id) {
        setSelectedFont(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openRenameFont = (font: { id: string; name: string; path?: string }) => {
    setRenameTarget(font);
    setRenameValue(font.name);
    setContextMenu(null);
  };

  const openDeleteFont = (font: { id: string; name: string; path?: string }) => {
    setDeleteTarget(font);
    setContextMenu(null);
  };

  const confirmRenameFont = async () => {
    if (!renameTarget) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === renameTarget.name) {
      setRenameTarget(null);
      return;
    }

    await renameFont(renameTarget, trimmed);
    setRenameTarget(null);
  };

  const confirmDeleteFont = async () => {
    if (!deleteTarget) return;
    await deleteFont(deleteTarget);
    setDeleteTarget(null);
  };
  const [isRunning, setIsRunning] = useState(false);
  const [hoveredFontId, setHoveredFontId] = useState<string | null>(null);

  const installFont = () => {
    if (!selectedFont) return;

    (async () => {
      try {
        const installed = (await invoke(
          "custom_mod_installed",
          { modName: selectedFont.name }
        )) as boolean;

        let installedName = selectedFont.name;

        if (!installed) {
          installedName = (await invoke("install_custom_mod", {
            fantomePath: selectedFont.path ?? "",
          })) as string;
        }

        addMod(
          "Font",
          selectedFont.id,
          selectedFont.name,
          installedName,
          "",
          "font"
        );
      } catch (err) {
        console.error(err);
      } finally {
        setSelectedFont(null);
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
    const loadFontMods = async () => {
      try {
        const mods = (await invoke("get_custom_mods", {
          category: "fonts",
        })) as Array<{ name: string; path: string }>;

        setFontMods(mods.map((m) => ({ id: m.name, name: m.name, path: m.path })));
      } catch {
        setFontMods([]);
      } finally {
        setModsLoaded(true);
      }
    };

    loadFontMods();
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
            <h1 style={{ fontSize: 32, marginBottom: 0 }}>Fonts</h1>

            <GoldSearchInput
              value={search}
              onChange={setSearch}
              placeholder="Font ara.."
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
                    category: "fonts",
                  })) as string;

                  setFontMods((prev) => [
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
              + Font Ekle
            </button>
          </div>

          <StatusBanner
            isRunning={isRunning}
            onToggle={toggleRun}
          />
        </div>

        {modsLoaded && fontMods.length === 0 ? (
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
            {filteredFontMods.map((font) => (
              <div
                key={font.id}
                className={`hud-card ${
                  selectedFont?.id === font.id ? "hud-card--selected" : ""
                } ${hoveredFontId === font.id ? "hud-card--hovered" : ""}`}
                onClick={() => setSelectedFont(font)}
                onMouseEnter={() => setHoveredFontId(font.id)}
                onMouseLeave={() => setHoveredFontId(null)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    mod: font,
                  });
                }}
              >
                <div className="hud-card__overlay" />
                <div className="hud-card__label">{font.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedFont && (
        <button
          onClick={installFont}
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
              onClick: () => openRenameFont(contextMenu.mod),
            },
            {
              label: "Kaldır",
              danger: true,
              onClick: () => openDeleteFont(contextMenu.mod),
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
          onConfirm={confirmRenameFont}
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
          onConfirm={confirmDeleteFont}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </>
  );
}

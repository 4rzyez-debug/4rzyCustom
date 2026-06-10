import { useEffect, useLayoutEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useMods } from "../context/ModContext";
import { getChampionSkins } from "../services/ddragon";
import type {
  Champion,
  SkinGroup,
} from "../services/ddragon";
import ConfirmModal from "./ConfirmModal";
import ContextMenu from "./ContextMenu";

type Props = {
  champion: Champion | null;
  open: boolean;
  onClose: () => void;
  onVisibleChange?: (visible: boolean) => void;
};

export default function SkinDrawer({
  champion,
  open,
  onClose,
  onVisibleChange,
}: Props) {
  const { addMod } = useMods();

  const [skins, setSkins] =
    useState<SkinGroup[]>([]);

  const [selectedSkin, setSelectedSkin] =
    useState<string>("");

  const [openedChromas, setOpenedChromas] =
    useState<string | null>(null);

  const [installing, setInstalling] =
    useState(false);

  type CustomSkin = {
    id: string;      // real filesystem name
    name: string;    // display name
    path: string;
    type: "champion";
  };

  const [customSkins, setCustomSkins] =
    useState<CustomSkin[]>([]);

  const [currentChampion, setCurrentChampion] =
    useState<Champion | null>(champion);

  const drawerChampion =
    champion ?? currentChampion;

  useEffect(() => {
    if (!drawerChampion) return;

    const loadCustomMods = async () => {
      try {
        const mods = (await invoke("get_custom_mods", {
          championName: drawerChampion.name,
        })) as Array<{
          id: string;
          name: string;
          path: string;
        }>;

        console.log("Custom mods loaded:", mods);

        setCustomSkins(
          mods.map((m) => ({
            id: m.id,
            name: m.name,
            path: m.path ?? "",
            type: "champion",
          }))
        );
      } catch (err) {
        console.error("Error loading custom mods:", err);
      }
    };

    loadCustomMods();
  }, [drawerChampion?.name]);

  const [selectedCustomSkin, setSelectedCustomSkin] =
    useState<string | null>(null);

  const [contextMenu, setContextMenu] =
    useState<
      | {
          x: number;
          y: number;
          custom: CustomSkin;
        }
      | null
    >(null);

  const [renameTarget, setRenameTarget] =
    useState<CustomSkin | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<CustomSkin | null>(null);
  const [renameValue, setRenameValue] =
    useState("");

  const [renderDrawer, setRenderDrawer] =
    useState(open);
  const [drawerVisible, setDrawerVisible] =
    useState(open);

  useEffect(() => {
    if (open && champion) {
      setCurrentChampion(champion);
    }
  }, [open, champion]);

  useLayoutEffect(() => {
    let rafId: number | undefined;
    let timeoutId: number | undefined;

    if (open) {
      setRenderDrawer(true);
      setDrawerVisible(false);
      onVisibleChange?.(false);

      rafId = window.requestAnimationFrame(() => {
        setDrawerVisible(true);
        onVisibleChange?.(true);
      });
    } else {
      setDrawerVisible(false);
      onVisibleChange?.(false);

      timeoutId = window.setTimeout(() => {
        setRenderDrawer(false);
      }, 550);
    }

    return () => {
      if (typeof rafId === "number") {
        window.cancelAnimationFrame(rafId);
      }
      if (typeof timeoutId === "number") {
        window.clearTimeout(timeoutId);
      }
    };
  }, [open]);

  const renameChampionCustomMod = async (
    custom: CustomSkin,
    newName: string
  ) => {
    if (!drawerChampion) return;
    if (!newName || newName === custom.name) return;

    try {
      console.log("Renaming:", custom.id, "->", newName);
      
      await invoke("rename_custom_mod", {
        championName: drawerChampion.name,
        modName: custom.id,      // Send real filesystem name
        newName,
        category: null,
      });

      setCustomSkins((prev) =>
        prev.map((skin) =>
          skin.id === custom.id
            ? { ...skin, name: newName }
            : skin
        )
      );

      if (selectedCustomSkin === custom.id) {
        setSelectedCustomSkin(custom.id);
      }
    } catch (err) {
      console.error("Rename error:", err);
      alert("Yeniden adlandırma başarısız: " + err);
    }
  };

  const deleteChampionCustomMod = async (
    custom: CustomSkin
  ) => {
    if (!drawerChampion) return;

    try {
      console.log("Deleting:", custom.id);
      
      await invoke("delete_custom_mod", {
        championName: drawerChampion.name,
        modName: custom.id,      // Send real filesystem name
        category: null,
      });

      setCustomSkins((prev) =>
        prev.filter((skin) => skin.id !== custom.id)
      );

      if (selectedCustomSkin === custom.id) {
        setSelectedCustomSkin(null);
      }
    } catch (err) {
      console.error("Delete error:", err);
      alert("Silme başarısız: " + err);
    }
  };

  const openRenameChampionCustomMod = (custom: CustomSkin) => {
    setRenameTarget(custom);
    setRenameValue(custom.name);
    setContextMenu(null);
  };

  const openDeleteChampionCustomMod = (custom: CustomSkin) => {
    setDeleteTarget(custom);
    setContextMenu(null);
  };

  const confirmRenameChampionCustomMod = async () => {
    if (!renameTarget) return;
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === renameTarget.name) {
      setRenameTarget(null);
      return;
    }

    await renameChampionCustomMod(renameTarget, trimmed);
    setRenameTarget(null);
  };

  const confirmDeleteChampionCustomMod = async () => {
    if (!deleteTarget) return;
    await deleteChampionCustomMod(deleteTarget);
    setDeleteTarget(null);
  };

  useEffect(() => {
    if (!drawerChampion) return;

    getChampionSkins(drawerChampion.id).then(
      (groups) => {
        setSkins(groups);

        setSelectedSkin("");
        setOpenedChromas(null);
      }
    );
  }, [drawerChampion]);

  if (!renderDrawer || !drawerChampion) return null;

  const drawerTransform = drawerVisible
    ? "translateX(0)"
    : "translateX(100%)";

  const parentSkin =
    skins.find(
      (skin) =>
        skin.id === selectedSkin ||
        skin.chromas.some(
          (c) => c.id === selectedSkin
        )
    );

  const selectedChromaData =
    skins
      .flatMap((skin) => skin.chromas)
      .find(
        (chroma) => chroma.id === selectedSkin
      );

  const selectedSkinName =
    selectedChromaData
      ? `${parentSkin?.name} (${selectedChromaData.name})`
      : parentSkin?.name ?? "Unknown";

  const selectedSplash =
    parentSkin?.splash ??
    drawerChampion.splash;

  async function handleInstall() {
    if (!drawerChampion) return;

    setInstalling(true);

    const selectedCustom =
      customSkins.find(
        (c) => c.id === selectedCustomSkin
      );

    try {
      if (selectedCustom) {
        const installed =
          await invoke(
            "custom_mod_installed",
            {
              modName:
                selectedCustom.id,
            }
          );

        let installedName =
          selectedCustom.id;

        if (!installed) {
          installedName =
            await invoke(
              "install_custom_mod",
              {
                fantomePath:
                  selectedCustom.path,
              }
            );
        }

        addMod(
          drawerChampion.name,
          `custom-${selectedCustom.id}`,
          selectedCustom.name,
          installedName,
          drawerChampion.splash,
          "custom"
        );

        return;
      }

      await invoke("download_skin", {
        championKey: drawerChampion.key,
        skinId: selectedSkin,
        parentSkinId:
          parentSkin?.id?.toString(),
      });

      const installedName =
        await invoke("extract_skin", {
          skinId: selectedSkin,
        });

      addMod(
        drawerChampion.name,
        selectedSkin,
        selectedSkinName,
        installedName as string,
        selectedSplash,
        "league"
      );
    } catch (err) {
      console.error(err);

      alert("Mevcut Değil");
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        width: "380px",
        background: "#101010",
        borderLeft: "1px solid #222",

        display: "flex",
        flexDirection: "column",

        transform: drawerTransform,
        transition: "transform .55s ease",
        boxShadow: "-20px 0 50px rgba(0,0,0,.35)",
        zIndex: 10,
      }}
      onClick={() => setContextMenu(null)}
    >
      {/* HEADER */}

      <div
        style={{
          padding: "20px",
          borderBottom: "1px solid #222",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                color: "#999",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Selected Champion
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 800,
                color: "white",
              }}
            >
              {drawerChampion.name}
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "#222",
              color: "white",
              borderRadius: "8px",
              width: "40px",
              height: "40px",
              cursor: "pointer",
            }}
          >
            X
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px",
        }}
      >
        {skins.map((skin) => {
          const skinSelected =
            selectedSkin === skin.id ||
            skin.chromas.some(
              (c) =>
                c.id === selectedSkin
            );

          return (
            <div
              key={skin.id}
              style={{
                marginBottom: "14px",
              }}
            >
              {/* SKIN CARD */}

              <div
                onClick={() => {
                  setSelectedSkin(skin.id);
                  setSelectedCustomSkin(null);
                  setOpenedChromas(null);
                }}
                style={{
                  height: "120px",

                  borderRadius: "12px",

                  overflow: "hidden",

                  position: "relative",

                  cursor: "pointer",

                  border: skinSelected
                    ? "2px solid #3fb950"
                    : "2px solid #2a2a2a",

                  boxShadow: skinSelected
                    ? "0 0 20px rgba(63,185,80,.35)"
                    : "none",

                  transform: skinSelected
                    ? "scale(1.02)"
                    : "scale(1)",

                  transition: "all .2s ease",

                  backgroundImage: `url(${skin.splash})`,
                  backgroundSize: "cover",
                  backgroundPosition:
                    "center",
                }}
              >
                <div
                  style={{
                    position:
                      "absolute",

                    inset: 0,

                    background:
                      "linear-gradient(to top, rgba(0,0,0,.95), rgba(0,0,0,.05))",
                  }}
                />

                <div
                  style={{
                    position:
                      "absolute",

                    bottom: "12px",
                    left: "12px",

                    color: "white",

                    fontWeight: 800,
                    fontSize: "22px",
                    textShadow:
                      "0 2px 12px rgba(0,0,0,.8)",
                  }}
                >
                  {skin.name}
                </div>

                {/* CHROMAS BUTTON */}

                {skin.chromas.length >
                  0 && (
                  <button
                    onClick={(
                      e
                    ) => {
                      e.stopPropagation();

                      setOpenedChromas(
                        openedChromas ===
                          skin.id
                          ? null
                          : skin.id
                      );
                    }}
                    style={{
                      position: "absolute",

                      top: "12px",
                      right: "12px",

                      padding: "8px 14px",

                      borderRadius: "999px",

                      border:
                        "1px solid rgba(255,255,255,.12)",

                      background:
                        "rgba(0,0,0,.35)",

                      backdropFilter: "blur(8px)",

                      color: "white",

                      fontSize: "12px",
                      fontWeight: 600,

                      cursor: "pointer",
                    }}
                  >
                    Chromas →
                  </button>
                )}
              </div>

              {/* CHROMAS PANEL */}

              {openedChromas ===
                skin.id &&
                skin.chromas.length >
                  0 && (
                  <div
                    style={{
                      marginTop:
                        "8px",

                      border:
                        "2px solid #2a2a2a",

                      borderRadius:
                        "12px",

                      background:
                        "#151515",

                      padding:
                        "16px",

                      display:
                        "flex",

                      flexWrap:
                        "wrap",

                      gap: "8px",
                    }}
                  >
                    {skin.chromas.map(
                      (
                        chroma
                      ) => (
                        <button
                          key={
                            chroma.id
                          }
                          onClick={() => {
                            setSelectedSkin(
                              chroma.id
                            );
                            setSelectedCustomSkin(null);
                          }}
                          style={{
                            padding:
                              "10px 16px",
                            borderRadius:
                              "999px",
                            fontSize:
                              "13px",
                            fontWeight:
                              600,
                            cursor:
                              "pointer",
                            border:
                              selectedSkin ===
                              chroma.id
                                ? "2px solid #3fb950"
                                : "1px solid #444",
                            background:
                              selectedSkin ===
                              chroma.id
                                ? "#1d4026"
                                : "#222",
                            color:
                              "white",
                            transform:
                              selectedSkin ===
                              chroma.id
                                ? "scale(1.02)"
                                : "scale(1)",
                            transition: "all .2s ease",
                          }}
                        >
                          {
                            chroma.name
                          }
                        </button>
                      )
                    )}
                  </div>
                )}
            </div>
          );
        })}

        {/* CUSTOM */}

        <div
          style={{
            marginTop: "20px",
          }}
        >
          <div
            style={{
              fontSize: "12px",
              letterSpacing: "1px",
              color: "#999",
              textTransform: "uppercase",
              fontWeight: 700,
              marginBottom: "12px",
            }}
          >
            Custom {customSkins.length > 0 ? `(${customSkins.length})` : ""}
          </div>

          {/* CUSTOM EKLE */}

          <button
            onClick={async () => {
              try {
                const path =
                  await invoke(
                    "pick_fantome_file"
                  );

                if (!path) return;

                const savedPath =
                  await invoke(
                    "save_custom_mod",
                    {
                      sourcePath: path,
                      championName:
                        drawerChampion.name,
                    }
                  );

                const fileName =
                  String(path)
                    .split("\\")
                    .pop()
                    ?.replace(
                      /\.fantome$/i,
                      ""
                    );

                if (!fileName) return;

                setCustomSkins((prev) => [
                  ...prev,
                  {
                    id: fileName,
                    name: fileName,
                    path: String(savedPath),
                    type: "champion",
                  },
                ]);
              } catch {}
            }}
            style={{
              width: "100%",

              height: "68px",

              borderRadius: "14px",

              overflow: "hidden",

              position: "relative",

              cursor: "pointer",

              marginBottom: "12px",

              border: "1px solid rgba(212,170,76,.35)",
              background: "linear-gradient(135deg,#171717,#232323)",
              color: "#ffffff",
              boxShadow: "0 2px 16px rgba(0,0,0,.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "all .2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.border =
                "1px solid rgba(212,170,76,.6)";

              e.currentTarget.style.boxShadow =
                "0 0 20px rgba(212,170,76,.15)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.border =
                "1px solid rgba(255,255,255,.08)";

              e.currentTarget.style.boxShadow =
                "none";
            }}
          >
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
              }}
            >
              + Custom Skin Yükle
            </div>
          </button>

          {customSkins.map((custom) => (
            <button
              key={custom.id}
              onClick={() => {
                setSelectedCustomSkin(
                  custom.id
                );
                setSelectedSkin("");
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                console.log("Right-clicked on:", custom.name);
                setContextMenu({
                  x: e.clientX,
                  y: e.clientY,
                  custom,
                });
              }}
              style={{
                width: "100%",
                minHeight: "66px",
                borderRadius: "14px",
                border:
                  selectedCustomSkin === custom.id
                    ? "2px solid #22c55e"
                    : "1px solid rgba(255,255,255,.14)",
                boxShadow:
                  selectedCustomSkin === custom.id
                    ? "0 0 16px rgba(34,197,94,.20)"
                    : "0 2px 10px rgba(0,0,0,.22)",
                transform:
                  selectedCustomSkin === custom.id
                    ? "scale(1.02)"
                    : "scale(1)",
                transition: "all .2s ease",
                background:
                  "linear-gradient(135deg,#1b1b1b,#262626)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                paddingLeft: "18px",
                marginBottom: "10px",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontSize: "14px",
                  fontWeight: 700,
                }}
              >
                {custom.name}
              </div>
            </button>
          ))}

          {contextMenu && (
            <ContextMenu
              x={contextMenu.x}
              y={contextMenu.y}
              onClose={() => setContextMenu(null)}
              actions={[
                {
                  label: "Yeniden Adlandır",
                  onClick: () =>
                    openRenameChampionCustomMod(
                      contextMenu.custom
                    ),
                },
                {
                  label: "Kaldır",
                  danger: true,
                  onClick: () =>
                    openDeleteChampionCustomMod(
                      contextMenu.custom
                    ),
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
              onConfirm={confirmRenameChampionCustomMod}
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
              onConfirm={confirmDeleteChampionCustomMod}
              onCancel={() => setDeleteTarget(null)}
            />
          )}
        </div>
      </div>

      {/* KUR BUTTON */}

      <div
        style={{
          padding: "16px",
          borderTop: "1px solid #222",
        }}
      >
        <button
          onClick={handleInstall}
          style={{
            width: "100%",

            padding: "16px",

            border: "none",

            borderRadius: "10px",

            cursor: "pointer",

            background:
              "linear-gradient(135deg,#c89b3c,#f0e6d2)",
            color: "#111",
            boxShadow:
              "0 0 20px rgba(200,155,60,.25)",

            fontWeight: 700,

            fontSize: "16px",
          }}
        >
          {
            installing
              ? "Kuruluyor..."
              : "Kur"
          }
        </button>
      </div>
    </div>
  );
}
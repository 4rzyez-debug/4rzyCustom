import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import SkinDrawer from "../components/SkinDrawer";
import StatusBanner from "../components/StatusBanner";
import { useMods } from "../context/ModContext";
import { getChampions } from "../services/ddragon";
import type { Champion } from "../services/ddragon";
import "./Champions.css";

export default function Champions() {
  const [champions, setChampions] = useState<Champion[]>([]);
  const [search, setSearch] = useState("");

  const [selectedChampion, setSelectedChampion] =
    useState<Champion | null>(null);

  const [drawerOpen, setDrawerOpen] =
    useState(false);

  const [hoveredChampionId, setHoveredChampionId] =
    useState<string | null>(null);
  const [drawerVisible, setDrawerVisible] =
    useState(false);

  const [customSkinCounts, setCustomSkinCounts] =
    useState<Record<string, number>>({});

  const { mods } = useMods();
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    getChampions().then(setChampions);
  }, []);

  useEffect(() => {
    const refreshStatus = async () => {
      try {
        const running = await invoke<boolean>(
          "is_cslol_running"
        );

        setIsRunning(running);
      } catch {}
    };

    refreshStatus();

    const interval = setInterval(refreshStatus, 2000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadCustomCounts = async () => {
      try {
        const counts = (await invoke<
          Array<{ champion_name: string; count: number }>
        >("get_custom_champion_counts")) || [];

        setCustomSkinCounts(
          counts.reduce(
            (acc, item) => {
              acc[item.champion_name] = item.count;
              return acc;
            },
            {} as Record<string, number>
          )
        );
      } catch {
        setCustomSkinCounts({});
      }
    };

    loadCustomCounts();
  }, []);

  const filteredChampions = useMemo(() => {
    return champions.filter((champion) =>
      champion.name
        .toLowerCase()
        .includes(search.toLowerCase())
    );
  }, [champions, search]);

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          flex: 1,
          padding: "20px",
          overflowY: "auto",
          marginRight: drawerVisible ? "380px" : "0",
          transition: "margin-right .55s ease",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: "25px",
          }}
        >
          <div>
            <h1
              style={{
                fontSize: "42px",
                marginBottom: "10px",
              }}
            >
              Champions
            </h1>

            <div
              className={
                search.length > 0
                  ? "searchInputWrapper searchInputWrapper--active"
                  : "searchInputWrapper"
              }
            >
              <input
                className={
                  search.length > 0
                    ? "searchInput searchInput--active"
                    : "searchInput"
                }
                value={search}
                onChange={(e) =>
                  setSearch(e.target.value)
                }
                placeholder="Şampiyon ara.."
              />
            </div>
          </div>

          <StatusBanner
            isRunning={isRunning}
            onToggle={async () => {
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

                const profileMods = mods.map(
                  (mod) => mod.installedName
                );

                await invoke("write_profile", {
                  mods: profileMods,
                });

                await invoke("launch_cslol");

                setTimeout(async () => {
                  const running = await invoke<boolean>(
                    "is_cslol_running"
                  );

                  setIsRunning(running);
                }, 1000);
              } catch (err) {
                console.error(err);
              }
            }}
          />
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fill, minmax(250px, 1fr))",
            gap: "16px",
          }}
        >
          {filteredChampions.map((champion) => (
            <div
              key={champion.id}
              className={`champion-card ${
                selectedChampion?.id === champion.id && drawerOpen
                  ? "champion-card--selected"
                  : ""
              } ${
                hoveredChampionId === champion.id
                  ? "champion-card--hovered"
                  : ""
              }`}
              onClick={() => {
                setSelectedChampion(champion);
                setDrawerOpen(true);
              }}
              onMouseEnter={() =>
                setHoveredChampionId(champion.id)
              }
              onMouseLeave={() => setHoveredChampionId(null)}
              style={{
                height: "170px",
                borderRadius: "14px",
                overflow: "hidden",
                cursor: "pointer",
                position: "relative",

                backgroundImage: `url(${champion.splash})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  background:
                    "linear-gradient(to top, rgba(0,0,0,.95), rgba(0,0,0,.3), rgba(0,0,0,.1))",
                }}
              />

              <div
                style={{
                  position: "absolute",
                  bottom: "14px",
                  left: "14px",
                }}
              >
                <div
                  style={{
                    fontSize: "18px",
                    fontWeight: 700,
                  }}
                >
                  {champion.name}
                </div>

                <div
                  style={{
                    opacity: 0.7,
                    fontSize: "13px",
                    marginTop: "4px",
                  }}
                >
                  ({customSkinCounts[champion.name] ?? 0})
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <SkinDrawer
        champion={selectedChampion}
        open={drawerOpen}
        onClose={() => {
          setDrawerOpen(false);
          setSelectedChampion(null);
          setHoveredChampionId(null);
        }}
        onVisibleChange={setDrawerVisible}
      />
    </div>
  );
}

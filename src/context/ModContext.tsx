import {
  createContext,
  useContext,
  useState,
} from "react";
import type { ReactNode } from "react";

export interface SelectedMod {
  champion: string;

  skinId: string;

  skinName: string;

  installedName: string;

  splash: string;
  type: "league" | "custom" | "hud" | "font";
}

interface ModContextType {
  mods: SelectedMod[];

  addMod: (
    champion: string,
    skinId: string,
    skinName: string,
    installedName: string,
    splash: string,
    type?: "league" | "custom" | "hud" | "font"
  ) => void;

  removeMod: (
    skinId: string
  ) => void;
}

const ModContext =
  createContext<ModContextType | null>(null);

export function ModProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [mods, setMods] = useState<SelectedMod[]>([]);

  const addMod = (
    champion: string,
    skinId: string,
    skinName: string,
    installedName: string,
    splash: string,
    type: "league" | "custom" | "hud" | "font" = "league"
  ) => {
    const exists = mods.find(
      (m) =>
        m.champion === champion &&
        m.skinId === skinId
    );

    if (exists) return;

    setMods((prev) => [
      ...prev,
      {
        champion,
        skinId,
        skinName,
        installedName,
        splash,
        type,
      },
    ]);
  };

  const removeMod = (
    skinId: string
  ) => {
    setMods((prev) =>
      prev.filter(
        (m) => m.skinId !== skinId
      )
    );
  };

  return (
    <ModContext.Provider value={{ mods, addMod, removeMod }}>
      {children}
    </ModContext.Provider>
  );
}

export function useMods() {
  const context =
    useContext(ModContext);

  if (!context)
    throw new Error(
      "useMods must be inside ModProvider"
    );

  return context;
}

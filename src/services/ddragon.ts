export interface Champion {
  id: string;
  key: string;

  name: string;
  title: string;

  image: string;
  splash: string;

  skinCount: number;
}

export async function getChampions(): Promise<Champion[]> {
  const response = await fetch(
    "https://ddragon.leagueoflegends.com/cdn/15.12.1/data/tr_TR/champion.json"
  );

  const json = await response.json();

  return Object.values(
    json.data as Record<string, any>
  ).map((champion: any) => {
    const skins = Array.isArray(champion.skins)
      ? champion.skins
      : [];

    const baseSkinCount = skins.filter(
      (skin: any) => !skin.parentSkin
    ).length;

    return {
      id: champion.id,
      key: champion.key,

      name: champion.name,
      title: champion.title,

      image: `https://ddragon.leagueoflegends.com/cdn/15.12.1/img/champion/${champion.image.full}`,

      splash: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${champion.id}_0.jpg`,

      skinCount: baseSkinCount,
    };
  });
}

export interface Chroma {
  id: string;
  name: string;
  parentSkin: number;
}

export interface SkinGroup {
  id: string;
  name: string;
  splash: string;
  chromas: Chroma[];
}

export async function getChampionSkins(
  championId: string
): Promise<SkinGroup[]> {
  const response = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/16.11.1/data/tr_TR/champion/${championId}.json`
  );

  const json = await response.json();

  const champion = json.data[championId];

  const skins = champion.skins;

  const groups: SkinGroup[] = [];

  skins.forEach((skin: any) => {
    if (skin.parentSkin) return;

    groups.push({
      id: skin.id,
      name:
        skin.name === "default"
          ? champion.name
          : skin.name,
      splash: `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${championId}_${skin.num}.jpg`,
      chromas: [],
    });
  });

  skins.forEach((skin: any) => {
    if (!skin.parentSkin) return;

    const parent = groups.find(
      (g) =>
        Number(g.id) ===
        Number(
          `${champion.key}${String(
            skin.parentSkin
          ).padStart(3, "0")}`
        )
    );

    if (!parent) return;

    const chromaName =
      skin.name.match(/\((.*?)\)/)?.[1] ??
      skin.name;

    parent.chromas.push({
      id: skin.id,
      name: chromaName,
      parentSkin: skin.parentSkin,
    });
  });

  return groups;
}
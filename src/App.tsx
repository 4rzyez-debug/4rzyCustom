import { useEffect, useState } from "react";
import {
  getCurrentWindow,
  LogicalPosition,
  LogicalSize,
} from "@tauri-apps/api/window";
import Sidebar from "./components/Sidebar";
import BottomPanel from "./components/BottomPanel";
import Champions from "./pages/Champions";
import HUDPage from "./pages/HUDPage";
import FontsPage from "./pages/FontsPage";
import CustomPage from "./pages/CustomPage";
import SettingsPage from "./pages/SettingsPage";

function App() {
  const [activeTab, setActiveTab] = useState("Champions");
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    const windowStateKey = "4rzycustom-window-state";
    const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
    if (!isTauri) {
      return;
    }

    const currentWindow = getCurrentWindow();
    const saveWindowState = async () => {
      try {
        const size = await currentWindow.innerSize();
        const position = await currentWindow.outerPosition();
        localStorage.setItem(
          windowStateKey,
          JSON.stringify({
            width: size.width,
            height: size.height,
            x: position.x,
            y: position.y,
          }),
        );
      } catch (error) {
        console.error("Failed to save window state:", error);
      }
    };

    const restoreWindowState = async () => {
      try {
        const rawState = localStorage.getItem(windowStateKey);
        if (!rawState) {
          return;
        }
        const state = JSON.parse(rawState);
        if (typeof state.width === "number" && typeof state.height === "number") {
          await currentWindow.setSize(new LogicalSize(state.width, state.height));
        }
        if (typeof state.x === "number" && typeof state.y === "number") {
          await currentWindow.setPosition(new LogicalPosition(state.x, state.y));
        }
      } catch (error) {
        console.error("Failed to restore window state:", error);
      }
    };

    restoreWindowState();

    const updateMaximizeState = async () => {
      try {
        setIsMaximized(await currentWindow.isMaximized());
      } catch (error) {
        console.error("Failed to get maximize state:", error);
      }
    };

    updateMaximizeState();

    let unlistenResize: undefined | (() => void | Promise<void>) = undefined;
    let unlistenMove: undefined | (() => void | Promise<void>) = undefined;

    currentWindow.onResized(async () => {
      await saveWindowState();
      await updateMaximizeState();
    }).then((unlisten) => {
      unlistenResize = unlisten;
    });
    currentWindow.onMoved(saveWindowState).then((unlisten) => {
      unlistenMove = unlisten;
    });

    window.addEventListener("beforeunload", saveWindowState);

    return () => {
      if (unlistenResize) {
        unlistenResize();
      }
      if (unlistenMove) {
        unlistenMove();
      }
      window.removeEventListener("beforeunload", saveWindowState);
    };
  }, []);

  const handleMinimize = async () => {
    console.log("window-control: minimize clicked");
    try {
      const currentWindow = await getCurrentWindow();
      await currentWindow.minimize();
      console.log("window-control: minimize succeeded");
    } catch (error) {
      console.error("window-control: minimize failed", error);
    }
  };

  const handleMaximizeRestore = async () => {
    console.log("window-control: maximize/restore clicked", { isMaximized });
    try {
      const currentWindow = await getCurrentWindow();
      const isFullscreen = await currentWindow.isFullscreen();
      const isCurrentlyMaximized = await currentWindow.isMaximized();

      if (isFullscreen) {
        await currentWindow.setFullscreen(false);
        const maximizedAfter = await currentWindow.isMaximized();
        setIsMaximized(maximizedAfter);
      } else if (isCurrentlyMaximized) {
        await currentWindow.unmaximize();
        setIsMaximized(false);
      } else {
        await currentWindow.maximize();
        setIsMaximized(true);
      }

      console.log("window-control: maximize/restore succeeded", {
        isFullscreen,
        isCurrentlyMaximized,
      });
    } catch (error) {
      console.error("window-control: maximize/restore failed", error);
    }
  };

  const handleClose = async () => {
    console.log("window-control: close clicked");
    try {
      const currentWindow = await getCurrentWindow();
      await currentWindow.close();
      console.log("window-control: close succeeded");
    } catch (error) {
      console.error("window-control: close failed", error);
    }
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0d0d0d",
        color: "white",
        position: "relative",
      }}
    >
      <div className="topbar">
        <div className="topbar-left">
          <span className="app-title">4rzyCustom</span>
        </div>
        <div className="window-controls">
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleMinimize}
            aria-label="Minimize"
            title="Küçült"
          >
            −
          </button>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleMaximizeRestore}
            aria-label={isMaximized ? "Restore" : "Maximize"}
            title={isMaximized ? "Geri getir" : "Büyüt"}
          >
            {isMaximized ? "▣" : "□"}
          </button>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={handleClose}
            aria-label="Close"
            className="window-close"
            title="Kapat"
          >
            ×
          </button>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
        }}
      >
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />

        {activeTab === "Champions" && <Champions />}

        {activeTab === "HUD" && <HUDPage />}

        {activeTab === "Fonts" && <FontsPage />}

        {activeTab === "Custom" && <CustomPage />}

        {activeTab === "Settings" && <SettingsPage />}
      </div>

      <BottomPanel />
    </div>
  );
}

export default App;
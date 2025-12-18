import { useEffect, useRef, useState } from "react";
import "./App.css";

export default function App() {
  const iframeRef = useRef(null);
  const [ready, setReady] = useState(false);
  const [frames, setFrames] = useState(0);
  const [intervalMs, setIntervalMs] = useState(2000);
  const [windowSize, setWindowSize] = useState(1);

  useEffect(() => {
    function onMsg(ev) {
      const msg = ev.data || {};
      if (msg.type === "SCANS_READY") {
        setReady(true);
        setFrames(msg.frames || 0);
      }
    }
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  function post(msg) {
    iframeRef.current?.contentWindow?.postMessage(msg, "*");
  }

  function onIframeLoad() {
    // 先把 scans/poses 传进去（poses 默认 identity，只是预留接口）
    post({ type: "SET_SCANS_URL", url: "/scans.json" });
    post({ type: "SET_POSES_URL", url: "/poses.json" });
  }

  return (
    <div style={{ width: "100vw", height: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={() => post({ type: "PLAY" })} disabled={!ready}>Play</button>
        <button onClick={() => post({ type: "STOP" })} disabled={!ready}>Stop</button>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          interval(ms)
          <input
            type="number"
            value={intervalMs}
            min={100}
            step={100}
            onChange={(e) => setIntervalMs(parseInt(e.target.value || "2000", 10))}
            style={{ width: 100 }}
          />
          <button onClick={() => post({ type: "SET_INTERVAL", ms: intervalMs })} disabled={!ready}>
            Apply
          </button>
        </label>

        <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
          windowSize
          <input
            type="number"
            value={windowSize}
            min={1}
            step={1}
            onChange={(e) => setWindowSize(parseInt(e.target.value || "1", 10))}
            style={{ width: 60 }}
          />
          <button onClick={() => post({ type: "SET_WINDOW", n: windowSize })} disabled={!ready}>
            Apply
          </button>
        </label>

        <span style={{ opacity: 0.8 }}>frames: {frames}</span>

        <label style={{ marginLeft: 12, display: "flex", gap: 6, alignItems: "center" }}>
          Seek
          <input
            type="range"
            min="0"
            max={Math.max(0, frames - 1)}
            defaultValue="0"
            onChange={(e) => post({ type: "SEEK", i: parseInt(e.target.value, 10) })}
            disabled={!ready || frames <= 0}
            style={{ width: 240 }}
          />
        </label>
      </div>

      <div style={{ flex: 1 }}>
        <iframe
          ref={iframeRef}
          title="potree-player"
          src="/potree/player.html"
          onLoad={onIframeLoad}
          style={{ width: "100%", height: "100%", border: "none" }}
        />
      </div>
    </div>
  );
}

import { useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useDevice } from "./DeviceProvider";
import "./ViewerPage.css";

export default function ViewerPage() {
  const navigate = useNavigate();
  const iframeRef = useRef(null);
  const { conn } = useDevice();

  const scansUrl = useMemo(() => {
    const root = (conn?.httpRoot || "").replace(/\/$/, "");
    return root ? `${root}/scans.json` : "/scans.json";
  }, [conn?.httpRoot]);

  const posesUrl = useMemo(() => {
    const root = (conn?.httpRoot || "").replace(/\/$/, "");
    return root ? `${root}/poses.json` : "/poses.json";
  }, [conn?.httpRoot]);

  async function requestLandscape() {
    if (!screen?.orientation?.lock) return;
    try {
      if (!document.fullscreenElement && document.documentElement?.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
      await screen.orientation.lock("landscape");
    } catch (err) {
      console.warn("orientation lock failed", err);
    }
  }

  useEffect(() => {
    requestLandscape();

    function onMsg(ev) {
      const msg = ev.data || {};
      if (msg.type === "NAV_HOME") navigate("/");
    }

    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [navigate]);

  function onIframeLoad() {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      // ✅ 只在连接到设备时才加载scans.json和poses.json
      // 实时模式下不需要加载静态文件
      if (conn?.httpRoot) {
        iframe.contentWindow.postMessage({ type: "SET_SCANS_URL", url: scansUrl }, "*");
        iframe.contentWindow.postMessage({ type: "SET_POSES_URL", url: posesUrl }, "*");
      }

      // 传递WebSocket URL到iframe
      const wsUrl = conn?.wsUrl || localStorage.getItem("WS_URL") || "";
      if (wsUrl) {
        iframe.contentWindow.postMessage({ type: "SET_WS_URL", url: wsUrl }, "*");
      }
    }
  }

  return (
    <div className="viewer-page">
      <iframe
        ref={iframeRef}
        title="potree-viewer"
        src="/potree/player.html"
        onLoad={onIframeLoad}
        className="viewer-iframe"
      />
    </div>
  );
}

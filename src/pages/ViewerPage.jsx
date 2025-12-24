import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./ViewerPage.css";

export default function ViewerPage() {
  const navigate = useNavigate();
  const iframeRef = useRef(null);

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

    // 监听来自 player.html 的消息
    function onMsg(ev) {
      const msg = ev.data || {};
      if (msg.type === "NAV_HOME") {
        // 返回首页
        navigate("/");
      }
    }

    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, [navigate]);

  function onIframeLoad() {
    // iframe 加载完成后，发送点云数据路径
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({ type: "SET_SCANS_URL", url: "/scans.json" }, "*");
      iframe.contentWindow.postMessage({ type: "SET_POSES_URL", url: "/poses.json" }, "*");
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

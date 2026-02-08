import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDevice } from "./DeviceProvider";
import "./HomePage.css";

export default function HomePage() {
  const navigate = useNavigate();
  const [showMenu, setShowMenu] = useState(false);
  const { meta, conn, status } = useDevice();

  // 横屏模式
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

  const device = useMemo(() => {
    const online = !!conn?.connected && (status?.power ?? "ON") !== "OFF";
    const battery = online ? Number(status?.battery ?? 0) : 0;
    const used = online ? Number(status?.storageUsed ?? 0) : 0;
    const total = online ? Number(status?.storageTotal ?? 0) : 0;
    return {
      name: meta?.name || "X100",
      version: meta?.version || "0.0.1",
      code: meta?.code || "-",
      online,
      battery: Number.isFinite(battery) ? battery : 0,
      storageUsed: Number.isFinite(used) ? used : 0,
      storageTotal: Number.isFinite(total) ? total : 0,
    };
  }, [meta, conn, status]);

  const handleGoClick = async () => {
    await requestLandscape();
    navigate("/viewer");
  };

  const handleAddDevice = () => {
    setShowMenu(false);
    navigate("/add-device");
  };

  return (
    <div className="home-page">
      {/* 顶部导航栏 */}
      <header className="home-header">
        <button className="menu-btn">⋯</button>
        <h1 className="app-title">{device.name}</h1>
        <button className="add-btn" onClick={() => setShowMenu(!showMenu)}>
          ＋
        </button>
      </header>

      {/* 弹出菜单 */}
      {showMenu && (
        <div className="popup-menu">
          <div className="menu-item" onClick={handleAddDevice}>
            <span className="menu-icon">＋</span>
            <span className="menu-text">添加新设备</span>
          </div>
          <div className="menu-item" onClick={() => setShowMenu(false)}>
            <span className="menu-icon">📶</span>
            <span className="menu-text">桥接模式</span>
          </div>
          <div className="menu-item" onClick={() => setShowMenu(false)}>
            <span className="menu-icon">🔌</span>
            <span className="menu-text">USB连接</span>
          </div>
          <div className="menu-item" onClick={() => setShowMenu(false)}>
            <span className="menu-icon">⚡</span>
            <span className="menu-text">闪连模式</span>
          </div>
        </div>
      )}

      {/* 设备信息区域 */}
      <div className="device-info-section">
        <div className="device-image">
          <div className="device-placeholder">
            <div className="device-icon">📷</div>
          </div>
        </div>

        <div className="device-details">
          <div className="detail-item">
            <span className="detail-label">设备版本号</span>
            <span className="detail-value">{device.version}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">设备编码</span>
            <span className="detail-value">{device.code}</span>
          </div>

          <div className="detail-item">
            <span className="detail-label">设备状态</span>
            <span className={`detail-value ${device.online ? "status-online" : "status-offline"}`}>
              {device.online ? "设备在线" : "设备离线"}
            </span>
          </div>

          {/* 电池电量 */}
          <div className="battery-section">
            <div className="battery-bars">
              <div className={`battery-bar ${device.battery > 0 ? "active" : ""}`}></div>
              <div className={`battery-bar ${device.battery > 25 ? "active" : ""}`}></div>
              <div className={`battery-bar ${device.battery > 50 ? "active" : ""}`}></div>
              <div className={`battery-bar ${device.battery > 75 ? "active" : ""}`}></div>
            </div>
            <span className="battery-text">⚡ {device.battery}%</span>
          </div>

          {/* 存储空间 */}
          <div className="storage-section">
            <span className="storage-icon">💾</span>
            <span className="storage-text">
              {device.storageTotal > 0 ? `${device.storageUsed}/${device.storageTotal}GB` : "0GB"}
            </span>
          </div>
        </div>
      </div>

      {/* 功能卡片 */}
      <div className="function-cards">
        <div className="card">
          <div className="card-icon">💿</div>
          <div className="card-title">U盘模式</div>
        </div>

        <div className="card">
          <div className="card-icon">📡</div>
          <div className="card-title">ATK</div>
        </div>

        <div className="card">
          <div className="card-icon">⚙️</div>
          <div className="card-title">设置</div>
        </div>

        <div className="card">
          <div className="card-icon">☁️</div>
          <div className="card-title">点云数据</div>
        </div>
      </div>

      {/* GO 按钮 */}
      <button className="go-button" onClick={handleGoClick}>
        <span className="go-text">GO</span>
      </button>
    </div>
  );
}

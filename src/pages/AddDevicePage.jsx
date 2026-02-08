import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useDevice } from "./DeviceProvider";
import "./AddDevicePage.css";

export default function AddDevicePage() {
  const navigate = useNavigate();
  const { connectToDevice, error } = useDevice();

  const [step1Expanded] = useState(true);
  const [step2Expanded, setStep2Expanded] = useState(true);

  const [host, setHost] = useState(() => {
    const saved = localStorage.getItem("DEVICE_HTTP_ROOT");
    return saved ? saved.replace(/^https?:\/\//, "") : "192.168.1.23:8000";
  });

  const [account, setAccount] = useState("DAS");
  const [password, setPassword] = useState("das123");

  const [bluetoothStatus, setBluetoothStatus] = useState("未连接");
  const [networkStatus, setNetworkStatus] = useState("未连接");
  const [dataStatus, setDataStatus] = useState("未连接");

  const handleBluetoothScan = () => {
    setBluetoothStatus("搜索中...");
    setTimeout(() => setBluetoothStatus("已连接"), 1500);
  };

  const handleNetworkConnect = async () => {
    if (!host || !account || !password) {
      alert("请输入设备地址、账户和密码");
      return;
    }

    setNetworkStatus("连接中...");
    setDataStatus("未连接");

    try {
      await connectToDevice({ host, account, password });

      // 这里不强等电量推送，HomePage 会在收到 DEVICE_STATUS 后自动更新
      setNetworkStatus("已连接");
      setDataStatus("已连接");

      setTimeout(() => navigate("/"), 300);
    } catch (e) {
      setNetworkStatus("未连接");
      setDataStatus("未连接");
      alert(e?.message || "连接失败");
    }
  };

  return (
    <div className="add-device-page">
      <button className="back-button" onClick={() => navigate("/")}>← 返回</button>

      <div className="step-section">
        <div className="step-header">
          <h2 className="step-title">第一步：<br />连接设备蓝牙</h2>
          <button className="action-button" onClick={handleBluetoothScan} disabled={bluetoothStatus === "已连接"}>
            {bluetoothStatus === "已连接" ? "已连接" : "检索蓝牙"}
          </button>
        </div>

        {step1Expanded && (
          <div className="step-content">
            <div className="progress-bar">
              <div className={`progress-fill ${bluetoothStatus === "已连接" ? "complete" : ""}`}></div>
            </div>
            <p className="status-text">{bluetoothStatus}</p>
          </div>
        )}
      </div>

      <div className="step-section">
        <div className="step-header">
          <h2 className="step-title">第二步：<br />为设备配置网络</h2>
          <button className="action-button success" onClick={() => setStep2Expanded(!step2Expanded)}>点我查看</button>
        </div>

        {step2Expanded && (
          <div className="step-content">
            <div className="form-group">
              <label className="form-label">设备地址（IP:端口）</label>
              <input className="form-input" value={host} onChange={(e) => setHost(e.target.value)} placeholder="例如 192.168.1.23:8000" />
            </div>

            <div className="form-group">
              <label className="form-label">账户</label>
              <input className="form-input" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="例如 XiaoMi" />
            </div>

            <div className="form-group">
              <label className="form-label">密码</label>
              <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="例如 12345678" />
            </div>

            <button className="connect-button" onClick={handleNetworkConnect} disabled={networkStatus === "连接中..." || networkStatus === "已连接"}>
              {networkStatus === "连接中..." ? "连接中..." : (networkStatus === "已连接" ? "连接成功" : "开始配网")}
            </button>

            <div className="status-section">
              <div className="status-item">
                <span className="status-label">网络连接状态：</span>
                <span className={`status-value ${networkStatus === "已连接" ? "connected" : ""}`}>{networkStatus}</span>
              </div>
              <div className="status-item">
                <span className="status-label">数据连接状态：</span>
                <span className={`status-value ${dataStatus === "已连接" ? "connected" : ""}`}>{dataStatus}</span>
              </div>
              {!!error && (
                <div className="status-item">
                  <span className="status-label">错误：</span>
                  <span className="status-value">{error}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AddDevicePage.css";

export default function AddDevicePage() {
  const navigate = useNavigate();
  const [step1Expanded, setStep1Expanded] = useState(true);
  const [step2Expanded, setStep2Expanded] = useState(true);
  const [ssid, setSsid] = useState("XiaoMi");
  const [password, setPassword] = useState("12345678");
  const [bluetoothStatus, setBluetoothStatus] = useState("未连接");
  const [networkStatus, setNetworkStatus] = useState("未连接");
  const [dataStatus, setDataStatus] = useState("未连接");

  const handleBluetoothScan = () => {
    setBluetoothStatus("搜索中...");
    // 模拟搜索过程
    setTimeout(() => {
      setBluetoothStatus("已连接");
    }, 1500);
  };

  const handleNetworkConnect = () => {
    if (!ssid || !password) {
      alert("请输入网络名称和密码");
      return;
    }

    setNetworkStatus("连接中...");

    // 模拟连接过程
    setTimeout(() => {
      setNetworkStatus("已连接");
      setDataStatus("已连接");

      // 连接成功后返回首页
      setTimeout(() => {
        navigate("/");
      }, 1000);
    }, 2000);
  };

  const handleBack = () => {
    navigate("/");
  };

  return (
    <div className="add-device-page">
      {/* 返回按钮 */}
      <button className="back-button" onClick={handleBack}>
        ← 返回
      </button>

      {/* 第一步：连接蓝牙 */}
      <div className="step-section">
        <div className="step-header">
          <h2 className="step-title">
            第一步：<br />
            连接设备蓝牙
          </h2>
          <button
            className="action-button"
            onClick={handleBluetoothScan}
            disabled={bluetoothStatus === "已连接"}
          >
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

      {/* 第二步：配置网络 */}
      <div className="step-section">
        <div className="step-header">
          <h2 className="step-title">
            第二步：<br />
            为设备配置网络
          </h2>
          <button
            className="action-button success"
            onClick={() => setStep2Expanded(!step2Expanded)}
          >
            点我查看
          </button>
        </div>

        {step2Expanded && (
          <div className="step-content">
            <div className="form-group">
              <label className="form-label">网络名称</label>
              <input
                type="text"
                className="form-input"
                value={ssid}
                onChange={(e) => setSsid(e.target.value)}
                placeholder="请输入Wi-Fi名称"
              />
            </div>

            <div className="form-group">
              <label className="form-label">密码</label>
              <input
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入Wi-Fi密码"
              />
            </div>

            <button
              className="connect-button"
              onClick={handleNetworkConnect}
              disabled={networkStatus === "已连接"}
            >
              {networkStatus === "已连接" ? "连接成功" : "开始配网"}
            </button>

            <div className="status-section">
              <div className="status-item">
                <span className="status-label">网络连接状态：</span>
                <span className={`status-value ${networkStatus === "已连接" ? "connected" : ""}`}>
                  {networkStatus}
                </span>
              </div>

              <div className="status-item">
                <span className="status-label">数据连接状态：</span>
                <span className={`status-value ${dataStatus === "已连接" ? "connected" : ""}`}>
                  {dataStatus}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

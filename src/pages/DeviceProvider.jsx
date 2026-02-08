import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

const DeviceContext = createContext(null);

const LS = {
  httpRoot: "DEVICE_HTTP_ROOT",
  wsUrl: "DEVICE_WS_URL",
  token: "DEVICE_TOKEN",
  meta: "DEVICE_META",
  potreeWsUrl: "WS_URL",
};

const DEFAULT_META = {
  name: "X100",
  version: "0.0.1",
  code: "A259A88251",
};

const DEFAULT_STATUS = {
  power: "OFF",
  battery: 0,
  storageUsed: 0,
  storageTotal: 0,
};

const LOCAL_CREDENTIALS = {
  account: "DAS",
  password: "das123",
};

const AUTH_TIMEOUT_MS = 3000;
const STATUS_FALLBACK_DELAY_MS = 1500;
const STATUS_TICK_MS = 60_000;
const ENABLE_LOCAL_STATUS_SIMULATION = false;

function normalizeHttpRoot(host) {
  const h = (host || "").trim();
  if (!h) return "";
  if (h.startsWith("http://") || h.startsWith("https://")) return h;
  return `http://${h}`;
}

function buildWsUrlFromHttpRoot(httpRoot) {
  try {
    const u = new URL(httpRoot);
    const proto = u.protocol === "https:" ? "wss:" : "ws:";
    return `${proto}//${u.host}/ws`;
  } catch {
    return "";
  }
}

function safeJsonParse(s) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

export function DeviceProvider({ children }) {
  const wsRef = useRef(null);
  const authIdRef = useRef("");
  const authTimeoutRef = useRef(null);
  const statusLoopRef = useRef(null);
  const statusBootstrapRef = useRef(null);
  const lastStatusAtRef = useRef(0);
  const statusSourceRef = useRef("unknown");

  const [meta, setMeta] = useState(() => safeJsonParse(localStorage.getItem(LS.meta)) || DEFAULT_META);

  const [conn, setConn] = useState(() => ({
    httpRoot: localStorage.getItem(LS.httpRoot) || "",
    wsUrl: localStorage.getItem(LS.wsUrl) || "",
    token: localStorage.getItem(LS.token) || "",
    connected: false,
  }));

  const [status, setStatus] = useState(DEFAULT_STATUS);

  const [error, setError] = useState("");

  const stopLocalStatusLoop = useCallback(() => {
    if (statusLoopRef.current) {
      clearInterval(statusLoopRef.current);
      statusLoopRef.current = null;
    }
    if (statusBootstrapRef.current) {
      clearTimeout(statusBootstrapRef.current);
      statusBootstrapRef.current = null;
    }
  }, []);

  const startLocalStatusLoop = useCallback((seed) => {
    if (!ENABLE_LOCAL_STATUS_SIMULATION) return;
    if (statusLoopRef.current) return;
    statusSourceRef.current = "local";

    setStatus((prev) => ({
      power: seed?.power ?? prev.power ?? "ON",
      battery: Number.isFinite(seed?.battery) ? seed.battery : (Number.isFinite(prev.battery) ? prev.battery : 100),
      storageUsed: Number.isFinite(seed?.storageUsed) ? seed.storageUsed : (Number.isFinite(prev.storageUsed) ? prev.storageUsed : 128),
      storageTotal: Number.isFinite(seed?.storageTotal) ? seed.storageTotal : (Number.isFinite(prev.storageTotal) ? prev.storageTotal : 256),
    }));

    statusLoopRef.current = setInterval(() => {
      if (statusSourceRef.current !== "local") return;
      setStatus((prev) => {
        const battery = Math.max(0, (Number.isFinite(prev.battery) ? prev.battery : 100) - 1);
        const storageTotal = Number.isFinite(prev.storageTotal) && prev.storageTotal > 0 ? prev.storageTotal : 256;
        const storageUsed = Math.min(storageTotal, (Number.isFinite(prev.storageUsed) ? prev.storageUsed : 128) + 1);
        return {
          ...prev,
          power: prev.power || "ON",
          battery,
          storageUsed,
          storageTotal,
        };
      });
    }, STATUS_TICK_MS);
  }, []);

  const scheduleLocalStatusFallback = useCallback(() => {
    if (!ENABLE_LOCAL_STATUS_SIMULATION) return;
    if (statusBootstrapRef.current) clearTimeout(statusBootstrapRef.current);
    statusBootstrapRef.current = setTimeout(() => {
      if (Date.now() - lastStatusAtRef.current > STATUS_FALLBACK_DELAY_MS) {
        startLocalStatusLoop({ power: "ON", battery: 100, storageUsed: 128, storageTotal: 256 });
      }
    }, STATUS_FALLBACK_DELAY_MS);
  }, [startLocalStatusLoop]);

  const closeWs = useCallback(() => {
    const ws = wsRef.current;
    wsRef.current = null;
    if (authTimeoutRef.current) {
      clearTimeout(authTimeoutRef.current);
      authTimeoutRef.current = null;
    }
    stopLocalStatusLoop();
    if (ws) {
      try {
        ws.close();
      } catch {}
    }
  }, [stopLocalStatusLoop]);

  const applyDeviceStatus = useCallback(
    (msg) => {
      const device = msg.device || msg.meta || {};
      const statusMsg = msg.status || msg;

      setMeta((prev) => ({
        name: device.name ?? msg.name ?? prev.name,
        version: device.version ?? msg.version ?? prev.version,
        code: device.code ?? msg.code ?? prev.code,
      }));

      const battery = statusMsg.battery ?? msg.battery;
      const storageUsed = statusMsg.storageUsed ?? statusMsg.memoryUsed ?? msg.storageUsed ?? msg.memoryUsed;
      const storageTotal = statusMsg.storageTotal ?? statusMsg.memoryTotal ?? msg.storageTotal ?? msg.memoryTotal;
      const power = statusMsg.power ?? msg.power ?? "ON";

      setStatus((prev) => ({
        power: power ?? prev.power ?? "ON",
        battery: Number.isFinite(battery) ? battery : (Number.isFinite(prev.battery) ? prev.battery : 0),
        storageUsed: Number.isFinite(storageUsed) ? storageUsed : (Number.isFinite(prev.storageUsed) ? prev.storageUsed : 0),
        storageTotal: Number.isFinite(storageTotal) ? storageTotal : (Number.isFinite(prev.storageTotal) ? prev.storageTotal : 0),
      }));

      setConn((p) => ({ ...p, connected: true }));
      lastStatusAtRef.current = Date.now();
      statusSourceRef.current = "server";
      stopLocalStatusLoop();
    },
    [stopLocalStatusLoop]
  );

  const openWsHandshake = useCallback(
    (wsUrl, token, options = {}) => {
      closeWs();
      setError("");

      if (!wsUrl) {
        setError("WebSocket 地址为空");
        return;
      }

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      const mode = options.mode || (token ? "auth" : "direct");
      let readySent = false;

      const sendReady = () => {
        if (readySent || ws.readyState !== WebSocket.OPEN) return;
        readySent = true;
        setConn((p) => ({ ...p, connected: true }));
        try {
          ws.send(JSON.stringify({ type: "CLIENT_READY", id: `ready_${Date.now()}` }));
        } catch {}
        try {
          ws.send(JSON.stringify({ type: "GET_STATUS", id: `get_${Date.now()}` }));
        } catch {}
        scheduleLocalStatusFallback();
      };

      ws.onopen = () => {
        if (mode === "auth") {
          const id = `auth_${Date.now()}`;
          authIdRef.current = id;
          try {
            ws.send(JSON.stringify({ type: "WIFI_AUTH", id, token, client: "app" }));
          } catch {}
          if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = setTimeout(() => {
            sendReady();
          }, AUTH_TIMEOUT_MS);
        } else {
          sendReady();
        }
      };

      ws.onclose = () => {
        setConn((p) => ({ ...p, connected: false }));
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
        stopLocalStatusLoop();
      };

      ws.onerror = () => {
        setError("WebSocket 连接失败");
        setConn((p) => ({ ...p, connected: false }));
        if (authTimeoutRef.current) {
          clearTimeout(authTimeoutRef.current);
          authTimeoutRef.current = null;
        }
      };

      ws.onmessage = (ev) => {
        let msg = null;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }

        // ✅ 打开这行，你就能在手机端看到所有 WS 消息（包括 DEVICE_STATUS）
        // console.log("[WS] <=", msg);

        if (msg.type === "ACK" && msg.id === authIdRef.current) {
          if (!msg.ok) {
            setError("鉴权失败（token 无效/过期）");
            setConn((p) => ({ ...p, connected: false }));
            return;
          }
          // ✅ 你要求的“连接成功后客户端发信号”
          if (authTimeoutRef.current) {
            clearTimeout(authTimeoutRef.current);
            authTimeoutRef.current = null;
          }
          sendReady();
          return;
        }

        if (msg.type === "WIFI_READY") {
          setConn((p) => ({ ...p, connected: true }));
          // ✅ 兜底：拉一次状态（防止 DEVICE_STATUS 因连接抖动丢包）
          try {
            ws.send(JSON.stringify({ type: "GET_STATUS", id: `get_${Date.now()}` }));
          } catch {}
          scheduleLocalStatusFallback();
          return;
        }

        if (msg.type === "DEVICE_STATUS") {
          applyDeviceStatus(msg);
          return;
        }

        if (msg.type === "ERROR") {
          setError(msg.code || "ERROR");
        }

        if (msg.type === "PONG") {
          setConn((p) => ({ ...p, connected: true }));
        }
      };
    },
    [applyDeviceStatus, closeWs, scheduleLocalStatusFallback, stopLocalStatusLoop]
  );

  const connectToDevice = useCallback(
    async ({ host, account, password }) => {
      setError("");

      const httpRoot = normalizeHttpRoot(host);
      if (!httpRoot) throw new Error("请输入设备地址");

      let next = null;
      let deviceMeta = null;
      let mode = "auth";
      let apiUnavailable = false;

      try {
        const res = await fetch(`${httpRoot}/api/wifi/connect`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ account, password }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          if (res.status === 404 || res.status === 405) {
            apiUnavailable = true;
          } else {
            throw new Error(body?.error === "INVALID_CREDENTIALS" ? "账户或密码错误" : "连接失败");
          }
        } else {
          const body = await res.json();
          if (!body?.ok) throw new Error("连接失败");

          next = {
            httpRoot: body.httpRoot || httpRoot,
            wsUrl: body.wsUrl || "",
            token: body.token || "",
          };
          deviceMeta = body.device || null;
        }
      } catch (err) {
        if (err?.name === "TypeError") {
          apiUnavailable = true;
        } else if (!apiUnavailable) {
          throw err;
        }
      }

      if (apiUnavailable || !next) {
        // 兼容 pc_transmission.py：没有 /api/wifi/connect 时，走直连 WS
        if (!account || !password) throw new Error("请输入账户和密码");
        if (account !== LOCAL_CREDENTIALS.account || password !== LOCAL_CREDENTIALS.password) {
          throw new Error("账户或密码错误");
        }

        const wsUrl = buildWsUrlFromHttpRoot(httpRoot);
        if (!wsUrl) throw new Error("无法生成 WebSocket 地址");

        next = {
          httpRoot,
          wsUrl,
          token: "",
        };
        mode = "direct";
      }

      localStorage.setItem(LS.httpRoot, next.httpRoot);
      localStorage.setItem(LS.wsUrl, next.wsUrl);
      localStorage.setItem(LS.token, next.token);
      const resolvedMeta = deviceMeta || meta || DEFAULT_META;
      localStorage.setItem(LS.meta, JSON.stringify(resolvedMeta));
      localStorage.setItem(LS.potreeWsUrl, next.wsUrl);

      setMeta(resolvedMeta);
      setConn((p) => ({ ...p, ...next, connected: false }));

      openWsHandshake(next.wsUrl, next.token, { mode });
      return true;
    },
    [meta, openWsHandshake]
  );

  // App 启动自动恢复连接
  useEffect(() => {
    const savedWs = localStorage.getItem(LS.wsUrl) || "";
    const savedToken = localStorage.getItem(LS.token) || "";
    if (savedWs) openWsHandshake(savedWs, savedToken, { mode: savedToken ? "auth" : "direct" });
    return () => closeWs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(
    () => ({
      meta,
      conn,
      status,
      error,
      connectToDevice,
    }),
    [meta, conn, status, error, connectToDevice]
  );

  return <DeviceContext.Provider value={value}>{children}</DeviceContext.Provider>;
}

export function useDevice() {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error("useDevice must be used within DeviceProvider");
  return ctx;
}

import React, {
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import api from "../../api/apiClient";
import {
  FiMonitor,
  FiWifiOff,
  FiUser,
  FiWifi,
  FiSearch
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL;
const REFRESH_INTERVAL = 20000;

const ActiveSessions = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("ONLINE");
  const [searchTerm, setSearchTerm] = useState("");

  const fetchingRef = useRef(false);
  const mountedRef = useRef(true);

  const fetchSessions = async () => {
    if (fetchingRef.current) return;

    fetchingRef.current = true;

    try {
      const response = await api.get(
        `/users/sessions/active?ts=${Date.now()}`
      );

      const data = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];

      if (mountedRef.current) {
        setUsers(data);
      }
    } catch (error) {
      console.error("Error cargando sesiones:", error);
    } finally {
      fetchingRef.current = false;

      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;

    const getLocalUser = () => {
      try {
        return JSON.parse(
          localStorage.getItem("user") || "null"
        );
      } catch {
        return null;
      }
    };

    const currentUser = getLocalUser();

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      timeout: 20000
    });

    const registerCurrentUser = () => {
      if (!currentUser?.id || !socket.connected) return;

      /*
       * Se mantiene compatibilidad con backends que esperan
       * únicamente el ID como payload.
       */
      socket.emit("register_user", currentUser.id);
    };

    const sendPresencePing = () => {
      if (!currentUser?.id || !socket.connected) return;

      socket.emit("presence_ping", {
        user_id: currentUser.id
      });
    };

    const handleConnect = () => {
      registerCurrentUser();
      sendPresencePing();
      fetchSessions();
    };

    const handleReconnect = () => {
      registerCurrentUser();
      sendPresencePing();
      fetchSessions();
    };

    const handleRadarUpdate = () => {
      fetchSessions();
    };

    const restorePresence = () => {
      if (document.visibilityState !== "visible") return;

      if (!socket.connected) {
        socket.connect();
      } else {
        registerCurrentUser();
        sendPresencePing();
      }

      fetchSessions();
    };

    const handleOnline = () => {
      if (!socket.connected) {
        socket.connect();
      }

      registerCurrentUser();
      sendPresencePing();
      fetchSessions();
    };

    const handleOffline = () => {
      /*
       * No se elimina al usuario de la UI inmediatamente.
       * El backend debe decidir el estado real según last_seen.
       */
      fetchSessions();
    };

    fetchSessions();

    socket.on("connect", handleConnect);
    socket.io.on("reconnect", handleReconnect);
    socket.on("radar_update", handleRadarUpdate);

    document.addEventListener(
      "visibilitychange",
      restorePresence
    );

    window.addEventListener("focus", restorePresence);
    window.addEventListener("pageshow", restorePresence);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        if (!socket.connected) {
          socket.connect();
        } else {
          registerCurrentUser();
          sendPresencePing();
        }
      }

      fetchSessions();
    }, REFRESH_INTERVAL);

    return () => {
      mountedRef.current = false;

      window.clearInterval(interval);

      document.removeEventListener(
        "visibilitychange",
        restorePresence
      );

      window.removeEventListener("focus", restorePresence);
      window.removeEventListener("pageshow", restorePresence);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);

      socket.off("connect", handleConnect);
      socket.io.off("reconnect", handleReconnect);
      socket.off("radar_update", handleRadarUpdate);

      socket.disconnect();
    };
  }, []);

  const isUserOnline = (user) => {
    if (typeof user?.is_online === "boolean") {
      return user.is_online;
    }

    if (user?.last_seen_at) {
      const lastSeen = new Date(user.last_seen_at).getTime();

      if (!Number.isNaN(lastSeen)) {
        const elapsed = Date.now() - lastSeen;

        /*
         * Fallback visual de 90 segundos cuando el backend
         * entrega last_seen_at pero todavía no entrega is_online.
         */
        return elapsed <= 90000;
      }
    }

    return user?.current_session_id != null;
  };

  const onlineUsersCount = useMemo(
    () => users.filter(isUserOnline).length,
    [users]
  );

  const offlineUsersCount = useMemo(
    () => users.filter((user) => !isUserOnline(user)).length,
    [users]
  );

  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (filter === "ONLINE") {
      result = result.filter(isUserOnline);
    }

    if (filter === "OFFLINE") {
      result = result.filter(
        (user) => !isUserOnline(user)
      );
    }

    if (searchTerm.trim()) {
      const term = searchTerm
        .trim()
        .toLowerCase();

      result = result.filter((user) => {
        const fullName =
          `${user.first_name || ""} ${user.last_name || ""}`
            .trim()
            .toLowerCase();

        return (
          fullName.includes(term) ||
          user.email?.toLowerCase().includes(term) ||
          user.company_name?.toLowerCase().includes(term)
        );
      });
    }

    return result;
  }, [users, filter, searchTerm]);

  if (loading && users.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 font-[Outfit] flex-1">
        <div className="w-8 h-8 border-2 border-[#5c9200] border-t-transparent rounded-full animate-spin" />

        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Sincronizando Radar...
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 transition-all duration-300 space-y-6 font-[Outfit] pb-12 pt-24 md:pt-6 bg-slate-50/50 min-h-screen">
      {/* HEADER RESPONSIVO */}
      <div className="px-4 sm:px-6 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-[#111111] tracking-tight uppercase leading-none">
            Radar de Sesiones
          </h2>

          <p className="text-[9px] sm:text-[10px] font-bold text-[#5c9200] uppercase tracking-[0.25em] mt-2">
            Monitoreo de red global en tiempo real
          </p>
        </div>

        {/* INDICADORES DE ESTADO */}
        <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto w-full sm:w-auto">
          <div className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-white border border-slate-200 rounded-xl shadow-sm">
            <FiWifiOff
              className="text-slate-400"
              size={12}
            />

            <span className="text-[9px] sm:text-[10px] font-bold uppercase text-slate-500 tracking-wider">
              OFF: {offlineUsersCount}
            </span>
          </div>

          <div className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-3 sm:px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-xl shadow-sm">
            <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#5c9200] animate-pulse" />

            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase text-[#5c9200] tracking-wider">
              ON: {onlineUsersCount}
            </span>
          </div>
        </div>
      </div>

      {/* CONTROLES */}
      <div className="px-4 sm:px-6 flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar shrink-0 max-w-full">
          {["ALL", "ONLINE", "OFFLINE"].map(
            (currentFilter) => (
              <button
                key={currentFilter}
                type="button"
                onClick={() =>
                  setFilter(currentFilter)
                }
                className={`px-4 sm:px-5 py-2 sm:py-2.5 rounded-xl text-[9px] sm:text-[10px] font-bold uppercase tracking-wider transition-all whitespace-nowrap border ${
                  filter === currentFilter
                    ? "bg-[#111111] text-white border-[#111111] shadow-sm"
                    : "bg-white text-slate-400 border-slate-200 hover:text-slate-600"
                }`}
              >
                {currentFilter === "ALL"
                  ? "Red Completa"
                  : currentFilter === "ONLINE"
                    ? "Conectados"
                    : "Desconectados"}
              </button>
            )
          )}
        </div>

        <div className="relative w-full lg:w-72">
          <FiSearch
            className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            size={14}
          />

          <input
            type="text"
            placeholder="Buscar colaborador..."
            value={searchTerm}
            onChange={(event) =>
              setSearchTerm(event.target.value)
            }
            className="w-full bg-white border border-slate-200 rounded-xl pl-11 pr-4 py-2 sm:py-2.5 text-[11px] sm:text-[12px] font-medium text-slate-700 placeholder-slate-400 outline-none focus:border-[#5c9200] focus:ring-1 focus:ring-[#5c9200] transition-all shadow-sm"
          />
        </div>
      </div>

      {/* CUADRÍCULA */}
      <div className="px-4 sm:px-6 grid grid-cols-1 md:grid-cols-2 gap-3.5 max-w-7xl w-full">
        <AnimatePresence mode="popLayout">
          {filteredUsers.map((user) => {
            const isOnline = isUserOnline(user);

            return (
              <motion.div
                layout
                initial={{
                  opacity: 0,
                  scale: 0.98
                }}
                animate={{
                  opacity: 1,
                  scale: 1
                }}
                exit={{
                  opacity: 0,
                  scale: 0.95
                }}
                transition={{
                  duration: 0.15
                }}
                key={user.id}
                className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between gap-3 hover:border-slate-200 transition-colors w-full min-w-0"
              >
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div
                    className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border relative ${
                      isOnline
                        ? "bg-emerald-50 text-[#5c9200] border-emerald-100"
                        : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}
                  >
                    {isOnline ? (
                      <FiWifi size={15} />
                    ) : (
                      <FiUser size={15} />
                    )}

                    <div
                      className={`absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full border-2 border-white sm:hidden ${
                        isOnline
                          ? "bg-[#5c9200]"
                          : "bg-slate-300"
                      }`}
                    />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] sm:text-[13px] font-bold text-[#111111] uppercase tracking-tight truncate leading-tight">
                      {user.first_name}{" "}
                      {user.last_name}
                    </p>

                    <p className="text-[9px] sm:text-[10px] font-medium text-slate-400 truncate mt-0.5">
                      {user.email}
                    </p>

                    <span className="inline-block sm:hidden text-[8px] font-black tracking-widest text-slate-400 uppercase mt-1 bg-slate-100 px-1.5 py-0.5 rounded">
                      {user.role || "Colaborador"}
                    </span>
                  </div>
                </div>

                <div className="hidden sm:flex items-center gap-3 shrink-0 px-1">
                  <div className="flex flex-col text-right">
                    <span
                      className={`text-[8px] sm:text-[9px] font-extrabold uppercase tracking-wider ${
                        isOnline
                          ? "text-[#5c9200]"
                          : "text-slate-400"
                      }`}
                    >
                      {isOnline
                        ? "Conectado"
                        : "Offline"}
                    </span>

                    {user.company_name && (
                      <span className="text-[8px] font-bold text-slate-400 max-w-[90px] truncate uppercase mt-0.5">
                        {user.company_name}
                      </span>
                    )}
                  </div>

                  <div
                    className={`w-2 h-2 rounded-full shadow-sm ${
                      isOnline
                        ? "bg-[#5c9200] animate-pulse"
                        : "bg-slate-200"
                    }`}
                  />
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* EMPTY STATE */}
      {filteredUsers.length === 0 && (
        <div className="mx-4 sm:mx-6 text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200 p-6 max-w-7xl">
          <FiMonitor
            className="mx-auto text-slate-300 mb-3"
            size={22}
          />

          <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400">
            No hay sesiones activas que coincidan
          </p>
        </div>
      )}
    </div>
  );
};

export default ActiveSessions;
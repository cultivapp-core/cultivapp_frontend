import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL;

export const presenceSocket = io(SOCKET_URL, {
  autoConnect: false,
  withCredentials: true,

  transports: [
    "websocket",
    "polling",
  ],

  reconnection: true,
  reconnectionAttempts: Infinity,

  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,

  timeout: 20000,
});
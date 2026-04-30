import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketCtx = createContext(null);

export const SocketProvider = ({ token, children }) => {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!token) return;

    const socket = io(import.meta.env.VITE_API_URL, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socket.on('connect',    () => { setConnected(true);  console.log('🔌 Socket connected'); });
    socket.on('disconnect', () => { setConnected(false); console.log('🔌 Socket disconnected'); });
    socket.on('connect_error', (err) => console.error('Socket error:', err.message));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token]);

  return (
    <SocketCtx.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketCtx.Provider>
  );
};

export const useSocket = () => useContext(SocketCtx);

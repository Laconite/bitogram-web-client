import { createContext, useContext, useEffect, useRef, type RefObject } from 'react';
import useRefState from '@hooks/useRefState';

type WSContextType = {
  socket: WebSocket | null;
  socketRef: RefObject<WebSocket | null>;
  subscribe: {
    (event: 'open', callback: () => void): void;
    (event: 'close', callback: () => void): void;
    (event: 'message', callback: (event: MessageEvent) => void): void;
  };
  unsubscribe: {
    (event: 'open', callback: () => void): void;
    (event: 'close', callback: () => void): void;
    (event: 'message', callback: (event: MessageEvent) => void): void;
  };
};

const SocketContext = createContext<WSContextType | null>(null);

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) throw new Error('useSocket must be used within a SocketProvider');
  return context;
};

export const SocketProvider = ({ children }: { children: React.ReactNode }) => {
  const [socket, setSocket, socketRef] = useRefState<WebSocket | null>(null);
  
  const listenersRef = useRef({
    open: new Set<() => void>(),
    close: new Set<() => void>(),
    message: new Set<(event: MessageEvent) => void>(),
  });

  const getUrl = () => {
    const envUrl = import.meta.env.VITE_WS_URL;
    if (envUrl) return envUrl;
    const protocol = location.protocol === 'https:' ? 'wss' : 'ws';
    return `${protocol}://${location.host}/ws`;
  };

  const connect = () => {
    if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    const ws = new WebSocket(getUrl());
    ws.binaryType = "arraybuffer";
    
    ws.onopen = () => {
      socketRef.current = ws;
      setSocket(ws);
      listenersRef.current.open.forEach((cb) => cb());
      console.log('WS connected');
    };
    ws.onclose = () => {
      socketRef.current = null;
      setSocket(null);
      listenersRef.current.close.forEach((cb) => cb());
      console.log('WS closed');
    };
    ws.onmessage = (event) => {
      listenersRef.current.message.forEach((cb) => cb(event));
    };
    ws.onerror = () => ws.close();
  };

  const disconnect = () => {
    socketRef.current?.close();
    socketRef.current = null;
    setSocket(null);
  };

  const subscribe: WSContextType['subscribe'] = (event, callback) => {
    listenersRef.current[event].add(callback as any);
  };
  const unsubscribe: WSContextType['unsubscribe'] = (event, callback) => {
    listenersRef.current[event].delete(callback as any);
  };

  useEffect(() => {
    connect();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        connect();
      }
    };

    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange);
      disconnect();
    };
  }, []);

  return (
    <SocketContext.Provider value={{ socket, socketRef, subscribe, unsubscribe }}>
      {children}
    </SocketContext.Provider>
  );
};
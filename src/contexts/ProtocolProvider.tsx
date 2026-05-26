import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";

import { useSocket } from "@contexts/SocketProvider";
import {
  createPacket,
  handlePacket,
  subscribe as protoSubscribe,
  unsubscribe as protoUnsubscribe,
} from "@utils/protocol";

type ProtocolContextType = {
  subscribe: (packet: string, fn: (data: any) => void) => void;
  unsubscribe: (packet: string, fn: (data: any) => void) => void;
  send: (packet: string, data: any) => void;
};

const ProtocolContext = createContext<ProtocolContextType | null>(null);

export const useProtocol = () => {
  const ctx = useContext(ProtocolContext);
  if (!ctx) throw new Error("useProtocol must be used within ProtocolProvider");
  return ctx;
};

export const ProtocolProvider = ({ children }: { children: ReactNode }) => {
  const { socket, subscribe: wsSubscribe, unsubscribe: wsUnsubscribe } = useSocket();

  const bufferRef = useRef<ArrayBuffer>(new ArrayBuffer(1024 * 64));
  const lengthRef = useRef(0);

  const ensureCapacity = (size: number) => {
    const buf = bufferRef.current;

    if (buf.byteLength >= lengthRef.current + size) return;

    const newSize = Math.max(buf.byteLength * 2, lengthRef.current + size);
    const newBuf = new ArrayBuffer(newSize);

    new Uint8Array(newBuf).set(new Uint8Array(buf, 0, lengthRef.current));

    bufferRef.current = newBuf;
  };

  const append = (chunk: ArrayBuffer) => {
    const incoming = new Uint8Array(chunk);

    ensureCapacity(incoming.length);

    const target = new Uint8Array(bufferRef.current);
    target.set(incoming, lengthRef.current);

    lengthRef.current += incoming.length;

    parse();
  };

  const parse = () => {
    let offset = 0;
    const buf = bufferRef.current;
    const len = lengthRef.current;
    const view = new DataView(buf);

    while (true) {
      if (len - offset < 2) break;

      const packetLength = view.getUint16(offset, false);
      if (len - offset - 2 < packetLength) break;

      const packet = buf.slice(offset + 2, offset + 2 + packetLength);

      handlePacket(packet);

      offset += 2 + packetLength;
    }

    if (offset > 0) {
      const remaining = len - offset;
      new Uint8Array(buf).set(new Uint8Array(buf, offset, remaining));
      lengthRef.current = remaining;
    }
  };

  useEffect(() => {
    if (!socket) return;

    const onMessage = (event: MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) return;
      append(event.data);
    };

    wsSubscribe("message", onMessage);

    return () => {
      wsUnsubscribe("message", onMessage);
    };
  }, [socket, wsSubscribe, wsUnsubscribe]);

  const api = useMemo(() => {
    return {
      subscribe: protoSubscribe,
      unsubscribe: protoUnsubscribe,
      send: (packet: string, data: any) => {
        if (!socket || socket.readyState !== WebSocket.OPEN) return;

        const body = createPacket(packet, data);

        const buffer = new ArrayBuffer(2 + body.byteLength);
        const view = new DataView(buffer);

        view.setUint16(0, body.byteLength, false);
        new Uint8Array(buffer, 2).set(new Uint8Array(body));

        socket.send(buffer);
      },
    };
  }, [socket]);

  return (
    <ProtocolContext.Provider value={api}>
      {children}
    </ProtocolContext.Provider>
  );
};
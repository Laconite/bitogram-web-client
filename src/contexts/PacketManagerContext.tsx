import { createContext, useContext, useEffect, useRef } from "react";
import { useSocket } from "@contexts/SocketContext";
import { NetStream, NetPacket } from "@utils/Net";

export const TO_ID_BY_NAME = {
    CHECK_USERNAME: 0x00,
    GET_PASSWORD_SALT: 0x01,
    AUTHORIZATION: 0x02,
    REQUEST_CONFIRMATION_CODE: 0x03,
    REGISTRATION: 0x04,
    GET_INIT_DATA: 0x05,
    SEARCH: 0x06,
    CREATE_CHANNEL: 0x07,
    MESSAGE: 0x08,
    GET_MESSAGES: 0x09
};

export const FROM_ID_BY_NAME = {
    CHECK_USERNAME: 0x00,
    GET_PASSWORD_SALT: 0x01,
    AUTHORIZATION: 0x02,
    REQUEST_CONFIRMATION_CODE: 0x03,
    REGISTRATION: 0x04,
    GET_INIT_DATA: 0x05,
    SEARCH: 0x06,
    CREATE_CHANNEL: 0x07,
    MESSAGE: 0x08,
    GET_MESSAGES: 0x09
};

type PacketManagerContextType = {
    sendPacket: (payload: Uint8Array) => void;
    subscribePacket: (packetId: number, callback: (packet: NetPacket) => void) => void;
    unsubscribePacket: (packetId: number, callback: (packet: NetPacket) => void) => void;
};

const PacketManagerContext = createContext<PacketManagerContextType | null>(null);

export const usePacketManager = () => {
    const context = useContext(PacketManagerContext);
    if (!context) throw new Error("usePacketManager must be used within a PacketManagerProvider");
    return context;
};

export const PacketManagerProvider = ({ children }: { children: React.ReactNode }) => {
    const { socket, subscribe, unsubscribe } = useSocket();
    const netStream = useRef(new NetStream());
    const netPacket = useRef<NetPacket>(null);

    const callbackRefs = useRef<Record<number, Set<(packet: NetPacket) => void>>>({});

    const handleMessage = (event: MessageEvent) => {
        netStream.current.feed(new Uint8Array(event.data));

        if (netPacket.current === null) {
            const [id, discardBytes] = netStream.current.readNumber();

            if (id === null)
                return;

            netPacket.current = new NetPacket(id);
            netStream.current.discard(discardBytes);
        }

        if (netPacket.current !== null) {
            let offset: number | null = null;
            let values: Record<string, any> | null = null;

            switch (netPacket.current.id) {
                case FROM_ID_BY_NAME.CHECK_USERNAME:
                    [values, offset] = netStream.current.readStructureWithNames(`
                        usernameStatus: int
                    `);
                    break;
                case FROM_ID_BY_NAME.GET_PASSWORD_SALT:
                    [values, offset] = netStream.current.readStructureWithNames(`
                        passwordSalt: bytes
                    `);
                    break;
                case FROM_ID_BY_NAME.AUTHORIZATION:
                    [values, offset] = netStream.current.readStructureWithNames(`
                        userId: int
                    `);
                    break;
                case FROM_ID_BY_NAME.REQUEST_CONFIRMATION_CODE:
                    [values, offset] = [[], null];
                    break;
                case FROM_ID_BY_NAME.REGISTRATION:
                    [values, offset] = netStream.current.readStructureWithNames(`
                        userId: int
                    `);
                    break;
                case FROM_ID_BY_NAME.GET_INIT_DATA:
                    [values, offset] = netStream.current.readStructureWithNames(`
                        users: [] {
                            id: int,
                            fullName: string
                        },
                        channels: [] {
                            id: int,
                            type: string,
                            interlocutorId: int,
                            lastMessage: {
                                id: int,
                                senderId: int,
                                text: string
                            }
                        }
                    `);
                    break;
                case FROM_ID_BY_NAME.SEARCH:
                    [values, offset] = netStream.current.readStructureWithNames(`
                        users: [] {
                            id: int,
                            username: string, 
                            fullName: string
                        }
                    `);
                    break;
                case FROM_ID_BY_NAME.CREATE_CHANNEL:
                    [values, offset] = netStream.current.readStructureWithNames(`
                        id: int,                            
                        type: string,
                        interlocutorId: int,
                        lastMessage: {
                            id: int,
                            senderId: int,
                            text: string
                        }
                    `);
                    break;
                case FROM_ID_BY_NAME.MESSAGE:
                    [values, offset] = netStream.current.readStructureWithNames(`
                        id: int,
                        senderId: int,
                        channelId: int,
                        text: string
                    `);
                    break;
                case FROM_ID_BY_NAME.GET_MESSAGES:
                    [values, offset] = netStream.current.readStructureWithNames(`
                        channelId: int,
                        messages: [] {
                            id: int,
                            senderId: int,
                            text: string
                        }
                    `);
                    break;
                default:
                    break;
            }

            if (offset !== null) {
                netStream.current.discard(offset);
            }

            if (values !== null) {
                netPacket.current.values = values;

                const callbacks = callbackRefs.current[netPacket.current.id];
                if (callbacks) {
                    const packet = netPacket.current;
                    callbacks.forEach((callback) => callback({ ...packet }));
                }

                netPacket.current = null;
            }
        }
    };

    useEffect(() => {
        subscribe("message", handleMessage);
        return () => unsubscribe("message", handleMessage);
    }, [subscribe, unsubscribe]);

    const sendPacket = async (payload: Uint8Array) => {
        if (socket?.readyState != WebSocket.OPEN)
            return;

        let netStream = new NetStream();
        netStream.writeStructure({ payload: "bytes" }, [payload]);
        socket.send(netStream.buffer);
    }

    const subscribePacket = (packetId: number, callback: (packet: NetPacket) => void) => {
        if (!callbackRefs.current[packetId]) callbackRefs.current[packetId] = new Set();
        callbackRefs.current[packetId].add(callback);
    };
    const unsubscribePacket = (packetId: number, callback: (packet: NetPacket) => void) => {
        callbackRefs.current[packetId]?.delete(callback);
    };

    return (
        <PacketManagerContext.Provider value={{ sendPacket, subscribePacket, unsubscribePacket }}>
            {children}
        </PacketManagerContext.Provider>
    );
};
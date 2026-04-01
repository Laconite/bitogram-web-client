import { createContext, useContext, useEffect, useRef } from "react";
import { useSocket } from "@contexts/SocketContext";
import { NetStream, NetPacket } from "@utils/Net";

export const TO_ID_BY_NAME = {
    RESTORE_SESSION: 0x00,
    CHECK_USERNAME: 0x01,
    GET_PASSWORD_SALT: 0x02,
    AUTHORIZATION: 0x03,
    REQUEST_CONFIRMATION_CODE: 0x04,
    REGISTRATION: 0x05,
    GET_INIT_DATA: 0x06,
    SEARCH: 0x07,
    CREATE_CHANNEL: 0x08,
    MESSAGE: 0x09,
    GET_MESSAGES: 0x0a,
    SUBSCRIBE_TO_RECEIVE_USER_STATUS: 0x0b,
};
export const FROM_ID_BY_NAME = {
    SESSION: 0x00,
    CHECK_USERNAME: 0x01,
    GET_PASSWORD_SALT: 0x02,
    AUTHORIZATION: 0x03,
    REQUEST_CONFIRMATION_CODE: 0x04,
    REGISTRATION: 0x05,
    GET_INIT_DATA: 0x06,
    SEARCH: 0x07,
    CREATE_CHANNEL: 0x08,
    MESSAGE: 0x09,
    GET_MESSAGES: 0x0a,
    USER_STATUS: 0x0b,

    USER: 0x0c,
};

type PacketManagerContextType = {
    sendPacket: (payload: Uint8Array) => void;
    subscribePacket: (packetId: number, callback: (packet: NetPacket) => void) => void;
    unsubscribePacket: (packetId: number, callback: (packet: NetPacket) => void) => void;

    sendCheckUsernamePacket: (username: string) => Promise<void>;
    sendGetPasswordSaltPacket: () => Promise<void>;
    sendAuthorizationPacket: (password: string, passwordSalt: Uint8Array) => Promise<void>;
    sendRequestConfirmationCodePacket: (email: string) => Promise<void>;
    sendRegistrationPacket: (password: string, passwordSalt: Uint8Array, fullName: string, confirmationCode: string) => Promise<void>;
    sendGetInitDataPacket: () => Promise<void>;
};

const PacketManagerContext = createContext<PacketManagerContextType | null>(null);

export const usePacketManager = () => {
    const context = useContext(PacketManagerContext);
    if (!context) throw new Error("usePacketManager must be used within a PacketManagerProvider");
    return context;
};

export const PacketManagerProvider = ({ children }: { children: React.ReactNode }) => {
    const { socketRef, subscribe, unsubscribe } = useSocket();
    const netStream = useRef(new NetStream());
    const netPacket = useRef<NetPacket>(null);

    const callbackRefs = useRef<Record<number, Set<(packet: NetPacket) => void>>>({});

    const handleMessage = (event: MessageEvent) => {
        netStream.current.feed(new Uint8Array(event.data));

        while (netStream.current.buffer.length > 0) {
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
                    case FROM_ID_BY_NAME.SESSION:
                        [values, offset] = netStream.current.readStructureWithNames(`
                            key: bytes
                        `);
                        break;
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
                                firstMessageId: int,
                                lastMessage: {
                                    id: int,
                                    senderId: int,
                                    text: string,
                                    createdAt: i64,
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
                            firstMessageId: int,
                            interlocutorId: int,
                            lastMessage: {
                                id: int,
                                senderId: int,
                                text: string,
                                createdAt: i64,
                            }
                        `);
                        break;
                    case FROM_ID_BY_NAME.MESSAGE:
                        [values, offset] = netStream.current.readStructureWithNames(`
                            id: int,
                            senderId: int,
                            channelId: int,
                            text: string,
                            createdAt: i64,
                        `);
                        break;
                    case FROM_ID_BY_NAME.GET_MESSAGES:
                        [values, offset] = netStream.current.readStructureWithNames(`
                            channelId: int,
                            messages: [] {
                                id: int,
                                senderId: int,
                                text: string,
                                createdAt: i64,
                            }
                        `);
                        break;
                    case FROM_ID_BY_NAME.USER_STATUS:
                        [values, offset] = netStream.current.readStructureWithNames(`
                            userId: int,
                            isOnline: int,
                        `)
                        break;

                    case FROM_ID_BY_NAME.USER:
                        [values, offset] = netStream.current.readStructureWithNames(`
                            id: int,
                            fullName: string
                        `)
                        break;
                    default:
                        break;
                }

                if (offset !== null) {
                    netStream.current.discard(offset);
                } else {
                    break;
                }

                if (values !== null) {
                    netPacket.current.values = values;

                    const callbacks = callbackRefs.current[netPacket.current.id];
                    if (callbacks) {
                        const packet = netPacket.current;
                        callbacks.forEach((callback) => callback({ ...packet }));
                    }

                    netPacket.current = null;
                } else {
                    break;
                }
            }
        }
    };

    useEffect(() => {
        subscribe("message", handleMessage);
        return () => unsubscribe("message", handleMessage);
    }, [subscribe, unsubscribe]);

    const sendPacket = async (payload: Uint8Array) => {
        if (socketRef.current?.readyState != WebSocket.OPEN)
            return;

        const netStream = new NetStream();
        netStream.writeStructure({ payload: "bytes" }, [payload]);
        socketRef.current.send(netStream.buffer);
    }
    const subscribePacket = (packetId: number, callback: (packet: NetPacket) => void) => {
        if (!callbackRefs.current[packetId]) callbackRefs.current[packetId] = new Set();
        callbackRefs.current[packetId].add(callback);
    };
    const unsubscribePacket = (packetId: number, callback: (packet: NetPacket) => void) => {
        callbackRefs.current[packetId]?.delete(callback);
    };

    const calculatePasswordHash = async (password: string, salt: Uint8Array) => {
        const encoder = new TextEncoder();
        const passwordBytes = encoder.encode(password);
        const combined = new Uint8Array(passwordBytes.length + salt.length);

        combined.set(passwordBytes);
        combined.set(salt, passwordBytes.length);

        return new Uint8Array(await crypto.subtle.digest("SHA-256", combined));
    };

    const sendCheckUsernamePacket = async (username: string) => {
        let netStream = new NetStream();
        netStream.writeNumber(TO_ID_BY_NAME.CHECK_USERNAME);
        netStream.writeStructure({
            username: "string",
        }, [
            username,
        ]);
        sendPacket(netStream.buffer);
    }
    const sendGetPasswordSaltPacket = async () => {
        let netStream = new NetStream();
        netStream.writeNumber(TO_ID_BY_NAME.GET_PASSWORD_SALT);
        sendPacket(netStream.buffer);
    }
    const sendAuthorizationPacket = async (password: string, passwordSalt: Uint8Array) => {
        const passwordHash = await calculatePasswordHash(password, passwordSalt);

        let netStream = new NetStream();
        netStream.writeNumber(TO_ID_BY_NAME.AUTHORIZATION);
        netStream.writeStructure({
            passwordHash: "bytes",
        }, [
            passwordHash,
        ]);
        sendPacket(netStream.buffer);
    }
    const sendRequestConfirmationCodePacket = async (email: string) => {
        let netStream = new NetStream();
        netStream.writeNumber(TO_ID_BY_NAME.REQUEST_CONFIRMATION_CODE);
        netStream.writeStructure({
            email: "string",
        }, [
            email,
        ]);
        sendPacket(netStream.buffer);
    }
    const sendRegistrationPacket = async (password: string, passwordSalt: Uint8Array, fullName: string, confirmationCode: string) => {
        let passwordHash = await calculatePasswordHash(password, passwordSalt);

        let netStream = new NetStream();
        netStream.writeNumber(TO_ID_BY_NAME.REGISTRATION);
        netStream.writeStructure({
            passwordSalt: "bytes",
            passwordHash: "bytes",
            fullName: "string",
            confirmationCode: "string",
        }, [
            passwordSalt,
            passwordHash,
            fullName,
            confirmationCode,
        ]);
        sendPacket(netStream.buffer);
    }
    const sendGetInitDataPacket = async () => {
        let netStream = new NetStream();
        netStream.writeNumber(TO_ID_BY_NAME.GET_INIT_DATA);
        sendPacket(netStream.buffer);
    }

    return (
        <PacketManagerContext.Provider value={{
            sendPacket,
            subscribePacket,
            unsubscribePacket,

            sendCheckUsernamePacket,
            sendGetPasswordSaltPacket,
            sendAuthorizationPacket,
            sendRequestConfirmationCodePacket,
            sendRegistrationPacket,
            sendGetInitDataPacket,
        }}>
            {children}
        </PacketManagerContext.Provider>
    );
};


import { createContext, useContext, useEffect, useRef } from "react";
import { useSocket } from "@contexts/SocketContext";
import { NetStream, NetPacket } from "@utils/Net";


function isValidType(type: string): boolean {
    return [
        "Request",
        "Response",
    ].includes(type);
}

function isValidAction(action: string): boolean {
    return [
        "None",
        "Get",
        "Create",
        "Replace",
        "Edit",
        "Delete",
    ].includes(action);
}


function getIdForSend(type: string, action: string, entity: string): number | null {
    if (!isValidType(type) || !isValidAction(action)) {
        return null;
    }

    const packet = [type, action, entity];

    const packets = [
        ["Request", "Get", "Short session"],
        ["Request", "Get", "Long session"],
        ["Request", "Get", "Username status"],
        ["Request", "Get", "Salt for password"],
        ["Request", "None", "Confirmation code"],
        ["Request", "Create", "Authorize"],
        ["Request", "Create", "Register"],
        ["Request", "Create", "Long session"],
        ["Request", "Get", "Starting data"],
        ["Request", "Get", "Search"],
        ["Request", "Create", "Channel"],
        ["Request", "Create", "Message"],
        ["Request", "Get", "Messages"],
        ["Request", "Get", "User status"],
    ];

    return packets.findIndex(p =>
        p[0] === packet[0] && p[1] === packet[1] && p[2] === packet[2]
    );
}

export const ID_FOR_SEND = {
    REQUEST__GET__SHORT_SESSION: getIdForSend("Request", "Get", "Short session")!,
    REQUEST__GET__LONG_SESSION: getIdForSend("Request", "Get", "Long session")!,
    REQUEST__GET__USERNAME_STATUS: getIdForSend("Request", "Get", "Username status")!,
    REQUEST__GET__SALT_FOR_PASSWORD: getIdForSend("Request", "Get", "Salt for password")!,
    REQUEST__NONE__CONFIRMATION_CODE: getIdForSend("Request", "None", "Confirmation code")!,
    REQUEST__CREATE__AUTHORIZE: getIdForSend("Request", "Create", "Authorize")!,
    REQUEST__CREATE__REGISTER: getIdForSend("Request", "Create", "Register")!,
    REQUEST__CREATE__LONG_SESSION: getIdForSend("Request", "Create", "Long session")!,
    REQUEST__GET__STARTING_DATA: getIdForSend("Request", "Get", "Starting data")!,
    REQUEST__GET__SEARCH: getIdForSend("Request", "Get", "Search")!,
    REQUEST__CREATE__CHANNEL: getIdForSend("Request", "Create", "Channel")!,
    REQUEST__CREATE__MESSAGE: getIdForSend("Request", "Create", "Message")!,
    REQUEST__GET__MESSAGES: getIdForSend("Request", "Get", "Messages")!,
    REQUEST__GET__USER_STATUS: getIdForSend("Request", "Get", "User status")!,
}

function getIdForReceive(type: string, action: string, entity: string): number | null {
    if (!isValidType(type) || !isValidAction(action)) {
        return null;
    }

    const packet = [type, action, entity];

    const packets = [
        ["Response", "None", "Short session"],
        ["Response", "None", "Username status"],
        ["Response", "None", "Password salt"],
        ["Response", "None", "Confirmation code"],
        ["Response", "None", "Entry"],
        ["Response", "None", "Starting data"],
        ["Response", "None", "Search"],
        ["Response", "None", "User"],
        ["Response", "None", "Channel"],
        ["Response", "None", "Message"],
        ["Response", "None", "Messages"],
        ["Response", "None", "User status"],
    ];

    return packets.findIndex(p =>
        p[0] === packet[0] && p[1] === packet[1] && p[2] === packet[2]
    );
}

export const ID_FOR_RECEIVE = {
    RESPONSE__NONE__SHORT_SESSION: getIdForReceive("Response", "None", "Short session")!,
    RESPONSE__NONE__USERNAME_STATUS: getIdForReceive("Response", "None", "Username status")!,
    RESPONSE__NONE__PASSWORD_SALT: getIdForReceive("Response", "None", "Password salt")!,
    RESPONSE__NONE__CONFIRMATION_CODE: getIdForReceive("Response", "None", "Confirmation code")!,
    RESPONSE__NONE__ENTRY: getIdForReceive("Response", "None", "Entry")!,
    RESPONSE__NONE__STARTING_DATA: getIdForReceive("Response", "None", "Starting data")!,
    RESPONSE__NONE__SEARCH: getIdForReceive("Response", "None", "Search")!,
    RESPONSE__NONE__USER: getIdForReceive("Response", "None", "User")!,
    RESPONSE__NONE__CHANNEL: getIdForReceive("Response", "None", "Channel")!,
    RESPONSE__NONE__MESSAGE: getIdForReceive("Response", "None", "Message")!,
    RESPONSE__NONE__MESSAGES: getIdForReceive("Response", "None", "Messages")!,
    RESPONSE__NONE__USER_STATUS: getIdForReceive("Response", "None", "User status")!,
}


type PacketManagerContextType = {
    sendPacket: (payload: Uint8Array) => void;
    subscribePacket: (packetId: number, callback: (packet: NetPacket) => void) => void;
    unsubscribePacket: (packetId: number, callback: (packet: NetPacket) => void) => void;

    sendRequestGetLongSessionPacket: (key: Uint8Array) => Promise<void>;
    sendCheckUsernamePacket: (username: string) => Promise<void>;
    sendGetPasswordSaltPacket: () => Promise<void>;
    sendAuthorizationPacket: (password: string, passwordSalt: Uint8Array) => Promise<void>;
    sendRequestConfirmationCodePacket: (email: string) => Promise<void>;
    sendRegistrationPacket: (password: string, passwordSalt: Uint8Array, fullName: string, confirmationCode: string) => Promise<void>;
    sendRequestCreateLongSessionPacket: (key: Uint8Array) => Promise<void>;
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
                    case ID_FOR_RECEIVE.RESPONSE__NONE__SHORT_SESSION:
                        [values, offset] = netStream.current.readStructureWithNames(`
                            key: bytes
                        `);
                        break;
                    case ID_FOR_RECEIVE.RESPONSE__NONE__USERNAME_STATUS:
                        [values, offset] = netStream.current.readStructureWithNames(`
                            usernameStatus: int
                        `);
                        break;
                    case ID_FOR_RECEIVE.RESPONSE__NONE__PASSWORD_SALT:
                        [values, offset] = netStream.current.readStructureWithNames(`
                            passwordSalt: bytes
                        `);
                        break;
                    case ID_FOR_RECEIVE.RESPONSE__NONE__CONFIRMATION_CODE:
                        [values, offset] = [[], null];
                        break;
                    case ID_FOR_RECEIVE.RESPONSE__NONE__ENTRY:
                        [values, offset] = netStream.current.readStructureWithNames(`
                            userId: int
                        `);
                        break;
                    case ID_FOR_RECEIVE.RESPONSE__NONE__STARTING_DATA:
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
                    case ID_FOR_RECEIVE.RESPONSE__NONE__SEARCH:
                        [values, offset] = netStream.current.readStructureWithNames(`
                            users: [] {
                                id: int,
                                username: string, 
                                fullName: string
                            }
                        `);
                        break;
                    case ID_FOR_RECEIVE.RESPONSE__NONE__USER:
                        [values, offset] = netStream.current.readStructureWithNames(`
                            id: int,
                            fullName: string
                        `)
                        break;
                    case ID_FOR_RECEIVE.RESPONSE__NONE__CHANNEL:
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
                    case ID_FOR_RECEIVE.RESPONSE__NONE__MESSAGE:
                        [values, offset] = netStream.current.readStructureWithNames(`
                            id: int,
                            senderId: int,
                            channelId: int,
                            text: string,
                            createdAt: i64,
                        `);
                        break;
                    case ID_FOR_RECEIVE.RESPONSE__NONE__MESSAGES:
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
                    case ID_FOR_RECEIVE.RESPONSE__NONE__USER_STATUS:
                        [values, offset] = netStream.current.readStructureWithNames(`
                            userId: int,
                            isOnline: int,
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
        socketRef.current.send(netStream.buffer as Uint8Array<ArrayBuffer>);
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

    const sendRequestGetLongSessionPacket = async (key: Uint8Array) => {
        let netStream = new NetStream();
        netStream.writeNumber(ID_FOR_SEND.REQUEST__GET__LONG_SESSION);
        netStream.writeStructure({
            key: "bytes",
        }, [
            key,
        ]);
        sendPacket(netStream.buffer);
    }
    const sendCheckUsernamePacket = async (username: string) => {
        let netStream = new NetStream();
        netStream.writeNumber(ID_FOR_SEND.REQUEST__GET__USERNAME_STATUS);
        netStream.writeStructure({
            username: "string",
        }, [
            username,
        ]);
        sendPacket(netStream.buffer);
    }
    const sendGetPasswordSaltPacket = async () => {
        let netStream = new NetStream();
        netStream.writeNumber(ID_FOR_SEND.REQUEST__GET__SALT_FOR_PASSWORD);
        sendPacket(netStream.buffer);
    }
    const sendRequestConfirmationCodePacket = async (email: string) => {
        let netStream = new NetStream();
        netStream.writeNumber(ID_FOR_SEND.REQUEST__NONE__CONFIRMATION_CODE);
        netStream.writeStructure({
            email: "string",
        }, [
            email,
        ]);
        sendPacket(netStream.buffer);
    }
    const sendAuthorizationPacket = async (password: string, passwordSalt: Uint8Array) => {
        const passwordHash = await calculatePasswordHash(password, passwordSalt);

        let netStream = new NetStream();
        netStream.writeNumber(ID_FOR_SEND.REQUEST__CREATE__AUTHORIZE);
        netStream.writeStructure({
            passwordHash: "bytes",
        }, [
            passwordHash,
        ]);
        sendPacket(netStream.buffer);
    }
    const sendRegistrationPacket = async (password: string, passwordSalt: Uint8Array, fullName: string, confirmationCode: string) => {
        let passwordHash = await calculatePasswordHash(password, passwordSalt);

        let netStream = new NetStream();
        netStream.writeNumber(ID_FOR_SEND.REQUEST__CREATE__REGISTER);
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
    const sendRequestCreateLongSessionPacket = async (key: Uint8Array) => {
        let netStream = new NetStream();
        netStream.writeNumber(ID_FOR_SEND.REQUEST__CREATE__LONG_SESSION);
        netStream.writeStructure({
            key: "bytes",
        }, [
            key,
        ]);
        sendPacket(netStream.buffer);
    }
    const sendGetInitDataPacket = async () => {
        let netStream = new NetStream();
        netStream.writeNumber(ID_FOR_SEND.REQUEST__GET__STARTING_DATA);
        sendPacket(netStream.buffer);
    }

    return (
        <PacketManagerContext.Provider value={{
            sendPacket,
            subscribePacket,
            unsubscribePacket,
            
            sendRequestGetLongSessionPacket,
            sendCheckUsernamePacket,
            sendGetPasswordSaltPacket,
            sendRequestConfirmationCodePacket,
            sendAuthorizationPacket,
            sendRegistrationPacket,
            sendRequestCreateLongSessionPacket,
            sendGetInitDataPacket,
        }}>
            {children}
        </PacketManagerContext.Provider>
    );
};
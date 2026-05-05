import { useState, useRef, useEffect, type RefObject, type Dispatch, type SetStateAction } from "react";
import useRefState from "@hooks/useRefState"
import { useWindowWidth } from "@hooks/useWindowWidth";
import { usePacketManager, ID_FOR_SEND, ID_FOR_RECEIVE } from "@contexts/PacketManagerContext";
import { NetStream, NetPacket } from "@utils/Net";
import Search from "./main/Search"
import ChannelPreview from "./main/ChannelPreview"
import Channel from "./main/Channel"
import classes from "./Main.module.css";

export type UserModel = {
    id: number;
    username?: string;
    fullName?: string;
    email?: string;

    isOnline?: number;
};
export type ChannelModel = {
    id?: number;
    createdAt?: bigint;
    type?: string;
    firstMessageId?: number;

    interlocutorId?: number;

    startMessagesLoaded?: boolean;
    scroll?: number;
    shouldScrollToBottom?: boolean;
    prevScrollHeight?: number;
    messagesLoading?: boolean;
};
export type MessageModel = {
    id: number;
    senderId?: number;
    channelId?: number;
    text?: string;
    createdAt?: bigint;
};

interface MainProps {
    username: string;
    setUsername: Dispatch<SetStateAction<string>>;
    usernameRef: RefObject<string>;
    fullName: string;
    setFullName: Dispatch<SetStateAction<string>>;
    id: number;
    setId: Dispatch<SetStateAction<number | null>>;
}

const Main = ({
    username,
    setUsername,
    usernameRef,
    fullName,
    setFullName,
    id,
    setId
}: MainProps) => {
    const [users, setUsers, usersRef] = useRefState<UserModel[]>([]);
    const [channels, setChannels, channelsRef] = useRefState<ChannelModel[]>([]);
    const [messages, setMessages, messagesRef] = useRefState<MessageModel[]>([]);

    const messagesByChannelIdRef = useRef<Map<number, MessageModel[]>>(new Map());

    const updateUsers = () => {
        setUsers([...usersRef.current]);
    }

    const updateChannels = () => {
        setChannels([...channelsRef.current]);
    }

    const addMessage = (message: MessageModel) => {
        messagesRef.current.push(message);

        if (!message.channelId) return;

        const current = messagesByChannelIdRef.current.get(message.channelId) || [];

        const index = current.findIndex(m => m.id > message.id);

        if (index === -1) {
            current.push(message);
        } else {
            current.splice(index, 0, message);
        }

        messagesByChannelIdRef.current.set(message.channelId, [...current]);
    };
    const getMessages = (channelId: number) => {
        return messagesByChannelIdRef.current.get(channelId) || [];
    }
    const updateMessages = () => {
        setMessages([...messagesRef.current]);
    }

    const [selectedChannel, setSelectedChannel, selectedChannelRef] = useRefState<ChannelModel | null>(null);

    const [searchText, setSearchText, searchTextRef] = useRefState("");
    const [searchSearching, setSearchSearching] = useState<boolean>(false);
    const [searchSearchedUsersIds, setSearchSearchedUsersIds] = useState<number[]>([]);

    const channelAfterMessagesLoading = useRef<ChannelModel | null>(null)

    const {
        sendPacket,
        subscribePacket,
        unsubscribePacket,

        sendNoneSubscribeToNotificationsPacket,
    } = usePacketManager();

    useEffect(() => {
        const handleGetStartingDataPacket = (packet: NetPacket) => {
            console.log("Packet: Get init data");

            const channels = packet.values.channels;

            for (let channelIndex = 0; channelIndex < channels.length; channelIndex++) {
                const channel = packet.values.channels[channelIndex];
                const lastMessage = channel.lastMessage;

                channelsRef.current.push({
                    id: channel.id,
                    type: channel.type,
                    interlocutorId: channel.interlocutorId,
                    firstMessageId: channel.firstMessageId,
                });

                addMessage({
                    id: lastMessage.id,
                    senderId: lastMessage.senderId,
                    channelId: channel.id,
                    text: lastMessage.text,
                    createdAt: lastMessage.createdAt,
                });
            }

            for (let userIndex = 0; userIndex < packet.values.users.length; userIndex++) {
                const user = packet.values.users[userIndex];

                usersRef.current.push({
                    id: user.id,
                    username: user.username,
                    fullName: user.fullName,
                    isOnline: 0,
                });
            }

            updateMessages();
            updateChannels();
            updateUsers();
        }
        const handleUserPacket = (packet: NetPacket) => {
            console.log("Packet: User");

            const user: UserModel = {
                id: packet.values.id,
                fullName: packet.values.fullName
            }

            setUsers(prev => {
                const index = prev.findIndex(u => u.id === user.id);

                if (index !== -1) {
                    const updatedUsers = [...prev];
                    updatedUsers[index] = { ...updatedUsers[index], ...user };
                    return updatedUsers;
                }

                return [...prev, user];
            });
        }
        const handleChannelPacket = (packet: NetPacket) => {
            console.log("Packet: Create channel");

            const channel = packet.values;
            const lastMessage = channel.lastMessage;

            const newChannel: ChannelModel = {
                id: channel.id,
                type: channel.type,
                interlocutorId: channel.interlocutorId,
                firstMessageId: channel.firstMessageId,
            }

            setChannels(prev => [...prev, newChannel]);

            if (selectedChannelRef.current && !selectedChannelRef.current.id) {
                setSelectedChannel(newChannel);
            }

            addMessage({
                id: lastMessage.id,
                senderId: lastMessage.senderId,
                channelId: channel.id,
                text: lastMessage.text,
                createdAt: lastMessage.createdAt,
            });

            updateMessages();
        }
        const handleMessagePacket = (packet: NetPacket) => {
            console.log("Packet: Message");
            addMessage(packet.values as MessageModel);
            updateMessages();
        }
        const handleGetMessagesPacket = (packet: NetPacket) => {
            console.log("Packet: Get messages");

            const values = packet.values;
            const channelId = values.channelId;
            const messages = values.messages;

            for (let i_message = 0; i_message < messages.length; i_message++) {
                const message = messages[i_message];

                addMessage({
                    id: message.id,
                    senderId: message.senderId,
                    channelId: channelId,
                    text: message.text,
                    createdAt: message.createdAt,
                });
            }

            updateMessages();

            if (channelAfterMessagesLoading.current) {
                setSelectedChannel(channelAfterMessagesLoading.current);
                channelAfterMessagesLoading.current = null;
            }
        }
        const handleUserStatusPacket = (packet: NetPacket) => {
            console.log("Packet: User status");

            const userId = packet.values.userId;
            const isOnline = packet.values.isOnline;

            setUsers(prev => {
                const newUsers = [...prev];
                const user = newUsers.find(u => u.id === userId);

                if (user) {
                    user.isOnline = isOnline;
                }

                return newUsers;
            });
        }

        subscribePacket(ID_FOR_RECEIVE.RESPONSE__NONE__STARTING_DATA, handleGetStartingDataPacket);
        subscribePacket(ID_FOR_RECEIVE.RESPONSE__NONE__USER, handleUserPacket);
        subscribePacket(ID_FOR_RECEIVE.RESPONSE__NONE__CHANNEL, handleChannelPacket);
        subscribePacket(ID_FOR_RECEIVE.RESPONSE__NONE__MESSAGE, handleMessagePacket);
        subscribePacket(ID_FOR_RECEIVE.RESPONSE__NONE__MESSAGES, handleGetMessagesPacket);
        subscribePacket(ID_FOR_RECEIVE.RESPONSE__NONE__USER_STATUS, handleUserStatusPacket);

        return () => {
            unsubscribePacket(ID_FOR_RECEIVE.RESPONSE__NONE__STARTING_DATA, handleGetStartingDataPacket);
            unsubscribePacket(ID_FOR_RECEIVE.RESPONSE__NONE__USER, handleUserPacket);
            unsubscribePacket(ID_FOR_RECEIVE.RESPONSE__NONE__CHANNEL, handleChannelPacket);
            unsubscribePacket(ID_FOR_RECEIVE.RESPONSE__NONE__MESSAGE, handleMessagePacket);
            unsubscribePacket(ID_FOR_RECEIVE.RESPONSE__NONE__MESSAGES, handleGetMessagesPacket);
            unsubscribePacket(ID_FOR_RECEIVE.RESPONSE__NONE__USER_STATUS, handleUserStatusPacket);
        };
    }, [subscribePacket, unsubscribePacket]);

    useEffect(() => {
        function urlBase64ToUint8Array(base64: string) {
            const padding = "=".repeat((4 - base64.length % 4) % 4);
            const base64Fixed = (base64 + padding)
                .replace(/-/g, "+")
                .replace(/_/g, "/");

            const raw = window.atob(base64Fixed);
            return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
        }

        async function initPushNotifications() {
            try {
                if (!('serviceWorker' in navigator)) return;

                await navigator.serviceWorker.register('/service-worker.js');

                const permission = await Notification.requestPermission();
                if (permission !== "granted") return;

                const registration = await navigator.serviceWorker.ready;

                const vapidPublicKey = "BCm3ZnsNa0infPEeMBbj6ea3DyhGbHNo8KsH7_1ngdozGL4C-i7qkGT2ULjwrAbfbjkJLh8dSTSfe2kcmJ08xTk";
                const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

                let subscription = await registration.pushManager.getSubscription();

                if (!subscription) {
                    subscription = await registration.pushManager.subscribe({
                        userVisibleOnly: true,
                        applicationServerKey
                    });
                }

                if (subscription) {
                    await sendNoneSubscribeToNotificationsPacket(subscription);
                }
            } catch (e) {
                console.error("Push subscribe failed:", e);
                return;
            }
        }

        initPushNotifications();
    }, []);

    const sendGetMessagesPacket = async (channelId: number, startMessageId: number, messagesCount: number) => {
        const netStream = new NetStream();
        netStream.writeNumber(ID_FOR_SEND.REQUEST__GET__MESSAGES);
        netStream.writeStructure({
            channelId: "int",
            startMessageId: "int",
            messagesCount: "int",
        }, [
            channelId,
            startMessageId,
            messagesCount,
        ]);
        sendPacket(netStream.buffer);
    }
    const sendSubscribeToReceiveUserStatusPacket = async (userId: number) => {
        const netStream = new NetStream();
        netStream.writeNumber(ID_FOR_SEND.REQUEST__GET__USER_STATUS);
        netStream.writeStructure({
            userId: "int",
        }, [
            userId,
        ]);
        sendPacket(netStream.buffer);
    }

    const selectChannel = (channel: ChannelModel) => {
        if (!selectedChannelRef.current || selectedChannelRef.current.id !== channel.id) {
            sendSubscribeToReceiveUserStatusPacket(channel.interlocutorId!);

            if (channel.id && !channel.startMessagesLoaded) {
                sendGetMessagesPacket(
                    channel.id,
                    getMessages(channel.id).reduce((min, m) => m.id < min.id ? m : min).id,
                    49
                );

                channel.startMessagesLoaded = true;
                channelAfterMessagesLoading.current = channel;
            } else {
                setSelectedChannel(channel);
            }
        }
    }

    const isMobile = useWindowWidth() < 768;

    const lastIds = new Map<number, number>();
    const previewChannels: ChannelModel[] = [...channels].sort((a, b) => {
        if (!a.id || !b.id) return 0;

        if (!lastIds.has(a.id)) {
            lastIds.set(a.id, getMessages(a.id).at(-1)?.id ?? 0);
        }

        if (!lastIds.has(b.id)) {
            lastIds.set(b.id, getMessages(b.id).at(-1)?.id ?? 0);
        }

        return (lastIds.get(b.id)! - lastIds.get(a.id)!);
    });

    return (
        <div className={classes.screen}>
            {(!isMobile || !selectedChannel) &&
                <div className={classes.panel}>
                    <Search
                        text={searchText}
                        setText={setSearchText}
                        textRef={searchTextRef}
                        searching={searchSearching}
                        setSearching={setSearchSearching}
                        searchedUserIds={searchSearchedUsersIds}
                        setSearchedUsersIds={setSearchSearchedUsersIds}
                        users={users}
                        setUsers={setUsers}
                        usersRef={usersRef}
                        channels={channels}
                        setChannels={setChannels}
                        selectedChannel={selectedChannel}
                        selectChannel={selectChannel} />

                    <div className={classes.channelPreviews}>
                        {searchText.length === 0 && previewChannels.map(channel => (
                            <ChannelPreview
                                key={channel.id}
                                channel={channel}
                                onClick={() => selectChannel(channel)}
                                users={users}
                                getMessages={getMessages} />
                        ))}
                    </div>
                </div>
            }

            {!isMobile &&
                <div className={classes.separator} />
            }

            {(!isMobile || selectedChannel) &&
                <Channel
                    channel={selectedChannel}
                    setSelectedChannel={setSelectedChannel}
                    users={users}
                    getMessages={getMessages}
                    id={id} />
            }
        </div>
    )
};

export default Main;
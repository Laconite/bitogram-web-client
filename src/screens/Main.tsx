import { useState, useRef, useEffect, type RefObject, type Dispatch, type SetStateAction } from "react";
import useRefState from "@hooks/useRefState"
import { useWindowWidth } from "@hooks/useWindowWidth";
import { usePacketManager, TO_ID_BY_NAME, FROM_ID_BY_NAME } from "@contexts/PacketManagerContext";
import { NetStream, NetPacket } from "@utils/Net";
import Search from "./main/Search"
import ChannelPreview from "./main/ChannelPreview"
import Channel from "./main/Channel"
import classes from "./Main.module.css";

export type UserModel = {
    id: number;
    username?: string;
    fullName?: string;
};
export type ChannelModel = {
    id?: number;
    type?: string;
    interlocutorId?: number;

    startMessagesLoaded?: boolean;
    scroll?: number;
};
export type MessageModel = {
    id: number;
    senderId?: number;
    channelId?: number;
    text?: string;
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

    const { sendPacket, subscribePacket, unsubscribePacket } = usePacketManager();

    useEffect(() => {
        const handleGetInitDataPacket = (packet: NetPacket) => {
            console.log("Packet: Get init data");

            const channels = packet.values.channels;

            for (let channelIndex = 0; channelIndex < channels.length; channelIndex++) {
                const channel = packet.values.channels[channelIndex];
                const lastMessage = channel.lastMessage;

                addMessage({
                    id: lastMessage.id,
                    senderId: lastMessage.senderId,
                    channelId: channel.id,
                    text: lastMessage.text,
                });

                channelsRef.current.push({
                    id: channel.id,
                    type: channel.type,
                    interlocutorId: channel.interlocutorId,
                });
            }

            updateMessages();
            updateChannels();
            setUsers(packet.values.users);
        }
        const handleCreateChannelPacket = (packet: NetPacket) => {
            console.log("Packet: Create channel");

            const channel = packet.values;
            const lastMessage = channel.lastMessage;

            addMessage({
                id: lastMessage.id,
                senderId: lastMessage.senderId,
                channelId: channel.id,
                text: lastMessage.text,
            });

            setChannels(prev => [...prev, {
                id: packet.values.id,
                type: packet.values.type,
                interlocutorId: packet.values.interlocutorId,
            }]);

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
                    text: message.text
                });
            }

            updateMessages();
        }

        subscribePacket(FROM_ID_BY_NAME.GET_INIT_DATA, handleGetInitDataPacket);
        subscribePacket(FROM_ID_BY_NAME.CREATE_CHANNEL, handleCreateChannelPacket);
        subscribePacket(FROM_ID_BY_NAME.MESSAGE, handleMessagePacket);
        subscribePacket(FROM_ID_BY_NAME.GET_MESSAGES, handleGetMessagesPacket);

        return () => {
            unsubscribePacket(FROM_ID_BY_NAME.GET_INIT_DATA, handleGetInitDataPacket);
            unsubscribePacket(FROM_ID_BY_NAME.CREATE_CHANNEL, handleCreateChannelPacket);
            unsubscribePacket(FROM_ID_BY_NAME.MESSAGE, handleMessagePacket);
            unsubscribePacket(FROM_ID_BY_NAME.GET_MESSAGES, handleGetMessagesPacket);

        };
    }, [subscribePacket, unsubscribePacket]);

    const sendGetMessagesPacket = (channelId: number, startMessageId: number, messagesCount: number) => {
        const netStream = new NetStream();
        netStream.writeStructure({
            id: "int",
            channelId: "int",
            startMessageId: "int",
            countMessages: "int",
        }, [
            TO_ID_BY_NAME.GET_MESSAGES,
            channelId,
            startMessageId,
            messagesCount,
        ]);
        sendPacket(netStream.buffer);
    }

    const selectChannel = (channel: ChannelModel) => {
        if (!selectedChannelRef.current || selectedChannelRef.current.id !== channel.id) {
            if (channel.id && !channel.startMessagesLoaded) {
                sendGetMessagesPacket(
                    channel.id,
                    getMessages(channel.id).reduce((min, m) => m.id < min.id ? m : min).id,
                    19
                );

                channel.startMessagesLoaded = true;
            }

            setSelectedChannel(channel);
        }
    }

    const width = useWindowWidth();
    const isMobile = width < 768;

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

                    {searchText.length === 0 && channels.map(channel => (
                        <ChannelPreview key={channel.id} channel={channel} onClick={() => selectChannel(channel)} users={users} getMessages={getMessages} />
                    ))}

                    <div className={classes.surfaceFiller} />
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
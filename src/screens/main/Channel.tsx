import { useEffect, type Dispatch, type SetStateAction } from "react";
import { type UserModel, type ChannelModel, type MessageModel } from "../Main";
import classes from "./Channel.module.css";
import InfoPanel from "./channel/InfoPanel"
import Messages from "./channel/Messages"
import MessageInput from "./channel/MessageInput"

interface ChannelProps {
    channel: ChannelModel | null;
    setSelectedChannel: Dispatch<SetStateAction<ChannelModel | null>>;
    users: UserModel[];
    getMessages: (channelId: number) => MessageModel[];
    id: number;
}

const Channel = ({
    channel,
    setSelectedChannel,
    users,
    getMessages,
    id,
}: ChannelProps) => {
    useEffect(() => {
        if (!channel) return;

        window.history.pushState({ channelOpen: channel.id }, "");

        const handleBack = () => {
            setSelectedChannel(null);
        };

        window.addEventListener("popstate", handleBack);

        return () => {
            window.removeEventListener("popstate", handleBack);
        };
    }, [channel, setSelectedChannel]);

    if (channel) {
        return (
            <div className={classes.container}>
                <InfoPanel channel={channel} setSelectedChannel={setSelectedChannel} users={users} />
                <Messages messages={channel.id ? getMessages(channel.id) : []} channel={channel} id={id} />
                <MessageInput channel={channel} />
            </div>
        )
    } else {
        return (
            <div className={classes.placeholder}>
                Select a channel
            </div >
        )
    }
}

export default Channel;
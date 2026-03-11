import { type UserModel, type ChannelModel, type MessageModel } from "../Main";
import classes from './ChannelPreview.module.css';

type ChannelPreviewProps = {
    channel: ChannelModel;
    onClick?: (channel: ChannelModel) => void;
    users: UserModel[];
    getMessages: (channelId: number) => MessageModel[];
};

const ChannelPreview = ({ channel, onClick, users, getMessages }: ChannelPreviewProps) => {
    const channelName = users.find(user => user.id === channel.interlocutorId)?.fullName || "(^~^)";
    const messages = channel.id ? getMessages(channel.id) : [];

    return (
        <button className={classes.container} onClick={() => onClick?.(channel)}>
            <div className={classes.avatar}></div>

            <div className={classes.info}>
                <div className={classes.fullName}>{channelName}</div>
                {messages.length != 0 &&
                    <div className={classes.lastMessageText}>{messages[messages.length - 1].text}</div>
                }
            </div>
        </button>
    )
}

export default ChannelPreview;
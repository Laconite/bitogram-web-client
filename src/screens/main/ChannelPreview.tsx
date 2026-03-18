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
    const lastMessage = messages.length != 0 ? messages[messages.length - 1] : null;

    return (
        <button className={classes.container} onClick={() => onClick?.(channel)}>
            <div className={classes.avatar}></div>

            <div className={classes.info}>
                <div className={classes.infoRow}>
                    <div className={classes.fullName}>{channelName}</div>
                    {lastMessage != null && lastMessage.createdAt != null &&
                        <div className={classes.lastMessageTime}>
                            {new Date(Number(lastMessage.createdAt) * 1000).toLocaleTimeString([], {
                                hour: 'numeric',
                                minute: '2-digit'
                            })}
                        </div>
                    }
                </div>

                {lastMessage != null && lastMessage.text != null &&
                    <div className={classes.lastMessageText}>{lastMessage.text}</div>
                }
            </div>
        </button>
    )
}

export default ChannelPreview;
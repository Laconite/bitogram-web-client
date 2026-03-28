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

    const formatMessageDate = (timestamp: number) => {
        const messageDate = new Date(timestamp * 1000);
        const now = new Date();

        const isToday =
            messageDate.getDate() === now.getDate() &&
            messageDate.getMonth() === now.getMonth() &&
            messageDate.getFullYear() === now.getFullYear();

        const diffTime = now.getTime() - messageDate.getTime();
        const diffDays = diffTime / (1000 * 60 * 60 * 24);

        if (isToday) {
            return messageDate.toLocaleTimeString([], {
                hour: 'numeric',
                minute: '2-digit',
            });
        } else if (diffDays < 7) {
            return messageDate.toLocaleDateString('en-EN', { weekday: 'short' });
        } else {
            const pad = (n: number) => n.toString().padStart(2, '0');
            return `${pad(messageDate.getDate())}.${pad(messageDate.getMonth() + 1)}.${messageDate.getFullYear().toString().slice(-2)}`;
        }
    };

    return (
        <button className={classes.container} onClick={() => onClick?.(channel)}>
            <div className={classes.avatar}></div>

            <div className={classes.info}>
                <div className={classes.infoRow}>
                    <div className={classes.fullName}>{channelName}</div>
                    {lastMessage != null && lastMessage.createdAt != null &&
                        <div className={classes.lastMessageTime}>
                            {formatMessageDate(Number(lastMessage.createdAt))}
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
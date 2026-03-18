import { type MessageModel } from "../../../Main";
import classes from "./Message.module.css";

interface MessagesProps {
    message: MessageModel;
    id: number;
}

const Messages = ({
    message,
    id
}: MessagesProps) => {
    const isMy = message.senderId === id;
    const messageClass = isMy ? classes['message-my'] : classes['message-other'];

    return (
        <div className={classes.container}>
            <div className={`${classes.message} ${messageClass}`}>
                <div className={classes.messageText}>{message.text}</div>
                <div className={classes.messageTime}>
                    {new Date(Number(message.createdAt) * 1000).toLocaleTimeString([], {
                        hour: 'numeric',
                        minute: '2-digit'
                    })}
                </div>
            </div>
        </div>
    );
};

export default Messages;
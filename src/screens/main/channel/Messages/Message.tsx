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
                {message.text}
            </div>
        </div>
    );
};

export default Messages;
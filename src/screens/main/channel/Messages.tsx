import { useEffect, useRef } from "react";
import { type ChannelModel, type MessageModel } from "../../Main";
import classes from "./Messages.module.css";
import Message from "./Messages/Message";

interface MessagesProps {
    messages: MessageModel[] | undefined;
    channel: ChannelModel;
    id: number;
}

const Messages = ({
    messages,
    channel,
    id,
}: MessagesProps) => {
    const containerElementRef = useRef<HTMLDivElement | null>(null);
    const shouldScrollToBottomRef = useRef(true);

    useEffect(() => {
        const container = containerElementRef.current;
        if (!container) return;

        shouldScrollToBottomRef.current =
            container.scrollHeight -
            container.scrollTop -
            container.clientHeight <
            50;

        container.scrollTop = channel.scroll || container.scrollTop;

        const handleScroll = () => {
            channel.scroll = container.scrollTop;
            shouldScrollToBottomRef.current =
                container.scrollHeight -
                container.scrollTop -
                container.clientHeight <
                50;
        };

        container.addEventListener("scroll", handleScroll);

        return () => container.removeEventListener("scroll", handleScroll);
    }, [channel.id]);

    useEffect(() => {
        const containerElement = containerElementRef.current;
        if (!containerElement) return;

        if (shouldScrollToBottomRef.current) {
            containerElement.scrollTo({
                top: containerElement.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages]);

    return (
        <div
            className={classes.container}
            ref={containerElementRef}
        >
            <div className={classes.messages}>
                {messages?.map(message => (
                    <Message
                        key={message.id}
                        message={message}
                        id={id}
                    />
                ))}
            </div>
        </div>
    );
};

export default Messages;
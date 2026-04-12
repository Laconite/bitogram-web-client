import { useEffect, useLayoutEffect, useRef } from "react";
import { usePacketManager, ID_FOR_SEND } from "@contexts/PacketManagerContext";
import { NetStream } from "@utils/Net";
import { type ChannelModel, type MessageModel } from "../../Main";
import classes from "./Messages.module.css";
import InfoText from "./Messages/InfoText";
import MessagesDate from "./Messages/MessagesDate";
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
    const { sendPacket } = usePacketManager();

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

    const containerElementRef = useRef<HTMLDivElement | null>(null);

    useLayoutEffect(() => {
        if (channel.shouldScrollToBottom === undefined) {
            channel.shouldScrollToBottom = false;
        }

        const container = containerElementRef.current;
        if (!container) return;

        container.scrollTop = channel.scroll || container.scrollTop;

        const handleScroll = () => {
            channel.scroll = container.scrollTop;
            channel.shouldScrollToBottom =
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

        if (channel.shouldScrollToBottom) {
            containerElement.scrollTo({
                top: containerElement.scrollHeight,
                behavior: "smooth",
            });
        }
    }, [messages]);

    useEffect(() => {
        const container = containerElementRef.current;
        if (!container) return;

        const handleScrollTopCheck = () => {
            if (container.scrollTop < 200 && !channel.messagesLoading) {
                if (!channel.id || !messages?.length)
                    return;

                if (channel.firstMessageId != messages[0].id) {
                    console.log("GET MESSAGES!!!");
                    sendGetMessagesPacket(channel.id, messages[0].id, 20);
                    channel.messagesLoading = true;
                }
            }
        };

        container.addEventListener("scroll", handleScrollTopCheck);

        return () =>
            container.removeEventListener("scroll", handleScrollTopCheck);
    }, [channel.id, messages]);

    useLayoutEffect(() => {
        if (channel.messagesLoading === undefined) {
            channel.messagesLoading = true;
        }

        const container = containerElementRef.current;
        if (!container || !messages?.length) return;
        if (!channel.messagesLoading) return;
        channel.messagesLoading = false;

        if (!channel.prevScrollHeight) {
            channel.prevScrollHeight = 0;
        }

        const diff = container.scrollHeight - channel.prevScrollHeight;
        container.scrollTop += diff;
        channel.prevScrollHeight = container.scrollHeight;
    }, [messages]);

    return (
        <div
            className={classes.container}
            ref={containerElementRef}
        >
            <div className={classes.messages}>
                {messages?.map((message, index) => {
                    const prevMessage = messages[index - 1];

                    const currentDate = new Date(Number(message.createdAt) * 1000);
                    const prevDate = prevMessage
                        ? new Date(Number(prevMessage.createdAt) * 1000)
                        : null;

                    let isNewDay = prevDate && currentDate.toDateString() !== prevDate.toDateString();

                    const elements = [];

                    if (!prevDate) {
                        if (message.id == channel.firstMessageId) {
                            elements.push(
                                <InfoText key={"bc"} text={"The beginning of communication"} />
                            );

                            isNewDay = true;
                        } else {
                            elements.push(
                                <InfoText key={"loading"} text={"Loading..."} />
                            );
                        }
                    }

                    if (isNewDay && message.createdAt) {
                        elements.push(
                            <MessagesDate key={`date-${message.id}`} timestamp={message.createdAt} />
                        );
                    }

                    elements.push(
                        <Message key={`message-${message.id}`} message={message} id={id} />
                    );

                    return elements;
                })}
            </div>
        </div>
    );
};

export default Messages;
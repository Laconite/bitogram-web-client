import { useState } from "react";
import { isMobile } from "@hooks/useIsMobile";
import { usePacketManager, ID_FOR_SEND } from "@contexts/PacketManagerContext";
import { NetStream } from "@utils/Net";
import { type ChannelModel } from "../../Main";
import Textarea from "@components/surface/Textarea"
import classes from "./MessageInput.module.css";

interface MessageInputProps {
    channel: ChannelModel;
}

const MessageInput = ({
    channel
}: MessageInputProps) => {
    const [messageText, setMessageText] = useState("");

    const { sendPacket } = usePacketManager();

    const sendCreateChannelPacket = async (type: string, interlocutorId: number, messageText: string) => {
        const netStream = new NetStream();
        netStream.writeNumber(ID_FOR_SEND.REQUEST__CREATE__CHANNEL);
        netStream.writeStructure({
            type: "string",
            interlocutorId: "int",
            messageText: "string",
        }, [
            type,
            interlocutorId,
            messageText,
        ]);
        sendPacket(netStream.buffer);
    }
    const sendMessagePacket = async (channelId: number, messageText: string) => {
        const netStream = new NetStream();
        netStream.writeNumber(ID_FOR_SEND.REQUEST__CREATE__MESSAGE);
        netStream.writeStructure({
            channelId: "int",
            messageText: "string",
        }, [
            channelId,
            messageText,
        ]);
        sendPacket(netStream.buffer);
    }

    const isValidMessage = (messageText: string): boolean => {
        messageText = messageText.trim();
        return messageText.length >= 1 && messageText.length <= 4096;
    }

    const handleSendMessage = (): void => {
        const sendMessageText = messageText.trim();

        if (isValidMessage(sendMessageText)) {
            if (!channel.id) {
                if (!channel.interlocutorId)
                    return;

                sendCreateChannelPacket("personal", channel.interlocutorId, sendMessageText);
            } else {
                sendMessagePacket(channel.id, sendMessageText);
            }

            setMessageText("");
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
        if (e.key === "Enter" && !isMobile && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    return (
        <div className={classes.container}>
            <Textarea
                className={classes.inputMessageField}
                placeholder={"Write a message..."}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyDown={handleKeyDown}
            />

            <button className={classes.buttonSend} onClick={() => handleSendMessage()}>
                <svg className={classes.buttonSendIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M4.93,20.49l13.85-13.85v12.14c0,.55.45,1,1,1h0c.55,0,1-.45,1-1V4.22s0,0,0,0c0-.26-.1-.51-.29-.71s-.45-.29-.71-.29h0s-14.56,0-14.56,0c-.55,0-1,.45-1,1h0c0,.55.45,1,1,1h12.14S3.51,19.07,3.51,19.07c-.39.39-.39,1.02,0,1.41h0c.39.39,1.02.39,1.41,0Z" />
                </svg>
            </button>
        </div>
    )
}

export default MessageInput;
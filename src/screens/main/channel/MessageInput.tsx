import { useState } from "react";
import { usePacketManager, TO_ID_BY_NAME } from "@contexts/PacketManagerContext";
import { NetStream } from "@utils/Net";
import { type ChannelModel } from "../../Main";
import Input from "@components/surface/Input"
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
        netStream.writeStructure({
                id: "int",
                type: "string",
                interlocutorId: "int",
                messageText: "string"
            }, [
                TO_ID_BY_NAME.CREATE_CHANNEL,
                type,
                interlocutorId,
                messageText
            ]
        );
        sendPacket(netStream.buffer);
    }
    const sendMessagePacket = async (channelId: number, messageText: string) => {
        const netStream = new NetStream();
        netStream.writeStructure({
                id: "int",
                channelId: "int",
                messageText: "string"
            }, [
                TO_ID_BY_NAME.MESSAGE,
                channelId,
                messageText
            ]
        );
        sendPacket(netStream.buffer);
    }

    const handleSendMessage = (): void => {
        if (!channel.id) {
            if (!channel.interlocutorId) 
                return;

            sendCreateChannelPacket("personal", channel.interlocutorId, messageText);
        } else {
            sendMessagePacket(channel.id, messageText);
        }

        setMessageText("");
    }
    
    const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>): void => {
        if (e.key == "Enter") {
            handleSendMessage();
        }
    };

    return (
        <div className={classes.container} onKeyDown={handleKeyDown}>
            <Input
                placeholder={"Write a message..."}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
            />
        </div>
    )
}

export default MessageInput;
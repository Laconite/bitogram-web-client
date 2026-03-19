import { type Dispatch, type SetStateAction } from "react";
import { useWindowWidth } from "@hooks/useWindowWidth";
import { type ChannelModel, type UserModel } from "../../Main";
import classes from "./InfoPanel.module.css";

interface InfoPanelProps {
    channel: ChannelModel;
    setSelectedChannel: Dispatch<SetStateAction<ChannelModel | null>>;
    users: UserModel[];
}

const InfoPanel = ({
    channel,
    setSelectedChannel,
    users
}: InfoPanelProps) => {
    const isMobile = useWindowWidth() < 768;
    const interlocutor = users.find(user => user.id === channel.interlocutorId);
    const channelName = interlocutor?.fullName || "(^~^)";
    const statusText = interlocutor?.isOnline ? "online" : "last seen recently";

    return (
        <div className={classes.container}>
            {isMobile && (
                <button className={classes.buttonBack} onClick={() => setSelectedChannel(null)}>
                    <svg className={classes.buttonBackIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path d="M23,11H3.41L12,2.41c.39-.39.39-1.02,0-1.41h0c-.39-.39-1.02-.39-1.41,0L.29,11.29h0c-.18.18-.29.43-.29.71s.11.53.29.71h0s10.29,10.29,10.29,10.29c.39.39,1.02.39,1.41,0h0c.39-.39.39-1.02,0-1.41L3.41,13h19.59c.55,0,1-.45,1-1h0c0-.55-.45-1-1-1Z"/>
                    </svg>
                </button>
            )}
            
            <div className={classes.info}>
                <div className={classes.name}>{channelName}</div>
                <div className={classes.status}>{statusText}</div>    
            </div>
        </div>
    )
}

export default InfoPanel;
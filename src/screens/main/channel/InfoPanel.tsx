import { type Dispatch, type SetStateAction } from "react";
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
    const channelName = users.find(user => user.id === channel.interlocutorId)?.fullName || "(^~^)";
    
    return (
        <div className={classes.container}>
            <div className={classes.name}>{channelName}</div>
            <div className={classes.status}>last seen recently</div>    
        </div>
    )
}

export default InfoPanel;
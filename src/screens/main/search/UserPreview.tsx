import { type UserModel } from "../../Main";
import classes from './UserPreview.module.css';

type UserPreviewProps = {
    user: UserModel;
    onClick?: (user: UserModel) => void;
};

const UserPreview = ({ user, onClick }: UserPreviewProps) => {
    return (
        <button className={classes.container} onClick={() => onClick?.(user)}>
            <div className={classes.avatar}></div>

            <div className={classes.info}>
                <div className={classes.fullName}>{user.fullName}</div>
                <div className={classes.lastMessageText}>{user.username}</div>
            </div>
        </button>
    )
}

export default UserPreview;
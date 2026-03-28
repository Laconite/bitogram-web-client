import { type MessageModel } from "../../../Main";
import classes from "./MessagesDate.module.css";

interface MessagesDateProps {
    timestamp: BigInt;
}

const MessagesDate = ({ timestamp }: MessagesDateProps) => {
    const date = new Date(Number(timestamp) * 1000);
    const now = new Date();

    const isCurrentYear = date.getFullYear() === now.getFullYear();

    const formattedDate = date.toLocaleDateString('en-EN', {
        month: "long",
        day: "numeric",
        ...(isCurrentYear ? {} : { year: "numeric" }),
    });

    return (
        <div className={classes.container}>
            <div className={classes.date}>
                {formattedDate}
            </div>
        </div>
    );
};

export default MessagesDate;
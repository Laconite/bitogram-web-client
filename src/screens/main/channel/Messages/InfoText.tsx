import { type MessageModel } from "../../../Main";
import classes from "./InfoText.module.css";

interface InfoTextProps {
    text: string;
}

const InfoText = ({
    text
}: InfoTextProps) => {
    return (
        <div className={classes.container}>
            <div className={classes.text}>
                {text}
            </div>
        </div>
    );
};

export default InfoText;
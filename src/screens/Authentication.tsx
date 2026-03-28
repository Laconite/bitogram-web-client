import { useState, useEffect, type RefObject } from "react";
import { usePacketManager, TO_ID_BY_NAME, FROM_ID_BY_NAME } from "@contexts/PacketManagerContext";
import { NetStream, NetPacket } from "@utils/Net";
import Input from "@components/background/Input"
import classes from "./Authentication.module.css";

interface AuthenticationProps {
    sessionKeyRef: RefObject<Uint8Array | null>;
    username: string;
    setUsername: (username: string) => void;
    usernameRef: RefObject<string>;
    fullName: string;
    setFullName: (fullName: string) => void;
    passwordSaltRef: RefObject<Uint8Array | null>;
    setId: (id: number | null) => void;
}

const Authentication = ({ 
    sessionKeyRef,
    username, 
    setUsername, 
    usernameRef, 
    fullName, 
    setFullName, 
    passwordSaltRef, 
    setId,
}: AuthenticationProps) => {
    const PageId = {
        ENTERING_USERNAME: 0,
        ENTERING_PASSWORD: 1,
        ENTERING_REGISTRATION_DATA: 2,
        ENTERING_CONFIRMATION_CODE: 3
    };

    const [pageId, setPageId] = useState(PageId.ENTERING_USERNAME);
    const [password, setPassword] = useState("");
    const [repeatPassword, setRepeatPassword] = useState("");
    const [email, setEmail] = useState("");
    const [confirmationCode, setConfirmationCode] = useState("");

    const [usernameError, setUsernameError] = useState(false);
    const [fullNameError, setFullNameError] = useState(false);
    const [passwordError, setPasswordError] = useState(false);
    const [repeatPasswordError, setRepeatPasswordError] = useState(false);
    const [emailError, setEmailError] = useState(false);
    const [confirmationCodeError, setConfirmationCodeError] = useState(false);

    const { 
        subscribePacket, 
        unsubscribePacket, 
        
        sendCheckUsernamePacket, 
        sendGetPasswordSaltPacket, 
        sendAuthorizationPacket,
        sendRequestConfirmationCodePacket, 
        sendRegistrationPacket, 
        sendGetInitDataPacket
    } = usePacketManager();

    useEffect(() => {
        const handleSessionPacket = (packet: NetPacket) => {
            console.log("Packet: Session");
            console.log("\t", packet.values.key);
            sessionKeyRef.current = packet.values.key;
        }
        const handleCheckUsernamePacket = (packet: NetPacket) => {
            console.log("Packet: Check username");

            const UsernameStatus = {
                FREE: 0,
                BUSY: 1,
            };
            Object.freeze(UsernameStatus);

            if (packet.values.usernameStatus == UsernameStatus.FREE) {
                console.log("\tStatus: FREE");
                setPageId(PageId.ENTERING_REGISTRATION_DATA)
            } else if (packet.values.usernameStatus == UsernameStatus.BUSY) {
                console.log("\tStatus: BUSY");
                sendGetPasswordSaltPacket();
            }
        }
        const handleGetPasswordSaltPacket = (packet: NetPacket) => {
            console.log("Packet: Get password salt");

            passwordSaltRef.current = packet.values.passwordSalt;
            setPageId(PageId.ENTERING_PASSWORD);
        }
        const handleAuthorizationPacket = (packet: NetPacket) => {
            console.log("Packet: Authorization");

            setId(packet.values.userId);
            console.log("\tUser ID: ", packet.values.userId);

            sendGetInitDataPacket();
        }
        const handleRequestConfirmationCodePacket = (packet: NetPacket) => {
            console.log("Packet: Request confirmation code");

            setPageId(PageId.ENTERING_CONFIRMATION_CODE);
        }
        const handleRegistrationPacket = (packet: NetPacket) => {
            console.log("Packet: Registration");

            setId(packet.values.userId);
            console.log("\tUser ID: ", packet.values.userId);

            sendGetInitDataPacket();
        }

        subscribePacket(FROM_ID_BY_NAME.SESSION, handleSessionPacket);
        subscribePacket(FROM_ID_BY_NAME.CHECK_USERNAME, handleCheckUsernamePacket);
        subscribePacket(FROM_ID_BY_NAME.GET_PASSWORD_SALT, handleGetPasswordSaltPacket);
        subscribePacket(FROM_ID_BY_NAME.AUTHORIZATION, handleAuthorizationPacket);
        subscribePacket(FROM_ID_BY_NAME.REQUEST_CONFIRMATION_CODE, handleRequestConfirmationCodePacket);
        subscribePacket(FROM_ID_BY_NAME.REGISTRATION, handleRegistrationPacket);

        return () => {
            unsubscribePacket(FROM_ID_BY_NAME.SESSION, handleSessionPacket);
            unsubscribePacket(FROM_ID_BY_NAME.CHECK_USERNAME, handleCheckUsernamePacket);
            unsubscribePacket(FROM_ID_BY_NAME.GET_PASSWORD_SALT, handleGetPasswordSaltPacket);
            unsubscribePacket(FROM_ID_BY_NAME.AUTHORIZATION, handleAuthorizationPacket);
            unsubscribePacket(FROM_ID_BY_NAME.REQUEST_CONFIRMATION_CODE, handleRequestConfirmationCodePacket);
            unsubscribePacket(FROM_ID_BY_NAME.REGISTRATION, handleRegistrationPacket);
        };
    }, [subscribePacket, unsubscribePacket]);

    const isValidUsername = (username: string) => {
        return username.length >= 2 && username.length <= 32;
    }
    const isValidPassword = (password: string) => {
        return password.length >= 8;
    }
    const isValidFullName = (fullName: string) => {
        return fullName.length >= 1 && fullName.length <= 64;
    }
    const isValidEmail = (email: string) => {
        const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return regex.test(email);
    }
    const isValidConfirmationCode = (confirmationCode: string) => {
        return confirmationCode.length == 6;
    }

    const handleEnteringUsername = async () => {
        if (isValidUsername(usernameRef.current)) {
            setUsernameError(false);
        } else {
            setUsernameError(true);
            return;
        }

        sendCheckUsernamePacket(usernameRef.current);
    };
    const handleEnteringPassword = async () => {
        if (isValidPassword(password)) {
            setPasswordError(false);
        } else {
            setPasswordError(true);
            return;
        }

        if (passwordSaltRef?.current == null)
            return;

        sendAuthorizationPacket(password, passwordSaltRef.current);
    };
    const handleEnteringRegistrationData = async () => {
        let error = false;

        if (isValidFullName(fullName)) {
            setFullNameError(false);
        } else {
            setFullNameError(true);
            error = true;
        }

        if (isValidPassword(password)) {
            setPasswordError(false);
        } else {
            setPasswordError(true);
            error = true;
        }

        if (isValidPassword(repeatPassword) && password == repeatPassword) {
            setRepeatPasswordError(false);
        } else {
            setRepeatPasswordError(true);
            error = true;
        }

        if (isValidEmail(email)) {
            setEmailError(false);
        } else {
            setEmailError(true);
            error = true;
        }

        if (error)
            return;

        sendRequestConfirmationCodePacket(email);
        setPageId(PageId.ENTERING_CONFIRMATION_CODE);
    }
    const handleEnteringConfirmationCode = async () => {
        if (isValidConfirmationCode(confirmationCode)) {
            setConfirmationCodeError(false);
        } else {
            setConfirmationCodeError(true);
            return;
        }

        passwordSaltRef.current = new Uint8Array(32);
        crypto.getRandomValues(passwordSaltRef.current);

        sendRegistrationPacket(password, passwordSaltRef.current, fullName, confirmationCode);
    }

    const pages = [
        {
            fields: [
                { id: "username", type: "text", placeholder: "Username", value: username, setValue: setUsername, isError: usernameError },
            ],
            button: {
                text: "Next", onClick: handleEnteringUsername
            },
        },
        {
            fields: [
                { id: "password", type: "password", placeholder: "Password", value: password, setValue: setPassword, isError: passwordError },
            ],
            button: {
                text: "Log in", onClick: handleEnteringPassword
            },
        },
        {
            fields: [
                { id: "fullName", type: "text", placeholder: "Full name", value: fullName, setValue: setFullName, isError: fullNameError },
                { id: "password", type: "password", placeholder: "Password", value: password, setValue: setPassword, isError: passwordError },
                { id: "repeatPassword", type: "password", placeholder: "Repeat password", value: repeatPassword, setValue: setRepeatPassword, isError: repeatPasswordError },
                { id: "email", type: "text", placeholder: "Email", value: email, setValue: setEmail, isError: emailError },
            ],
            button: {
                text: "Next", onClick: handleEnteringRegistrationData
            },
        },
        {
            fields: [
                { id: "confirmationCode", type: "text", placeholder: "Code", value: confirmationCode, setValue: setConfirmationCode, isError: confirmationCodeError },
            ],
            button: {
                text: "Register", onClick: handleEnteringConfirmationCode
            },
        },
    ]

    const page = pages[pageId];

    const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>): void => {
        if (e.key == "Enter") {
            page.button.onClick();
        }
    };

    return (
        <div className={classes.screen} onKeyDown={handleKeyDown}>
            <div className={classes.form}>
                {page.fields.map((field) => (
                    <Input
                        key={field.id}
                        type={field.type}
                        placeholder={field.placeholder}
                        value={field.value}
                        onChange={(e) => field.setValue(e.target.value)}
                        isError={field.isError}
                    />
                ))}

                <button className={classes.button} onClick={() => page.button.onClick()}>
                    {page.button.text}
                </button>
            </div>
        </div>
    );
};

export default Authentication;
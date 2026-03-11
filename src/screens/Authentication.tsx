import { useState, useEffect, type RefObject } from "react";
import { usePacketManager, TO_ID_BY_NAME, FROM_ID_BY_NAME } from "@contexts/PacketManagerContext";
import { NetStream, NetPacket } from "@utils/Net";
import Input from "@components/background/Input"
import classes from "./Authentication.module.css";

interface AuthenticationProps {
    username: string;
    setUsername: (username: string) => void;
    usernameRef: RefObject<string>;
    fullName: string;
    setFullName: (fullName: string) => void;
    passwordSaltRef: RefObject<Uint8Array | null>;
    setId: (id: number | null) => void;
}

const Authentication = ({ username, setUsername, usernameRef, fullName, setFullName, passwordSaltRef, setId }: AuthenticationProps) => {
    const PageId = {
        ENTERING_USERNAME: 0,
        ENTERING_PASSWORD: 1,
        ENTERING_FULLNAME: 2,
        CREATING_PASSWORD: 3,
        ENTERING_EMAIL: 4,
        ENTERING_CONFIRMATION_CODE: 5
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

    const { sendPacket, subscribePacket, unsubscribePacket } = usePacketManager();

    const sendCheckUsernamePacket = async (username: string) => {
        let netStream = new NetStream();
        netStream.writeStructure({
            id: "int",
            username: "string"
        }, [
            TO_ID_BY_NAME.CHECK_USERNAME,
            username
        ]);
        sendPacket(netStream.buffer);
    }
    const sendGetPasswordSaltPacket = async () => {
        let netStream = new NetStream();
        netStream.writeStructure({
            id: "int"
        }, [
            TO_ID_BY_NAME.GET_PASSWORD_SALT
        ]);
        sendPacket(netStream.buffer);
    }
    const sendAuthorizationPacket = async (password: string, passwordSalt: Uint8Array) => {
        const passwordHash = await calculatePasswordHash(password, passwordSalt);

        let netStream = new NetStream();
        netStream.writeStructure({
            id: "int",
            passwordHash: "bytes"
        }, [
            TO_ID_BY_NAME.AUTHORIZATION, passwordHash
        ]);
        sendPacket(netStream.buffer);
    }
    const sendRequestConfirmationCodePacket = async (email: string) => {
        let netStream = new NetStream();
        netStream.writeStructure({ id: "int", email: "string" }, [TO_ID_BY_NAME.REQUEST_CONFIRMATION_CODE, email]);
        sendPacket(netStream.buffer);
    }
    const sendRegistrationPacket = async (password: string, passwordSalt: Uint8Array, fullName: string, confirmationCode: string) => {
        let passwordHash = await calculatePasswordHash(password, passwordSalt);

        let netStream = new NetStream();
        netStream.writeStructure({
            id: "int",
            passwordSalt: "bytes",
            passwordHash: "bytes",
            fullName: "string",
            confirmationCode: "string"
        }, [
            TO_ID_BY_NAME.REGISTRATION,
            passwordSalt,
            passwordHash,
            fullName,
            confirmationCode
        ]);
        sendPacket(netStream.buffer);
    }
    const sendGetInitDataPacket = async () => {
        let netStream = new NetStream();
        netStream.writeStructure({
            id: "int"
        }, [
            TO_ID_BY_NAME.GET_INIT_DATA
        ]);
        sendPacket(netStream.buffer);
    }

    useEffect(() => {
        const handlePacketCheckUsername = (packet: NetPacket) => {
            console.log("Packet: Check username");

            const UsernameStatus = {
                FREE: 0,
                BUSY: 1,
            };
            Object.freeze(UsernameStatus);

            if (packet.values.usernameStatus == UsernameStatus.FREE) {
                console.log("\tStatus: FREE");
                setPageId(PageId.ENTERING_FULLNAME)
            } else if (packet.values.usernameStatus == UsernameStatus.BUSY) {
                console.log("\tStatus: BUSY");
                sendGetPasswordSaltPacket();
            }
        }
        const handlePacketGetPasswordSalt = (packet: NetPacket) => {
            console.log("Packet: Get password salt");

            passwordSaltRef.current = packet.values.passwordSalt;
            setPageId(PageId.ENTERING_PASSWORD);
        }
        const handlePacketAuthorization = (packet: NetPacket) => {
            console.log("Packet: Authorization");

            setId(packet.values.userId);
            console.log("\tUser ID: ", packet.values.userId);

            sendGetInitDataPacket();
        }
        const handlePacketRequestConfirmationCode = (packet: NetPacket) => {
            console.log("Packet: Request confirmation code");

            setPageId(PageId.ENTERING_CONFIRMATION_CODE);
        }
        const handlePacketRegistration = (packet: NetPacket) => {
            console.log("Packet: Registration");

            setId(packet.values.userId);
            console.log("\tUser ID: ", packet.values.userId);

            sendGetInitDataPacket();
        }

        subscribePacket(FROM_ID_BY_NAME.CHECK_USERNAME, handlePacketCheckUsername);
        subscribePacket(FROM_ID_BY_NAME.GET_PASSWORD_SALT, handlePacketGetPasswordSalt);
        subscribePacket(FROM_ID_BY_NAME.AUTHORIZATION, handlePacketAuthorization);
        subscribePacket(FROM_ID_BY_NAME.REQUEST_CONFIRMATION_CODE, handlePacketRequestConfirmationCode);
        subscribePacket(FROM_ID_BY_NAME.REGISTRATION, handlePacketRegistration);

        return () => {
            unsubscribePacket(FROM_ID_BY_NAME.CHECK_USERNAME, handlePacketCheckUsername);
            unsubscribePacket(FROM_ID_BY_NAME.GET_PASSWORD_SALT, handlePacketGetPasswordSalt);
            unsubscribePacket(FROM_ID_BY_NAME.AUTHORIZATION, handlePacketAuthorization);
            unsubscribePacket(FROM_ID_BY_NAME.REQUEST_CONFIRMATION_CODE, handlePacketRequestConfirmationCode);
            unsubscribePacket(FROM_ID_BY_NAME.REGISTRATION, handlePacketRegistration);
        };
    }, [subscribePacket, unsubscribePacket]);

    const calculatePasswordHash = async (password: string, salt: Uint8Array) => {
        const encoder = new TextEncoder();
        const passwordBytes = encoder.encode(password);
        const combined = new Uint8Array(passwordBytes.length + salt.length);

        combined.set(passwordBytes);
        combined.set(salt, passwordBytes.length);

        return new Uint8Array(await crypto.subtle.digest("SHA-256", combined));
    };

    const checkUsername = (username: string) => {
        return username.length >= 2 && username.length <= 32;
    }
    const checkPassword = (password: string) => {
        return password.length >= 8;
    }
    const checkFullName = (fullName: string) => {
        return fullName.length >= 1 && fullName.length <= 64;
    }
    const checkConfirmationCode = (confirmationCode: string) => {
        return confirmationCode.length == 6;
    }

    const handleEnteringUsername = async () => {
        if (checkUsername(usernameRef.current)) {
            setUsernameError(false);
        } else {
            setUsernameError(true);
            return;
        }

        sendCheckUsernamePacket(usernameRef.current);
    };
    const handleEnteringPassword = async () => {
        if (checkPassword(password)) {
            setPasswordError(false);
        } else {
            setPasswordError(true);
            return;
        }

        if (passwordSaltRef?.current == null)
            return;

        sendAuthorizationPacket(password, passwordSaltRef.current);
    };
    const handleEnteringFullName = async () => {
        if (checkFullName(fullName)) {
            setFullNameError(false);
            setPageId(PageId.CREATING_PASSWORD);
        } else {
            setFullNameError(true);
        }
    }
    const handleCreatingPassword = async () => {
        let error = false;

        if (checkPassword(password)) {
            setPasswordError(false);
        } else {
            setPasswordError(true);
            error = true;
        }

        if (checkPassword(repeatPassword) && password == repeatPassword) {
            setRepeatPasswordError(false);
        } else {
            setRepeatPasswordError(true);
            error = true;
        }

        if (error)
            return;

        setPageId(PageId.ENTERING_EMAIL);
    }
    const handleEnteringEmail = async () => {
        sendRequestConfirmationCodePacket(email);
    }
    const handleEnteringConfirmationCode = async () => {
        if (checkConfirmationCode(confirmationCode)) {
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
                { placeholder: "Username", value: username, setValue: setUsername, isError: usernameError },
            ],
            button: {
                text: "Next", onClick: handleEnteringUsername
            },
        },
        {
            fields: [
                { placeholder: "Password", value: password, setValue: setPassword, isError: passwordError },
            ],
            button: {
                text: "Log in", onClick: handleEnteringPassword
            },
        },
        {
            fields: [
                { placeholder: "Full name", value: fullName, setValue: setFullName, isError: fullNameError },
            ],
            button: {
                text: "Next", onClick: handleEnteringFullName
            },
        },
        {
            fields: [
                { placeholder: "Password", value: password, setValue: setPassword, isError: passwordError },
                { placeholder: "Repeat password", value: repeatPassword, setValue: setRepeatPassword, isError: repeatPasswordError },
            ],
            button: {
                text: "Next", onClick: handleCreatingPassword
            },
        },
        {
            fields: [
                { placeholder: "Email", value: email, setValue: setEmail, isError: emailError },
            ],
            button: {
                text: "Send code", onClick: handleEnteringEmail
            },
        },
        {
            fields: [
                { placeholder: "Code", value: confirmationCode, setValue: setConfirmationCode, isError: confirmationCodeError },
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
                {page.fields.map((field, index) => (
                    <Input
                        key={index}
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
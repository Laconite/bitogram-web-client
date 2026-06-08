import { useState, useEffect, type RefObject, use } from "react";
import { Argon2, Argon2Mode } from '@sphereon/isomorphic-argon2';
import { useProtocol } from "@contexts/ProtocolProvider";
import Input from "@components/background/Input"
import classes from "./Authentication.module.css";

const generateSalt = (): Uint8Array => {
    return window.crypto.getRandomValues(new Uint8Array(16));
};

const hexToBytes = (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
};

const hashPassword = async (password: string, salt: Uint8Array): Promise<Uint8Array> => {
    const result = await Argon2.hash(password, salt, {
        hashLength: 16,
        memory: 16384,
        parallelism: 1,
        mode: Argon2Mode.Argon2id,
        iterations: 3,
    });

    return hexToBytes(result.hex);
}

interface AuthenticationProps {
    username: string;
    setUsername: (username: string) => void;
    usernameRef: RefObject<string>;
    fullName: string;
    setFullName: (fullName: string) => void;
    passwordSaltRef: RefObject<Uint8Array | null>;
}

const Authentication = ({
    username,
    setUsername,
    usernameRef,
    fullName,
    setFullName,
    passwordSaltRef,
}: AuthenticationProps) => {
    const protocol = useProtocol();

    const PageId = {
        ENTERING_USERNAME: 0,
        ENTERING_CONFIRMATION_CODE: 1,
        ENTERING_REGISTRATION_DATA: 2,
        ENTERING_AUTHORIZATION_DATA: 3,
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

    useEffect(() => {
        const handleUsernameStatus = (data: Record<string, any>) => {
            const UsernameStatus = {
                FREE: 0,
                BUSY: 1,
            };
            Object.freeze(UsernameStatus);

            if (data.status == UsernameStatus.FREE) {
                setPageId(PageId.ENTERING_REGISTRATION_DATA)
            } else if (data.status == UsernameStatus.BUSY) {
                setPageId(PageId.ENTERING_AUTHORIZATION_DATA);
            }
        }

        const handleGetPasswordSalt = (data: Record<string, any>) => {
            passwordSaltRef.current = data.passwordSalt;
        }

        const handleWrongEmailVerificationCode = (data: Record<string, any>) => {

        }

        protocol.subscribe("usernameStatus", handleUsernameStatus);
        protocol.subscribe("passwordSalt", handleGetPasswordSalt);
        protocol.subscribe("wrongEmailVerificationCode", handleWrongEmailVerificationCode);

        return () => {
            protocol.unsubscribe("usernameStatus", handleUsernameStatus);
            protocol.unsubscribe("passwordSalt", handleGetPasswordSalt);
            protocol.unsubscribe("wrongEmailVerificationCode", handleWrongEmailVerificationCode);
        };
    }, [protocol]);

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

        protocol.send("checkUsernameStatus", {
            username: usernameRef.current
        });
    };
    const handleEnteringAuthorizationData = async () => {
        if (isValidPassword(password)) {
            setPasswordError(false);
        } else {
            setPasswordError(true);
            return;
        }

        if (passwordSaltRef?.current == null) {
            return;
        }

        let passwordHash = await hashPassword(password, passwordSaltRef.current);

        protocol.send("authorize", {
            passwordHash: passwordHash
        });
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

        if (error) {
            return;
        }

        protocol.send("getEmailVerificationCode", {
            email: email
        });

        setPageId(PageId.ENTERING_CONFIRMATION_CODE);
    }
    const handleEnteringConfirmationCode = async () => {
        if (isValidConfirmationCode(confirmationCode)) {
            setConfirmationCodeError(false);
        } else {
            setConfirmationCodeError(true);
            return;
        }

        passwordSaltRef.current = generateSalt();

        let passwordHash = await hashPassword(password, passwordSaltRef.current);

        protocol.send("register", {
            passwordSalt: passwordSaltRef.current,
            passwordHash: passwordHash,
            fullName: fullName,
        });
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
                { id: "confirmationCode", type: "text", placeholder: "Code", value: confirmationCode, setValue: setConfirmationCode, isError: confirmationCodeError },
            ],
            button: {
                text: "Register", onClick: handleEnteringConfirmationCode
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
                { id: "password", type: "password", placeholder: "Password", value: password, setValue: setPassword, isError: passwordError },
            ],
            button: {
                text: "Log in", onClick: handleEnteringAuthorizationData
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

/*
useEffect(() => {
    const handleEntry = (data: Record<string, any>) => {
        if (!localStorage.getItem("longSessionKey")) {
            let newLongSessionKey = new Uint8Array(16);
            crypto.getRandomValues(newLongSessionKey as Uint8Array<ArrayBuffer>);
            localStorage.setItem("longSessionKey", toBase64(newLongSessionKey));
            setLongSessionKey(newLongSessionKey);
            sendRequestCreateLongSessionPacket(newLongSessionKey);
        }

        // Request for initial data
        sendGetStartingDataPacket();

        // Setting id
        setId(data.userId);
    }

    protocol.subscribe("entry", handleEntry);

    return () => {
        protocol.unsubscribe("entry", handleEntry);
    }
}, [protocol]);
*/

/*
const socket = useSocket();

useEffect(() => {
    const handleSocketOpen = () => {
        if (shortSessionKeyRef.current || !longSessionKey)
            return;

        sendRequestGetLongSessionPacket(longSessionKey);
    }

    socket.subscribe("open", handleSocketOpen);

    return () => {
        socket.unsubscribe("open", handleSocketOpen);
    };
}, [socket]);

return (
    <div className={classes.screen}>
        <div className={classes.text}>
            Restoring a long-term session...
        </div>
    </div>
)
*/
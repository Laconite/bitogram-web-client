import { useState, useEffect, useRef, use } from "react";
import useRefState from "@hooks/useRefState"
import { useSocket } from "@contexts/SocketProvider";
import { useProtocol } from "@contexts/ProtocolProvider";
import Authentication from "./screens/Authentication"
// import Main from "./screens/Main"

const fromBase64 = (base64: string): Uint8Array => {
    return new Uint8Array(
        atob(base64).split("").map(c => c.charCodeAt(0))
    );
};

const Router = () => {
    const shortSessionKeyRef = useRef<Uint8Array | null>(null);
    const [longSessionKey, setLongSessionKey] = useState<Uint8Array | null>(
        localStorage.getItem("longSessionKey")
            ? fromBase64(localStorage.getItem("longSessionKey")!)
            : null
    );
    const [id, setId] = useState<number | null>(null);
    const [username, setUsername, usernameRef] = useRefState("");
    const [fullName, setFullName] = useState("");
    const passwordSaltRef = useRef<Uint8Array<ArrayBuffer> | null>(null);

    const socket = useSocket();
    const protocol = useProtocol();

    useEffect(() => {
        const handleShortSession = (data: Record<string, any>) => {
            shortSessionKeyRef.current = data.key;
        }

        protocol.subscribe("shortSession", handleShortSession);

        return () => {
            protocol.unsubscribe("shortSession", handleShortSession);
        }
    }, [protocol]);

    useEffect(() => {
        const handleSocketOpen = () => {
            if (!shortSessionKeyRef.current)
                return;

            protocol.send("restoreShortSession", {
                key: shortSessionKeyRef.current,
            });
        }

        socket.subscribe("open", handleSocketOpen);

        return () => {
            socket.unsubscribe("open", handleSocketOpen);
        };
    }, [socket, protocol]);

    if (id === null) {
        return (
            <Authentication
                username={username}
                setUsername={setUsername}
                usernameRef={usernameRef}
                fullName={fullName}
                setFullName={setFullName}
                passwordSaltRef={passwordSaltRef}
            />
        )
    } else {
        /*
        return (
            <Main
                username={username}
                setUsername={setUsername}
                usernameRef={usernameRef}
                fullName={fullName}
                setFullName={setFullName}
                id={id}
                setId={setId}
            />
        )
        */
    }
}

export default Router
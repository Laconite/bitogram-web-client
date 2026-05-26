import { useState, useEffect, useRef, use } from "react";
import useRefState from "@hooks/useRefState"
import { useSocket } from "@contexts/SocketProvider";
import { usePacketManager, ID_FOR_SEND } from "@contexts/PacketManagerContext";
import { NetStream } from "@utils/packer";
import Authentication from "./screens/Authentication"
import Main from "./screens/Main"

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

    const { subscribe, unsubscribe } = useSocket();
    const { sendPacket } = usePacketManager();

    useEffect(() => {
        const handleSocketOpen = () => {
            if (!shortSessionKeyRef.current)
                return;

            const netStream = new NetStream();
            netStream.writeStructure({
                id: "int",
                key: "bytes",
            }, [
                ID_FOR_SEND.REQUEST__GET__SHORT_SESSION,
                shortSessionKeyRef.current,
            ]);
            sendPacket(netStream.buffer);
        }

        subscribe("open", handleSocketOpen);

        return () => {
            unsubscribe("open", handleSocketOpen);
        };
    }, [subscribe, unsubscribe]);

    if (id === null) {
        return (
            <Authentication
                shortSessionKeyRef={shortSessionKeyRef}
                longSessionKey={longSessionKey}
                setLongSessionKey={setLongSessionKey}
                username={username}
                setUsername={setUsername}
                usernameRef={usernameRef}
                fullName={fullName}
                setFullName={setFullName}
                passwordSaltRef={passwordSaltRef}
                setId={setId}
            />
        )
    } else {
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
    }
}

export default Router
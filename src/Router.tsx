import { useState, useEffect, useRef } from "react";
import useRefState from "@hooks/useRefState"
import { useSocket } from "@contexts/SocketContext";
import { usePacketManager, TO_ID_BY_NAME } from "@contexts/PacketManagerContext";
import { NetStream } from "@utils/Net";
import Authentication from "./screens/Authentication"
import Main from "./screens/Main"

const Router = () => {
    const sessionKeyRef = useRef<Uint8Array | null>(null);
    const [username, setUsername, usernameRef] = useRefState("");
    const [fullName, setFullName] = useState("");
    const passwordSaltRef = useRef<Uint8Array | null>(null);
    const [id, setId] = useState<number | null>(null);

    const { subscribe, unsubscribe } = useSocket();
    const { sendPacket } = usePacketManager();

    useEffect(() => {
        const handleSocketOpen = () => {
            if (!sessionKeyRef.current) 
                return;

            const netStream = new NetStream();
            netStream.writeStructure({
                id: "int",
                key: "bytes",
            }, [
                TO_ID_BY_NAME.RESTORE_SESSION,
                sessionKeyRef.current,
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
                sessionKeyRef={sessionKeyRef}
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
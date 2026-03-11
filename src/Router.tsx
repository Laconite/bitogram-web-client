import { useState, useRef } from "react";
import useRefState from "@hooks/useRefState"
import Authentication from "./screens/Authentication"
import Main from "./screens/Main"

const Router = () => {
    const [username, setUsername, usernameRef] = useRefState("");
    const [fullName, setFullName] = useState("");
    const passwordSaltRef = useRef<Uint8Array | null>(null);
    const [id, setId] = useState<number | null>(null);

    if (id == null) {
        return (
            <Authentication
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
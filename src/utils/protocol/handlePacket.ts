import { Protocol } from "./registry";
import { decode, parseSchema } from "../packer";
import { emit } from "./events";

function findServerPacketById(id: number) {
    for (const [name, packet] of Object.entries(Protocol.server)) {
        if ((packet as any).id === id) {
            return { name, packet };
        }
    }
    
    return null;
}

export function handlePacket(buffer: ArrayBuffer) {
    const view = new DataView(buffer);

    const id = view.getUint16(0, false);

    const found = findServerPacketById(id);
    if (!found) return;

    const { name, packet } = found;

    const payload = buffer.slice(2);

    const data = decode(parseSchema(packet.schema), payload);

    emit(name, data);
}
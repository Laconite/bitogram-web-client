import { Protocol } from "./registry";
import { encode, parseSchema } from "../packer";

function findClientPacket(name: string) {
    return (Protocol.client as any)[name];
}

export function createPacket(name: string, data: any): ArrayBuffer {
    const packet = findClientPacket(name);
    if (!packet) throw new Error("Unknown packet: " + name);

    const body = encode(parseSchema(packet.schema), data);

    const buffer = new ArrayBuffer(2 + body.byteLength);
    const view = new DataView(buffer);

    view.setUint16(0, packet.id, false);

    new Uint8Array(buffer, 2).set(new Uint8Array(body));

    return buffer;
}
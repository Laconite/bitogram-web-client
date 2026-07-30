import type {
    IntegerType,
    Schema,
    SchemaType,
    StructType
} from './types';

class BitReader {
    index = 0;
    private bytes: Uint8Array;

    constructor(bytes: Uint8Array) {
        this.bytes = bytes;
    }

    read(): boolean {
        const byte = this.bytes[this.index >> 3];
        const bit = (byte >> (7 - (this.index & 7))) & 1;
        this.index++;

        return bit === 1;
    }
}

function integerSize(type: IntegerType): number {
    switch (type.type) {
        case "i8":
        case "u8":
            return 1;
        case "i16":
        case "u16":
            return 2;
        case "i32":
        case "u32":
            return 4;
        case "i64":
        case "u64":
            return 8;
    }
}

function readInteger(
    data: ArrayBuffer,
    offsetRef: { value: number },
    type: IntegerType,
    header: BitReader
): any {
    let size = integerSize(type);

    if (type.compressed) {
        size = header.read() ? size : size / 2;
    }

    const view = new DataView(
        data,
        offsetRef.value,
        size
    );

    offsetRef.value += size;

    switch (size) {
        case 1:
            return type.type.startsWith("u")
                ? view.getUint8(0)
                : view.getInt8(0);

        case 2:
            return type.type.startsWith("u")
                ? view.getUint16(0, false)
                : view.getInt16(0, false);

        case 4:
            return type.type.startsWith("u")
                ? view.getUint32(0, false)
                : view.getInt32(0, false);

        case 8:
            return type.type.startsWith("u")
                ? view.getBigUint64(0, false)
                : view.getBigInt64(0, false);
    }
}

function readType(
    data: ArrayBuffer,
    offsetRef: { value: number },
    header: BitReader,
    type: SchemaType
): any {
    switch (type.kind) {
        case "integer":
            return readInteger(data, offsetRef, type, header);

        case "string": {
            const length = Number(
                readInteger(data, offsetRef, type.lengthType, header)
            );

            const bytes = new Uint8Array(
                data,
                offsetRef.value,
                length
            );

            offsetRef.value += length;

            return new TextDecoder().decode(bytes);
        }

        case "bytes": {
            const length = Number(
                readInteger(data, offsetRef, type.lengthType, header)
            );

            const bytes = new Uint8Array(
                data,
                offsetRef.value,
                length
            );

            offsetRef.value += length;

            return bytes.slice();
        }

        case "struct":
            return readStruct(data, offsetRef, header, type);

        case "array": {
            const length = Number(
                readInteger(data, offsetRef, type.lengthType, header)
            );

            const array = [];

            for (let i = 0; i < length; i++) {
                array.push(
                    readStruct(data, offsetRef, header, type.element)
                );
            }

            return array;
        }
    }
}

function readStruct(
    data: ArrayBuffer,
    offsetRef: { value: number },
    header: BitReader,
    schema: StructType
) {
    const result: Record<string, any> = {};

    for (const field of schema.fields) {
        result[field.name] = readType(
            data,
            offsetRef,
            header,
            field.type
        );
    }

    return result;
}

export function decode(
    schema: Schema,
    packet: ArrayBuffer
) {
    const view = new Uint8Array(packet);

    const headerSize = view[0];

    const headerBytes = view.slice(1, 1 + headerSize);

    const bodyOffset = 1 + headerSize;

    const header = new BitReader(headerBytes);

    return readStruct(
        packet.slice(bodyOffset),
        { value: 0 },
        header,
        schema
    );
}
import type {
    ArrayType,
    IntegerType,
    Schema,
    SchemaType,
    StructType
} from "./types";

class BitWriter {
    bits: number[] = [];

    write(bit: boolean) {
        this.bits.push(bit ? 1 : 0);
    }

    build(): Uint8Array {
        const bytes = new Uint8Array(
            Math.ceil(this.bits.length / 8)
        );

        for (let i = 0; i < this.bits.length; i++) {
            if (this.bits[i]) {
                bytes[i >> 3] |= 1 << (7 - (i & 7));
            }
        }

        return bytes;
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

function writeInteger(
    buffer: number[],
    value: number | bigint,
    type: IntegerType,
    header: BitWriter
) {
    let size = integerSize(type);

    if (type.compressed) {
        const half = size / 2;

        const max = type.type.startsWith("u")
            ? (1n << BigInt(half * 8)) - 1n
            : (1n << BigInt(half * 8 - 1)) - 1n;

        const min = type.type.startsWith("u")
            ? 0n
            : -(1n << BigInt(half * 8 - 1));

        const bigintValue = BigInt(value);

        const useFull =
            bigintValue < min ||
            bigintValue > max;

        header.write(useFull);

        size = useFull ? size : half;
    }

    const view = new DataView(new ArrayBuffer(size));

    if (typeof value === "number") {
        switch (size) {
            case 1:
                type.type.startsWith("u")
                    ? view.setUint8(0, value)
                    : view.setInt8(0, value);
                break;

            case 2:
                type.type.startsWith("u")
                    ? view.setUint16(0, value, false)
                    : view.setInt16(0, value, false);
                break;

            case 4:
                type.type.startsWith("u")
                    ? view.setUint32(0, value, false)
                    : view.setInt32(0, value, false);
                break;
        }
    } else {
        if (type.type.startsWith("u")) {
            view.setBigUint64(0, value, false);
        } else {
            view.setBigInt64(0, value, false);
        }
    }

    const bytes = new Uint8Array(view.buffer);
    for (let i = 0; i < bytes.length; i++) {
        buffer.push(bytes[i]);
    }
}

function writeType(
    buffer: number[],
    header: BitWriter,
    type: SchemaType,
    value: any
) {
    switch (type.kind) {
        case "integer":
            writeInteger(buffer, value, type, header);
            return;

        case "string": {
            const bytes = new TextEncoder().encode(value);

            writeInteger(
                buffer,
                bytes.length,
                type.lengthType,
                header
            );

            buffer.push(...bytes);
            return;
        }

        case "bytes":
            writeInteger(
                buffer,
                value.length,
                type.lengthType,
                header
            );

            buffer.push(...value);
            return;

        case "struct":
            writeStruct(buffer, header, type, value);
            return;

        case "array":
            writeInteger(
                buffer,
                value.length,
                type.lengthType,
                header
            );

            for (const item of value) {
                writeStruct(
                    buffer,
                    header,
                    type.element,
                    item
                );
            }

            return;
    }
}

function writeStruct(
    buffer: number[],
    header: BitWriter,
    schema: StructType,
    value: any
) {
    for (const field of schema.fields) {
        writeType(
            buffer,
            header,
            field.type,
            value[field.name]
        );
    }
}

export function encode(
    schema: Schema,
    value: any
): ArrayBuffer {
    const header = new BitWriter();
    const body: number[] = [];

    writeStruct(body, header, schema, value);

    const headerBytes = header.build();
    const headerLen = headerBytes.length;

    const totalLength = 1 + headerLen + body.length;
    const buffer = new ArrayBuffer(totalLength);

    const view = new Uint8Array(buffer);

    view[0] = headerLen;
    view.set(headerBytes, 1);
    view.set(body, 1 + headerLen);

    return buffer;
}
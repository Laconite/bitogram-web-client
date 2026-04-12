type FieldType = "int" | "i64" | "string" | "bytes";

export interface Structure {
    [key: string]: FieldValue;
}
export type FieldValue = Structure | FieldValue[] | number | bigint | string | Uint8Array;

const splitCode = (code: string): string[] => {
    const tokens: string[] = [];
    
    const specialCharacters = ['(', ')', '[', ']', '{', '}', ':', ','];

    let i = 0;

    const peek = (): string => code[i];
    const next = (): string => code[i++];

    while (i < code.length) {
        const character = peek();

        if (/[a-zA-Z0-9]/.test(character)) {
            let text = "";

            while (i < code.length && /[a-zA-Z0-9]/.test(peek())) {
                text += next();
            }

            tokens.push(text);
        } else if (specialCharacters.includes(character)) {
            tokens.push(character);
            next();
        } else {
            next();
        }
    }

    return tokens;
};
type ASTNode = {
    name: string;
    type: string;
    childs: ASTNode[];
};
type ValueRef = { 
    value: number 
};
const ASTBuilder = {
    buildNext(node: ASTNode, tokens: string[], tokenIndexRef: ValueRef): boolean {
        while (tokenIndexRef.value < tokens.length) {
            if (tokens[tokenIndexRef.value] === "}") {
                tokenIndexRef.value++;
                return true;
            } else {
                const fieldName = tokens[tokenIndexRef.value];
                tokenIndexRef.value++;

                if (tokens[tokenIndexRef.value] === ":") {
                    tokenIndexRef.value++;
                } else {
                    return false;
                }

                let fieldType: string | null = null;
                if (tokens[tokenIndexRef.value] === "{") {
                    tokenIndexRef.value++;
                    fieldType = "structure";
                } else if (tokens[tokenIndexRef.value] === "[") {
                    tokenIndexRef.value++;

                    if (tokens[tokenIndexRef.value] !== "]") {
                        return false;
                    }
                    tokenIndexRef.value++;

                    if (tokens[tokenIndexRef.value] !== "{") {
                        return false;
                    }
                    tokenIndexRef.value++;

                    fieldType = "array";
                } else if (tokens[tokenIndexRef.value] === "int") {
                    tokenIndexRef.value++;
                    fieldType = "int";
                } else if (tokens[tokenIndexRef.value] === "i64") {
                    tokenIndexRef.value++;
                    fieldType = "i64";
                } else if (tokens[tokenIndexRef.value] === "string") {
                    tokenIndexRef.value++;
                    fieldType = "string";
                } else if (tokens[tokenIndexRef.value] === "bytes") {
                    tokenIndexRef.value++;
                    fieldType = "bytes";
                } else {
                    return false;
                }

                const childNode: ASTNode = {
                    name: fieldName,
                    type: fieldType,
                    childs: []
                };

                node.childs.push(childNode);

                if (childNode.type === "structure" || childNode.type === "array") {
                    if (!ASTBuilder.buildNext(childNode, tokens, tokenIndexRef)) {
                        return false;
                    }
                }
            }

            if (tokens[tokenIndexRef.value] === ",") {
                tokenIndexRef.value++;
            }
        }

        return true;
    },

    build(tokens: string[], tokenIndex: number = 0): ASTNode | null {
        const rootNode: ASTNode = {
            name: "root",
            type: "structure",
            childs: []
        };

        const tokenIndexRef: ValueRef = { value: tokenIndex };
        const success = ASTBuilder.buildNext(rootNode, tokens, tokenIndexRef);

        return success ? rootNode : null;
    }
};

export class NetStream {
    buffer: Uint8Array<ArrayBuffer>;

    constructor() {
        this.buffer = new Uint8Array(0);
    }

    feed(data: Uint8Array) {
        const newBuffer = new Uint8Array(this.buffer.length + data.length);
        newBuffer.set(this.buffer, 0);
        newBuffer.set(data, this.buffer.length);
        this.buffer = newBuffer;
    }
    discard(n: number) {
        if (n > this.buffer.length) {
            throw new Error("You cannot delete more bytes than are in the buffer");
        }

        this.buffer = this.buffer.slice(n);
    }

    readNumber(offset: number = 0): [number | null, number] {
        if (offset >= this.buffer.length) return [null, offset];

        const first = this.buffer[offset];

        if ((first & 0b10000000) === 0) {
            return [first & 0b01111111, offset + 1];
        } else if (offset + 1 < this.buffer.length) {
            const second = this.buffer[offset + 1];
            const value = ((first & 0b01111111) << 8) | second;
            return [value, offset + 2];
        } else {
            return [null, offset];
        }
    }
    readI64(offset: number = 0): [bigint | null, number] {
        if (offset + 8 > this.buffer.length) {
            return [null, offset];
        }

        const view = new DataView(
            this.buffer.buffer,
            this.buffer.byteOffset + offset,
            8
        );

        const value = view.getBigInt64(0, false);
        return [value, offset + 8];
    }
    readString(offset: number = 0): [string | null, number] {
        const [data, newOffset] = this.readBytes(offset);
        if (data === null) return [null, offset];

        try {
            const str = new TextDecoder("utf-8").decode(data);
            return [str, newOffset];
        } catch {
            return [null, offset];
        }
    }
    readBytes(offset: number = 0): [Uint8Array | null, number] {
        const [length, offsetNew] = this.readNumber(offset);
        if (length === null) return [null, offset];

        if (offsetNew + length > this.buffer.length) return [null, offset];

        return [this.buffer.slice(offsetNew, offsetNew + length), offsetNew + length];
    }
    readStructureWithNamesWithAST(node: ASTNode, offset: number = 0): [Record<string, FieldValue> | null, number] {
        const values: Record<string, FieldValue> = {};

        for (let i_child = 0; i_child < node.childs.length; ++i_child) {
            const child = node.childs[i_child];

            if (child.type === "structure") {
                let temporary = this.readStructureWithNamesWithAST(child, offset)

                if (temporary[0] !== null) {
                    [values[child.name], offset] = temporary;
                } else {
                    return [null, offset];
                }
            } else if (child.type === "array") {
                let arrayLength: number | null;
                [arrayLength, offset] = this.readNumber(offset);
                
                if (arrayLength === null)
                    return [null, offset];

                let array: Record<string, FieldValue>[] = [];
                
                for (let i = 0; i < arrayLength; i++) {
                    let temporary = this.readStructureWithNamesWithAST(child, offset)
                    
                    if (temporary[0] !== null) {
                        offset = temporary[1];
                        array.push(temporary[0]);
                    } else {
                        return [null, offset];
                    }
                }

                values[child.name] = array;
            } else {
                let fieldValue: FieldValue | null;

                if (child.type === "int") {
                    [fieldValue, offset] = this.readNumber(offset);
                } else if (child.type === "i64") {
                    [fieldValue, offset] = this.readI64(offset);
                } else if (child.type === "string") {
                    [fieldValue, offset] = this.readString(offset);
                } else if (child.type === "bytes") {
                    [fieldValue, offset] = this.readBytes(offset);
                } else {
                    throw new Error(`Unknown type: ${child.type}`);
                }

                if (fieldValue === null)
                    return [null, offset];

                values[child.name] = fieldValue;
            }
        }

        return [values, offset];
    }
    readStructureWithNames(description: string, offset: number = 0): [Record<string, FieldValue> | null, number] {
        let tokens: string[] = splitCode(description);
        let node: ASTNode | null = ASTBuilder.build(tokens);

        if (node === null) {
            return [null, offset];
        }

        return this.readStructureWithNamesWithAST(node, offset);
    }
    
    encodeNumber(value: number): Uint8Array {
        if (value < 0 || value > 0x7fff) throw new Error("The number must be in the range 0..32767");

        if (value < 0x80) {
            return new Uint8Array([value & 0x7f]);
        } else {
            return new Uint8Array([0x80 | ((value >> 8) & 0x7f), value & 0xff]);
        }
    }
    writeNumber(value: number): this {
        const encoded = this.encodeNumber(value);
        this.feed(encoded);
        return this;
    }
    encodeI64(value: bigint): Uint8Array {
        const MIN = -(1n << 63n);
        const MAX = (1n << 63n) - 1n;

        if (value < MIN || value > MAX) {
            throw new RangeError("Value out of i64 range");
        }

        const bytes = new Uint8Array(8);

        for (let i = 7; i >= 0; i--) {
            bytes[7 - i] = Number((value >> BigInt(i * 8)) & 0xFFn);
        }

        return bytes;
    }
    writeI64(value: bigint): this {
        const encoded = this.encodeI64(value);
        this.feed(encoded);
        return this;
    }
    writeString(str: string): this {
        const data = new TextEncoder().encode(str);
        return this.writeBytes(data);
    }
    writeBytes(data: Uint8Array): this {
        const lengthBytes = this.encodeNumber(data.length);
        this.feed(lengthBytes);
        this.feed(data);
        return this;
    }
    writeStructure(description: Record<string, FieldType>, values: FieldValue[]): this {
        const fieldNames = Object.keys(description);

        if (values.length !== fieldNames.length) {
            throw new Error("Number of values does not match description");
        }

        for (let i = 0; i < fieldNames.length; i++) {
            const fieldName = fieldNames[i];
            const fieldType = description[fieldName];
            const fieldValue = values[i];

            if (fieldType === "int") {
                if (typeof fieldValue !== "number") {
                    throw new Error(`Field "${fieldName}" must be an int`);
                }
                this.writeNumber(fieldValue);
            }
            else if (fieldType === "i64") {
                if (typeof fieldValue !== "bigint") {
                    throw new Error(`Field "${fieldName}" must be an i64`);
                }
                this.writeI64(fieldValue);
            }
            else if (fieldType === "string") {
                if (typeof fieldValue !== "string") {
                    throw new Error(`Field "${fieldName}" must be a string`);
                }
                this.writeString(fieldValue);
            } 
            else if (fieldType === "bytes") {
                if (!(fieldValue instanceof Uint8Array)) {
                    throw new Error(`Field "${fieldName}" must be bytes`);
                }
                this.writeBytes(fieldValue);
            } 
            else {
                throw new Error(`Unknown field type: ${fieldType}`);
            }
        }

        return this;
    }
}
export class NetPacket {
    id: number;
    values: Record<string, any>;

    constructor(id: number) {
        this.id = id;
        this.values = {};
    }
}

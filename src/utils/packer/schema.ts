import type {
    ArrayType,
    BytesType,
    IntegerBaseType,
    IntegerType,
    Schema,
    SchemaType,
    StringType,
    StructField,
    StructType
} from "./types";

const SYMBOLS = ["{", "}", "[", "]", ":", ","];

function tokenize(code: string): string[] {
    const tokens: string[] = [];

    let i = 0;

    while (i < code.length) {
        const c = code[i];

        if (/\s/.test(c)) {
            i++;
            continue;
        }

        if (SYMBOLS.includes(c)) {
            tokens.push(c);
            i++;
            continue;
        }

        let text = "";

        while (
            i < code.length &&
            /[a-zA-Z0-9?_]/.test(code[i])
        ) {
            text += code[i++];
        }

        tokens.push(text);
    }

    return tokens;
}

class Parser {
    private index = 0;

    private tokens: string[];

    constructor(tokens: string[]) {
        this.tokens = tokens;
    }

    private peek(): string {
        return this.tokens[this.index];
    }

    private next(): string {
        return this.tokens[this.index++];
    }

    private expect(token: string) {
        const actual = this.next();

        if (actual !== token) {
            throw new Error(`Expected "${token}", got "${actual}"`);
        }
    }

    parse(): Schema {
        return {
            kind: "struct",
            fields: this.parseFields()
        };
    }

    private parseFields(): StructField[] {
        const fields: StructField[] = [];

        while (this.index < this.tokens.length) {
            if (this.peek() === "}") {
                break;
            }

            const name = this.next();

            this.expect(":");

            const type = this.parseType();

            fields.push({ name, type });

            if (this.peek() === ",") {
                this.next();
            }
        }

        return fields;
    }

    private parseType(): SchemaType {
        const token = this.peek();

        if (token === "{") {
            this.next();

            const fields = this.parseFields();

            this.expect("}");

            return {
                kind: "struct",
                fields
            };
        }

        if (token === "[") {
            this.next();

            const lengthType = this.parseIntegerType();

            this.expect("]");

            this.expect("{");

            const fields = this.parseFields();

            this.expect("}");

            return {
                kind: "array",
                lengthType,
                element: {
                    kind: "struct",
                    fields
                }
            };
        }

        if (token === "string") {
            this.next();

            this.expect("[");

            const lengthType = this.parseIntegerType();

            this.expect("]");

            const type: StringType = {
                kind: "string",
                lengthType
            };

            return type;
        }

        if (token === "bytes") {
            this.next();

            this.expect("[");

            const lengthType = this.parseIntegerType();

            this.expect("]");

            const type: BytesType = {
                kind: "bytes",
                lengthType
            };

            return type;
        }

        return this.parseIntegerType();
    }

    private parseIntegerType(): IntegerType {
        const token = this.next();

        const compressed = token.endsWith("?");

        const base = compressed
            ? token.slice(0, -1)
            : token;

        const allowed: IntegerBaseType[] = [
            "i8", "u8",
            "i16", "u16",
            "i32", "u32",
            "i64", "u64"
        ];

        if (!allowed.includes(base as IntegerBaseType)) {
            throw new Error(`Unknown integer type "${token}"`);
        }

        return {
            kind: "integer",
            type: base as IntegerBaseType,
            compressed
        };
    }
}

export function parseSchema(code: string): Schema {
    return new Parser(tokenize(code)).parse();
}
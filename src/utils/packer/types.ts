export type IntegerBaseType =
    | "i8" | "u8"
    | "i16" | "u16"
    | "i32" | "u32"
    | "i64" | "u64";

export interface IntegerType {
    kind: "integer";
    type: IntegerBaseType;
    compressed: boolean;
}

export interface StringType {
    kind: "string";
    lengthType: IntegerType;
}

export interface BytesType {
    kind: "bytes";
    lengthType: IntegerType;
}

export interface StructField {
    name: string;
    type: SchemaType;
}

export interface StructType {
    kind: "struct";
    fields: StructField[];
}

export interface ArrayType {
    kind: "array";
    lengthType: IntegerType;
    element: StructType;
}

export type SchemaType =
    | IntegerType
    | StringType
    | BytesType
    | StructType
    | ArrayType;

export type Schema = StructType;

export type PackerValue =
    | number
    | bigint
    | string
    | Uint8Array
    | Record<string, any>
    | PackerValue[];
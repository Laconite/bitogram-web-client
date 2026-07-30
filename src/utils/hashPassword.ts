import { Argon2, Argon2Mode } from '@sphereon/isomorphic-argon2';

export const generateSalt = (): Uint8Array => {
    return window.crypto.getRandomValues(new Uint8Array(16));
};

const bytesToHex = (bytes: Uint8Array): string => {
    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, '0'))
        .join('');
};

const hexToBytes = (hex: string): Uint8Array => {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
};

export const hashPassword = async (password: string, salt: Uint8Array): Promise<Uint8Array> => {
    const saltHex = bytesToHex(salt);

    const result = await Argon2.hash(password, saltHex, {
        hashLength: 16,
        memory: 16384,
        parallelism: 1,
        mode: Argon2Mode.Argon2id,
        iterations: 3,
    });

    return hexToBytes(result.hex);
}
export const Protocol = {
    client: {
        createShortSession: {
            id: 0,
            schema: ``,
        },

        iAmAlive: {
            id: 1,
            schema: ``,
        },

        checkUsernameStatus: {
            id: 2,
            schema: `
                username: string[u8],
            `,
        },

        getEmailVerificationCode: {
            id: 3,
            schema: `
                email: string[u8],
            `,
        },

        checkEmailVerificationCode: {
            id: 4,
            schema: `
                code: string[u8],
            `,
        },

        register: {
            id: 5,
            schema: `
                password_salt: bytes[u8],
                password_hash: bytes[u8],
                full_name: string[u8],
            `,
        },

        authorize: {
            id: 6,
            schema: `
                password_hash: bytes[u8],
            `,
        },
    },

    server: {
        shortSession: {
            id: 0,
            schema: `
                key: bytes[u8],
            `,
        },

        usernameStatus: {
            id: 1,
            schema: `
                status: u8,
            `,
        },

        passwordSalt: {
            id: 2,
            schema: `
                password_salt: bytes[u8],
            `,
        },

        wrongEmailVerificationCode: {
            id: 3,
            schema: ``,
        },

        entry: {
            id: 4,
            schema: `
                user_id: u64,
            `,
        },
    },
} as const;
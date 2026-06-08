export const Protocol = {
    client: {
        createShortSession: {
            id: 0,
            schema: ``,
        },

        restoreShortSession: {
            id: 1,
            schema: `
            key: bytes[u8],
            `,
        },

        iAmAlive: {
            id: 2,
            schema: ``,
        },

        checkUsernameStatus: {
            id: 3,
            schema: `
            username: string[u8],
            `,
        },

        getEmailVerificationCode: {
            id: 4,
            schema: `
            email: string[u8],
            `,
        },

        checkEmailVerificationCode: {
            id: 5,
            schema: `
            code: string[u8],
            `,
        },

        register: {
            id: 6,
            schema: `
            passwordSalt: bytes[u8],
            passwordHash: bytes[u8],
            fullName: string[u8],
            `,
        },

        authorize: {
            id: 7,
            schema: `
            passwordHash: bytes[u8],
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
            passwordSalt: bytes[u8],
            `,
        },

        wrongEmailVerificationCode: {
            id: 3,
            schema: ``,
        },

        entry: {
            id: 4,
            schema: `
            userId: u64,
            `,
        },
    },
} as const;
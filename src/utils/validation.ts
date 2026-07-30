export const isValidUsername = (username: string) => {
    return username.length >= 2 && username.length <= 32;
}
export const isValidPassword = (password: string) => {
    return password.length >= 8;
}
export const isValidFullName = (fullName: string) => {
    return fullName.length >= 1 && fullName.length <= 64;
}
export const isValidInvitationCode = (invitationCode: string) => {
    return invitationCode.length == 8;
}
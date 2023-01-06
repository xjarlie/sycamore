interface User {
    username: string,
    password: string,
    salt: string,
    displayName: string,
    authToken: string
}

export {User};
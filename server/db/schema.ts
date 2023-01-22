interface User {
    userID: string,
    password?: string,
    salt?: string,
    displayName: string,
    authToken?: string,
    publicKey?: string,
    inbox?: any,
    outbox?: any
}

interface Message {
    id: string,
    to: {
        url: string,
        id: string
    },
    from: {
        url: string,
        id: string
    },
    text: string,
    signature: string,
    status?: 'not delivered' | 'delivered' | 'read',
    sentTimestamp: number,
    receivedTimestamp?: number
}

export {User, Message};
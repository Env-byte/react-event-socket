export const closeMessages = Object.freeze({
    1000: 'Normal closure, meaning that the purpose for which the connection was established has been fulfilled.',
    1001: 'An endpoint is "going away", such as a server going down or a browser having navigated away from a page.',
    1002: 'An endpoint is terminating the connection due to a protocol error',
    1003: 'An endpoint is terminating the connection because it has received a type of data it cannot accept (e.g., an endpoint that understands only text data MAY send this if it receives a binary message).',
    1004: 'Reserved. The specific meaning might be defined in the future.',
    1005: 'No status code was actually present.',
    1006: 'The connection was closed abnormally, e.g., without sending or receiving a Close control frame',
    1007: 'An endpoint is terminating the connection because it has received data within a message that was not consistent with the type of the message (e.g., non-UTF-8 [https://www.rfc-editor.org/rfc/rfc3629] data within a text message).',
    1008: 'An endpoint is terminating the connection because it has received a message that "violates its policy". This reason is given either if there is no other sutible reason, or if there is a need to hide specific details about the policy.',
    1009: 'An endpoint is terminating the connection because it has received a message that is too big for it to process.',
    1010: "An endpoint (client) is terminating the connection because it has expected the server to negotiate one or more extension, but the server didn't return them in the response message of the WebSocket handshake.",
    1011: 'A server is terminating the connection because it encountered an unexpected condition that prevented it from fulfilling the request.',
    1015: "The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified).",
} as const);
export type CloseMessages = (typeof closeMessages)[keyof typeof closeMessages] | 'Unknown reason';

export const socketStatus = Object.freeze({
    1: 'open',
    3: 'closed',
} as const);
export type SocketStatus = (typeof socketStatus)[keyof typeof socketStatus];

export const upperCaseFirstCharacter = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export const camelCase = (str: string) =>
    str
        .split('-')
        .reduce((acc, word, index) => {
            if (index === 0) return word
            return `${acc}${upperCaseFirstCharacter(word)}`;
        }, '');

export const jsonStringify = (payload: unknown) => {
    try {
        return JSON.stringify(payload);
    } catch (e) {
        console.log('error', 'Could not stringify:', e);
    }
    return false;
};

export type Middleware<TData = unknown> = (props: { name: string; data: TData }) => unknown;

export const executeMiddleware = <TMiddleware extends Middleware[]>(name: string, data: any, middleware: TMiddleware) => middleware.reduce((prev, next) => {
    console.log('info', 'executing', next.name, 'with', prev);
    return next({name, data: prev});
}, data);
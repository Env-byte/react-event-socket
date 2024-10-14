import { StorePropertiesFromEventRecord, StoreProperty } from '../types.ts';

export const upperCaseFirstCharacter = (str: string) => str.charAt(0).toUpperCase() + str.slice(1);

export const toCamelCase = (str: string) => str.split('-').reduce((acc, word) => `${acc}${upperCaseFirstCharacter(word)}`, '');

export const closeMessages = {
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
    1015: "The connection was closed due to a failure to perform a TLS handshake (e.g., the server certificate can't be verified)."
} as const;
export type CloseMessages = (typeof closeMessages)[keyof typeof closeMessages] | 'Unknown reason';

export const socketStatus = {
    1: 'open',
    0: 'connecting',
    3: 'closed',
    2: 'closing'
} as const;
export type SocketStatus = (typeof socketStatus)[keyof typeof socketStatus];

export const log = (type: 'info' | 'error', message: string, data?: unknown) => {
    // eslint-disable-next-line no-console
    console[type](`react-event-socket`, message, data);
};

export const jsonStringify = (payload: unknown) => {
    try {
        return JSON.stringify(payload);
    } catch (e) {
        log('error', 'Could not stringify:', e);
    }
    return false;
};

export const buildProperty =
    <TData>() =>
    <TName extends string, TInitial, TArray extends boolean>(props: StoreProperty<TName, TArray, TData | TInitial>) =>
        props;

export const recordToPropertyArray = <T extends Record<string, any>>(events: T) => {
    return Object.entries(events).map(([, config]) =>
        buildProperty()({
            name: config.name,
            isArray: config.array ?? false,
            data: undefined
        })
    ) as StorePropertiesFromEventRecord<T>;
};

import {type StoreApi, type UseBoundStore} from 'zustand';
import {type AddEventConfig, type SendPayloads} from './SocketFactory';
import {
    buildProperty,
    createStore,
    type Dispatches,
    type GetStore,
    type GetStoreProperties,
    toCamelCase
} from './store';
import {
    camelCase,
    type CloseMessages,
    closeMessages,
    executeMiddleware,
    jsonStringify,
    type SocketStatus,
    upperCaseFirstCharacter
} from './utils';

const socketProps = [
    buildProperty<SocketStatus>()({
        name: 'status',
        data: 'closed' as const,
        isArray: false,
    }),
    buildProperty<Event>()({
        name: 'error',
        data: undefined,
        isArray: false,
    }),
    buildProperty<CloseMessages>()({
        name: 'closeMessage',
        data: undefined,
        isArray: false,
    }),
    buildProperty<boolean>()({
        name: 'mocked',
        data: undefined,
        isArray: false,
    }),
];

export type SocketStore = GetStore<typeof socketProps>;

interface SocketProps<TEvents extends Record<string, AddEventConfig>, TPayloads extends Record<string, any>> {
    events: TEvents;
    eventDispatches: Dispatches<GetStore<GetStoreProperties<TEvents>>>;
    logging: boolean;
    payloads: TPayloads
}

interface InitProps {
    messageTimeout: number;
    reconnectOnError: boolean;
}

export class Socket<TEvents extends Record<string, AddEventConfig> = Record<string, never>, TPayloads extends Record<string, any> = {}> {
    private socket: WebSocket | null = null;

    protected logging = false;

    private events: TEvents;

    private payloads: TPayloads;

    private socketDispatches: Dispatches<SocketStore>;

    private readonly eventDispatches: Dispatches<GetStore<GetStoreProperties<TEvents>>>;

    private readonly useStore: UseBoundStore<StoreApi<SocketStore>>;

    constructor({logging, events, eventDispatches, payloads}: SocketProps<TEvents, TPayloads>) {
        this.logging = logging;
        this.events = events;
        this.payloads = payloads;

        const [socketDispatches, useStore] = createStore(socketProps);

        this.socketDispatches = socketDispatches;

        this.eventDispatches = eventDispatches;

        this.useStore = useStore;
    }

    private getData(eventName: string, data: unknown): unknown {
        const selectFunc = this.events[eventName as keyof typeof this.events]?.select;
        if (!selectFunc) {
            return data;
        }
        return selectFunc(data);
    }

    public onMessage(event: string) {
        const eventMap = Object.entries(this.events).map(([eventName, config]) => ({
            eventName,
            config,
        }));

        // eslint-disable-next-line no-restricted-syntax
        for (const item of eventMap) {
            const {eventName, config} = item;
            const parsed = JSON.parse(event);
            if (!config.predicate(parsed)) continue;

            const data = this.getData(eventName, parsed);

            const key = `set${upperCaseFirstCharacter(camelCase(eventName))}` as keyof Dispatches<
                GetStore<GetStoreProperties<TEvents>>
            >;
            if (this.logging) console.log('socket', `${String(key)} - `, data);
            const dispatch = this.eventDispatches[key] as (prop: unknown) => void;
            dispatch(data);
            return;
        }

        if (this.logging) console.log('socket', 'Could not find event for data:', event);
    }

    public disconnect() {
        if (this.logging) console.log('socket', 'Disconnecting from socket');
        this.socketDispatches.setStatus('closed');
        this.socket?.close();
        this.socket = null;
    }

    public init({messageTimeout, reconnectOnError}: InitProps) {
        let isReconnecting = false;
        let timeoutHandle: ReturnType<typeof setTimeout> | undefined;
        let socketAddress = '';

        const handleMessageTimeout = () => {
            if (timeoutHandle) clearTimeout(timeoutHandle);
            timeoutHandle = setTimeout(() => {
                if (isReconnecting || !reconnectOnError) return;
                if (this.logging) console.log('socket error', 'Message timeout');
                this.disconnect();
                isReconnecting = true;
                // eslint-disable-next-line @typescript-eslint/no-use-before-define
                connect(socketAddress);
            }, messageTimeout);
        };

        const connect = (newAddress?: string) => {
            if (this.socket) return;
            if (newAddress) socketAddress = newAddress;
            const socket = new WebSocket(socketAddress);
            this.socket = socket;

            if (this.logging) console.log('socket', `Connecting to socket: ${socketAddress}`);

            socket.onopen = () => {
                if (this.logging) console.log('socket', 'Connected to socket');
                this.socketDispatches.setStatus('open');
                isReconnecting = false;
            };

            socket.onerror = (e) => {
                if (this.logging) console.log('socket error', 'Socket Error:', e);
                this.socketDispatches.setError(e);
                if (reconnectOnError && !isReconnecting) {
                    isReconnecting = true;
                    this.disconnect();
                    connect(newAddress);
                }
            };

            socket.onclose = (e) => {
                const reason = e.code in closeMessages ? closeMessages[e.code as keyof typeof closeMessages] : 'Unknown reason';
                if (this.logging) console.log('socket error', 'Socket closed', reason);
                this.socketDispatches.setStatus('closed');
                this.socketDispatches.setCloseMessage(reason);
                this.socket = null;
            };

            socket.onmessage = (event: MessageEvent<string>) => {
                const {mocked} = this.useStore.getState();
                if (mocked) return;
                if (messageTimeout && !isReconnecting) {
                    handleMessageTimeout();
                }
                this.onMessage(event.data);
            };
        };

        const payloads = Object.values(this.payloads).reduce((accumulator, next) => {
            const send = (data: unknown) => {
                if (this.socket?.readyState !== WebSocket.OPEN || !this.socket) {
                    if (this.logging) console.log('info', 'Socket is not open');
                    return;
                }
                const payload = next.middleware ? executeMiddleware(next.name, data, next.middleware) : data;
                const jsonPayload = typeof payload !== 'string' ? jsonStringify(payload) : payload;
                if (jsonPayload === false) {
                    if (this.logging) console.log('info', `Did not Send`, payload);
                    return;
                }
                if (this.logging) console.log('info', `Sent`, payload);

                this.socket.send(jsonPayload);
            };
            return {
                ...accumulator,
                [`${toCamelCase(String(next.name))}`]: send
            };
        }, {} as SendPayloads<TPayloads>);

        return {connect, payloads};
    }


    public get hooks() {
        return {
            useStore: this.useStore,
        };
    }

}
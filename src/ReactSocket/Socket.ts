import { AddEventConfig, Dispatches, Hooks, SendNameConfig, SendPayloads, StoreFromArray } from '../types';
import {
    buildProperty,
    closeMessages,
    CloseMessages,
    jsonStringify,
    log,
    parseEventData,
    socketStatus,
    SocketStatus,
    toCamelCase
} from '../utils';
import { createStore } from '../store';

const socketProps = [
    buildProperty<SocketStatus>()({
        name: 'status',
        data: 'closed' as const,
        isArray: false
    }),
    buildProperty<Event>()({
        name: 'error',
        data: undefined,
        isArray: false
    }),
    buildProperty<CloseMessages>()({
        name: 'closeMessage',
        data: undefined,
        isArray: false
    })
];

type SocketStore = StoreFromArray<typeof socketProps>;
type EventDispatch = Record<string, (value: any) => void>;

interface SocketProps<TEvents, TSendNames> {
    address: string;
    events: TEvents;
    eventDispatches: EventDispatch;
    sendNames: TSendNames;
    verbose: boolean;
}

export class Socket<
    TEvents extends Record<string, AddEventConfig> = {},
    TSendNames extends Record<string, SendNameConfig<string, any>> = {}
> {
    private socket: WebSocket | null = null;

    protected verbose = false;

    protected address: string;

    private events: TEvents;

    private readonly socketHooks: Hooks<SocketStore>;

    private socketDispatches: Dispatches<SocketStore>;

    private readonly eventDispatches: EventDispatch;

    private sendNames: TSendNames;

    constructor({ address, sendNames, verbose, events, eventDispatches }: SocketProps<TEvents, TSendNames>) {
        this.verbose = verbose;
        this.address = address;
        this.events = events;

        const [socketHooks, socketDispatches] = createStore(socketProps);
        this.socketHooks = socketHooks;
        this.socketDispatches = socketDispatches;

        this.eventDispatches = eventDispatches;
        this.sendNames = sendNames;
    }

    private registerSocketEvents(socket: WebSocket) {
        socket.onopen = () => {
            if (this.verbose) log('info', `Connected to socket`);
            this.socketDispatches.setStatus('open');
        };

        socket.onerror = (e) => {
            if (this.verbose) log('error', 'Socket Error:', e);
            socket.close();
            this.socketDispatches.setError(e);
        };

        socket.onclose = (e) => {
            const reason = e.code in closeMessages ? closeMessages[e.code as keyof typeof closeMessages] : 'Unknown reason';
            if (this.verbose) log('error', 'Socket closed', reason);
            this.socketDispatches.setStatus('closed');
            this.socketDispatches.setCloseMessage(reason);
        };

        socket.onmessage = (event) => {
            this.onMessage(event);
        };

        this.socketDispatches.setStatus(socketStatus[socket.readyState as keyof typeof socketStatus]);
    }

    private getData(eventName: string, data: unknown): unknown {
        const selectFunc = this.events[eventName as keyof typeof this.events]?.select;
        if (!selectFunc) {
            if (this.verbose) log('info', 'No select function for event:', eventName);
            return data;
        }
        const res = selectFunc(data);
        if (this.verbose) log('info', `${eventName} used select function:`, res);
        return res;
    }

    private onMessage(event: MessageEvent) {
        const eventMap = Object.entries(this.events).map(([eventName, config]) => ({
            eventName,
            config
        }));

        for (let i = 0; i < eventMap.length; i++) {
            const { eventName, config } = eventMap[i];
            const parsed = parseEventData(event.data);
            if (!config.predicate(parsed)) continue;

            const data = this.getData(eventName, parsed);

            const key = `set${toCamelCase(eventName)}` as keyof typeof this.eventDispatches;
            if (this.verbose) log('info', `${String(key)} - `, data);

            const dispatch = this.eventDispatches[key] as (props: unknown) => void;
            dispatch(data);
            return;
        }

        if (this.verbose) log('info', 'Could not find event for data:', event.data);
    }

    private buildSendNames() {
        return Object.values(this.sendNames).reduce((accumulator, next) => {
            const send = (payload: unknown) => {
                const data = typeof payload !== 'string' ? jsonStringify(payload) : payload;
                if (data === false) return;
                this.socket?.send(data);
            };
            return {
                ...accumulator,
                [`send${toCamelCase(String(next.name))}`]: send
            };
        }, {} as SendPayloads<TSendNames>);
    }

    public init() {
        this.socket = new WebSocket(this.address);
        this.registerSocketEvents(this.socket);
    }

    public get hooks() {
        return {
            ...this.socketHooks,
            ...this.buildSendNames(),
            reconnect: () => {
                if (this.verbose) log('info', 'Reconnecting to socket');
                this.socket?.close();
                this.init();
            },
            disconnect: () => {
                if (this.verbose) log('info', 'Disconnecting from socket');
                this.socket?.close();
            },
            send: (payload: unknown) => {
                const data = typeof payload !== 'string' ? jsonStringify(payload) : payload;
                if (data === false) return;
                if (this.verbose) log('info', 'Sending data:', data);
                this.socket?.send(data);
            }
        };
    }
}

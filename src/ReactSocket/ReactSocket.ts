import { Dispatches, Predicate, Prettify, Select, Store } from '../types';
import { createStore } from '../store/store';
import {
    closeMessages,
    CloseMessages,
    jsonStringify,
    socketStatus,
    SocketStatus,
    toCamelCase,
} from '../utils';

interface AddEventConfig<TName, TData, TSelect = TData> {
    predicate: Predicate<TData>;
    select?: Select<TData, TSelect>;
    name: TName;
}

export interface SocketStore {
    status: SocketStatus;
    closeMessage?: CloseMessages | 'Unknown reason';
    error?: Event;
}

export class ReactSocket<TEvent extends Record<string, any> = {}> {
    private predicates: Record<string, Predicate> = {};

    private selects: Record<string, Select> = {};

    private readonly verbose: boolean;

    private readonly address: string;

    private socket: WebSocket | undefined;

    constructor(address: string, verbose?: boolean) {
        this.address = address;
        this.verbose = verbose ?? false;
        console.log(verbose);
    }

    addEvent<TName extends string, TData, TSelect = TData>(
        config: AddEventConfig<TName, TData, TSelect>
    ) {
        this.predicates[config.name] = config.predicate;
        if (config.select) this.selects[config.name] = config.select;
        return this as unknown as ReactSocket<
            Prettify<Record<TName, TSelect> & TEvent>
        >;
    }

    private getData(eventName: string, data: unknown): unknown {
        const selectFunc = this.selects[eventName as keyof typeof this.selects];
        if (!selectFunc) {
            console.info(
                'Could not find Select function for event:',
                eventName
            );
            return data;
        }
        console.info('Found Select function for event:', eventName);
        return selectFunc(data);
    }

    private onMessage(
        event: MessageEvent,
        dispatches: Dispatches<Store<TEvent>>
    ) {
        const eventMap = Object.entries(this.predicates).map(
            ([eventName, predicate]) => ({ eventName, predicate })
        );

        for (let i = 0; i < eventMap.length; i++) {
            const { eventName, predicate } = eventMap[i];
            if (this.verbose) console.info(`${eventName} - `, event);

            const parsed = JSON.parse(event.data);
            if (!predicate(parsed)) continue;

            const data = this.getData(eventName, parsed);
            if (this.verbose) console.info(`${eventName}`, data);

            const key =
                `set${toCamelCase(eventName)}` as keyof typeof dispatches;
            (dispatches[key] as any)();
            return;
        }

        if (this.verbose)
            console.info('Could not find event for data:', event.data);
    }

    private registerSocketEvents(
        socket: WebSocket,
        eventDispatches: Dispatches<Store<TEvent>>,
        socketDispatches: Dispatches<Store<SocketStore>>
    ) {
        socket.onopen = () => {
            if (this.verbose) console.info('Connected to socket');
            socketDispatches.setStatus('open');
        };

        socket.onerror = (e) => {
            if (this.verbose) console.info('Socket error:', e);
            socket.close();
            socketDispatches.setError(e);
        };

        socket.onclose = (e) => {
            if (this.verbose) console.info('Socket Closed:', e);
            socketDispatches.setStatus('closed');
            if (e.code in closeMessages)
                socketDispatches.setCloseMessage(
                    closeMessages[e.code as keyof typeof closeMessages]
                );
            else socketDispatches.setCloseMessage('Unknown reason');
        };

        socket.onmessage = (event) => {
            this.onMessage(event, eventDispatches);
        };

        socketDispatches.setStatus(
            socketStatus[socket.readyState as keyof typeof socketStatus]
        );
    }

    private initSocket(
        eventDispatches: Dispatches<Store<TEvent>>,
        socketDispatches: Dispatches<Store<SocketStore>>
    ) {
        this.socket = new WebSocket(this.address);
        this.registerSocketEvents(
            this.socket,
            eventDispatches,
            socketDispatches
        );
    }

    build() {
        const [eventHooks, eventDispatches] = createStore<TEvent>(
            Object.keys(this.predicates)
        );

        const [socketHooks, socketDispatches] = createStore<SocketStore>([
            'error',
            'status',
            'closeMessage',
        ]);

        this.initSocket(eventDispatches, socketDispatches);

        return [
            {
                ...socketHooks,
                reconnect: () => {
                    if (this.verbose) console.info('Reconnecting to socket');
                    this.socket?.close();
                    this.initSocket(eventDispatches, socketDispatches);
                },
                disconnect: () => {
                    if (this.verbose) console.info('Disconnecting from socket');
                },
                send: (payload: unknown) => {
                    const data =
                        typeof payload !== 'string'
                            ? jsonStringify(payload)
                            : payload;
                    if (data === false) return;
                    if (this.verbose) console.info('Sending data:', payload);
                    this.socket?.send(data);
                },
            },
            eventHooks,
        ] as const;
    }
}

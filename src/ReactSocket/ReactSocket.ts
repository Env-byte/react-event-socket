import { Dispatches, Predicate, Prettify, Select, Store } from '../types';
import { createStore } from '../store';
import {
  closeMessages,
  CloseMessages,
  jsonStringify,
  log,
  parseEventData,
  socketStatus,
  SocketStatus,
  toCamelCase
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

export class ReactSocket<TEvents extends Record<string, any> = {}> {
  private predicates: Record<string, Predicate> = {};

  private selects: Record<string, Select> = {};

  private readonly verbose: boolean;

  private readonly address: string;

  private socket: WebSocket | undefined;

  constructor(address: string);
  constructor(address: string, verbose: boolean);
  constructor(address: string, verbose?: boolean) {
    this.address = address;
    this.verbose = verbose ?? false;
  }

  addEvent<TName extends string, TData, TSelect = TData>(
    config: AddEventConfig<TName, TData, TSelect>
  ) {
    this.predicates[config.name] = config.predicate;
    if (config.select) this.selects[config.name] = config.select;
    return this as unknown as ReactSocket<
      Prettify<Record<TName, TSelect> & TEvents>
    >;
  }

  private getData(eventName: string, data: unknown): unknown {
    const selectFunc = this.selects[eventName as keyof typeof this.selects];
    if (!selectFunc) {
      if (this.verbose) log('info', 'No select function for event:', eventName);
      return data;
    }
    const res = selectFunc(data);
    if (this.verbose) log('info', `${eventName} used select function:`, res);
    return res;
  }

  private onMessage(
    event: MessageEvent,
    dispatches: Dispatches<Store<TEvents>>
  ) {
    const eventMap = Object.entries(this.predicates).map(
      ([eventName, predicate]) => ({ eventName, predicate })
    );

    for (let i = 0; i < eventMap.length; i++) {
      const { eventName, predicate } = eventMap[i];
      const parsed = parseEventData(event.data);
      if (!predicate(parsed)) continue;

      const data = this.getData(eventName, parsed);

      const key = `set${toCamelCase(eventName)}` as keyof typeof dispatches;
      if (this.verbose) log('info', `${String(key)} - `, data);

      const dispatch = dispatches[key] as (props: unknown) => void;
      dispatch(data);
      return;
    }

    if (this.verbose) log('info', 'Could not find event for data:', event.data);
  }

  private registerSocketEvents(
    socket: WebSocket,
    eventDispatches: Dispatches<Store<TEvents>>,
    socketDispatches: Dispatches<Store<SocketStore>>
  ) {
    socket.onopen = () => {
      if (this.verbose) log('info', `Connected to socket`);
      socketDispatches.setStatus('open');
    };

    socket.onerror = (e) => {
      if (this.verbose) log('error', 'Socket Error:', e);
      socket.close();
      socketDispatches.setError(e);
    };

    socket.onclose = (e) => {
      const reason =
        e.code in closeMessages
          ? closeMessages[e.code as keyof typeof closeMessages]
          : 'Unknown reason';
      if (this.verbose) log('error', 'Socket closed', reason);
      socketDispatches.setStatus('closed');
      socketDispatches.setCloseMessage(reason);
    };

    socket.onmessage = (event) => {
      this.onMessage(event, eventDispatches);
    };

    socketDispatches.setStatus(
      socketStatus[socket.readyState as keyof typeof socketStatus]
    );
  }

  private initSocket(
    eventDispatches: Dispatches<Store<TEvents>>,
    socketDispatches: Dispatches<Store<SocketStore>>
  ) {
    this.socket = new WebSocket(this.address);
    this.registerSocketEvents(this.socket, eventDispatches, socketDispatches);
  }

  build() {
    const [eventHooks, eventDispatches] = createStore<TEvents>(
      Object.keys(this.predicates)
    );

    const [socketHooks, socketDispatches] = createStore<SocketStore>([
      'error',
      'status',
      'closeMessage'
    ]);

    this.initSocket(eventDispatches, socketDispatches);

    return [
      {
        ...socketHooks,
        reconnect: () => {
          if (this.verbose) log('info', 'Reconnecting to socket');
          this.socket?.close();
          this.initSocket(eventDispatches, socketDispatches);
        },
        disconnect: () => {
          if (this.verbose) log('info', 'Disconnecting from socket');
          this.socket?.close();
        },
        send: (payload: unknown) => {
          const data =
            typeof payload !== 'string' ? jsonStringify(payload) : payload;
          if (data === false) return;
          if (this.verbose) log('info', 'Sending data:', data);
          this.socket?.send(data);
        }
      },
      eventHooks
    ] as const;
  }
}

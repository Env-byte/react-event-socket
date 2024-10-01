import {
  AddEventConfig,
  Dispatches,
  EventDispatches,
  Prettify,
  StorePropertiesFromEventRecord,
  StoreFromArray
} from '../types';
import { createStore } from '../store';
import {
  buildProperty,
  CloseMessages,
  closeMessages,
  jsonStringify,
  log,
  parseEventData,
  SocketStatus,
  socketStatus,
  toCamelCase
} from '../utils';

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

export class ReactSocket<TEvents extends Record<string, AddEventConfig> = {}> {
  private events = {} as TEvents;

  private readonly verbose: boolean;

  private readonly address: string;

  private socket: WebSocket | undefined;

  constructor(address: string);
  constructor(address: string, verbose: boolean);
  constructor(address: string, verbose?: boolean) {
    this.address = address;
    this.verbose = verbose ?? false;
  }

  addEvent<
    TName extends string,
    TData,
    TSelect = TData,
    TArray extends boolean = false
  >(config: AddEventConfig<TName, TData, TSelect, TArray>) {
    // need this as typescript doesn't understand
    this.events[config.name] = config as any;
    return this as unknown as ReactSocket<
      Prettify<
        Record<TName, AddEventConfig<TName, TData, TSelect, TArray>> & TEvents
      >
    >;
  }

  private getData(eventName: string, data: unknown): unknown {
    const selectFunc =
      this.events[eventName as keyof typeof this.events]?.select;
    if (!selectFunc) {
      if (this.verbose) log('info', 'No select function for event:', eventName);
      return data;
    }
    const res = selectFunc(data);
    if (this.verbose) log('info', `${eventName} used select function:`, res);
    return res;
  }

  private onMessage(event: MessageEvent, dispatches: EventDispatches<TEvents>) {
    const eventMap = Object.entries(this.events).map(([eventName, config]) => ({
      eventName,
      config
    }));

    for (let i = 0; i < eventMap.length; i++) {
      const { eventName, config } = eventMap[i];
      const parsed = parseEventData(event.data);
      if (!config.predicate(parsed)) continue;

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
    eventDispatches: EventDispatches<TEvents>,
    socketDispatches: Dispatches<StoreFromArray<typeof socketProps>>
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
    eventDispatches: EventDispatches<TEvents>,
    socketDispatches: Dispatches<StoreFromArray<typeof socketProps>>
  ) {
    this.socket = new WebSocket(this.address);
    this.registerSocketEvents(this.socket, eventDispatches, socketDispatches);
  }

  build() {
    const eventProps = Object.entries(this.events).map(([, config]) =>
      buildProperty()({
        name: config.name,
        isArray: config.array ?? false,
        data: undefined
      })
    );

    const [eventHooks, eventDispatches] = createStore(
      eventProps as StorePropertiesFromEventRecord<TEvents>
    );

    const [socketHooks, socketDispatches] = createStore(socketProps);

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

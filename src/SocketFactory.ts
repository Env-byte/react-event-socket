import {Socket} from './Socket';
import {buildProperty, createStore, type GetStoreProperties, type ToCamelCase} from './store';
import {Middleware} from "./utils";

export type Predicate<TData = unknown> = (data: TData) => boolean;
export type Select<TData = unknown, TSelect = TData> = (data: TData) => TSelect;

export type BaseEventConfig<TName extends string, TData = unknown, TSelect = TData> = {
    predicate: Predicate<TData>;
    select?: Select<TData, TSelect>;
    name: TName;
};

export interface SendNameConfig<TName extends string, TData = unknown> {
    name: TName;
    middleware?: Array<Middleware<TData>>;
}

export type SendPayloads<T extends Record<string, any>> = {
    [Key in keyof T as `${ToCamelCase<Extract<Key, string>>}`]: T[Key] extends SendNameConfig<any, infer Data>
        ? (payload: Data) => void
        : never;
};

export interface ReactEventSocketConfig {
    logging?: boolean;
}

interface BaseBuildProps {
    messageTimeout: number;
    reconnectOnError: boolean;
}

type BuildProps = BaseBuildProps &
    (
        | {
        initialConnect?: false;
    }
        | { initialConnect: true; address: string }
        );

export type AddEventConfig<
    TName extends string = '',
    TData = unknown,
    TSelect = TData,
    TArray extends boolean = true,
> = BaseEventConfig<TName, TData, TSelect> &
    (TArray extends true
        ? {
            size: number;
            array: true;
        }
        : { array?: TArray });

// this is okay we don't want a Record<string, never> as it breaks the type inference
// eslint-disable-next-line @typescript-eslint/ban-types
export class ReactEventSocket<TEvents extends Record<string, AddEventConfig> = {}, TPayloads extends Record<string, any> = {}> {
    private readonly logging: boolean;

    private payloads = {} as TPayloads;


    private events = {} as TEvents;

    constructor({logging}: ReactEventSocketConfig) {
        this.logging = logging ?? false;
    }

    addEvent<TName extends string, TData, TSelect = TData, TArray extends boolean = false>(
        config: AddEventConfig<TName, TData, TSelect, TArray>,
    ) {
        this.events = {...this.events, [config.name]: config};
        return this as unknown as ReactEventSocket<Record<TName, AddEventConfig<TName, TData, TSelect, TArray>> & TEvents, TPayloads>;
    }

    addPayload<TData>() {
        return <TName extends string>(config: SendNameConfig<TName, TData>) => {
            this.payloads[config.name] = config as any;
            return this as unknown as ReactEventSocket<TEvents, Record<TName, SendNameConfig<TName, TData>> & TPayloads>;
        };
    }

    build(props: BuildProps) {
        const eventProps = Object.entries(this.events).map(([, config]) => {
            const baseObj = {
                name: config.name,
                isArray: config.array ?? false,
                data: undefined,
                size: undefined,
            };
            return buildProperty()(config.array ? {...baseObj, size: config.size} : baseObj);
        });
        const eventStore = createStore(eventProps as GetStoreProperties<TEvents>);

        const {messageTimeout, reconnectOnError, initialConnect} = props;

        const address = initialConnect ? props.address : '';

        const [eventDispatches, useStore] = eventStore;

        const socket = new Socket({
            events: this.events,
            eventDispatches,
            logging: this.logging,
            payloads: this.payloads,
        });

        const {connect,payloads} = socket.init({messageTimeout, reconnectOnError});
        if (initialConnect) connect(address);

        return {
            socket: {...socket.hooks, disconnect: () => socket.disconnect(), connect, send: payloads as SendPayloads<TPayloads>},
            useSocketStore: useStore,
        } as const;
    }
}
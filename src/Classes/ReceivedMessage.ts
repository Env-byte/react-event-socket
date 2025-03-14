import { AddEventConfig, Prettify, GetStoreProperties } from '../types';
import { buildProperty } from '../utils';
import { createStore } from '../store';

export class ReceivedMessage<TEvents extends Record<string, any> = {}> {
    private _events = {} as TEvents;

    addEvent<TName extends string, TData, TSelect = TData, TArray extends boolean = false>(
        config: AddEventConfig<TName, TData, TSelect, TArray>
    ) {
        this._events[config.name] = config as any;
        return this as unknown as ReceivedMessage<Prettify<Record<TName, AddEventConfig<TName, TData, TSelect, TArray>> & TEvents>>;
    }

    get events() {
        const eventProps = Object.entries(this._events).map(([, config]) => {
            const baseObj = {
                name: config.name,
                isArray: config.array ?? false,
                data: undefined
            };
            return buildProperty()(config.array ? { ...baseObj, size: config.size } : config);
        });
        return createStore(eventProps as GetStoreProperties<TEvents>);
    }

    get config() {
        return this._events;
    }
}

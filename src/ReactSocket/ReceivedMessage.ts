import { AddEventConfig, Prettify, StorePropertiesFromEventRecord } from '../types';
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
        const eventProps = Object.entries(this._events).map(([, config]) =>
            buildProperty()({
                name: config.name,
                isArray: config.array ?? false,
                data: undefined
            })
        );
        return createStore(eventProps as StorePropertiesFromEventRecord<TEvents>);
    }

    get config() {
        return this._events
    }
}

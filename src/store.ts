import {create, StoreApi, UseBoundStore} from 'zustand';
import {subscribeWithSelector} from 'zustand/middleware';
import {type AddEventConfig} from './SocketFactory';
import {upperCaseFirstCharacter} from "./utils";


type IsDash<T extends string> = T extends '-' ? true : false;

export type ToCamelCase<T extends string> = T extends `${infer first}${infer rest}`
    ? IsDash<first> extends true
        ? `${Capitalize<ToCamelCase<rest>>}`
        : `${first}${ToCamelCase<rest>}`
    : '';

export type Dispatches<T extends Record<string, unknown>> = {
    [Key in keyof T as `set${Capitalize<ToCamelCase<Extract<Key, string>>>}`]-?: (
        props: Exclude<T[Key], undefined>,
    ) => void;
};

export type GetStore<T extends StoreProperty<string, true | false>[]> = {
    [K in T[number] as K['name']]: K extends StoreProperty<string, infer TArray, infer TData>
        ? TArray extends true
            ? Exclude<TData, undefined>[]
            : TData
        : never;
};

export type StoreProperty<TName extends string = '', TArray extends boolean = true, TData = unknown> = {
    name: TName;
    data: TData;
} & (TArray extends true ? { isArray: true; size: number | undefined } : { isArray?: TArray });

export type RecordToArray<T extends Record<string, unknown>> = Array<T[keyof T]>;

export type GetStoreProperties<T extends Record<string, AddEventConfig>> = RecordToArray<{
    // tslint:disable-next-line:no-any This any is needed for inference
    [K in keyof T]: T[K] extends AddEventConfig<infer TName, any, infer TData, infer TArray>
        ? StoreProperty<TName, TArray, TData | undefined>
        : never;
}>;

export const buildProperty =
    <TData>() =>
        <TName extends string, TInitial, TArray extends boolean>(props: StoreProperty<TName, TArray, TData | TInitial>) =>
            props;

export const toCamelCase = (str: string) => str
        .split('-')
        .map((part, index) => (index === 0 ? part : upperCaseFirstCharacter(part)))
        .join('')

const createDispatch = <Store extends Record<string, unknown>>(
    useStore: UseBoundStore<StoreApi<Store>>,
    properties: StoreProperty<string, boolean>,
) => {
    if (!properties.isArray) {
        return (value: unknown) => {
            useStore.setState({
                [properties.name]: value,
            } as Partial<Store>);
        };
    }

    return (value: unknown) => {
        const existing = useStore.getState()[properties.name];
        const array = Array.isArray(existing) ? existing : [];
        let newArray = [...array, value];
        if (properties.size && newArray.length > properties.size) {
            newArray = newArray.slice(-properties.size);
        }

        useStore.setState({[properties.name]: newArray} as Partial<Store>);
    };
};

const buildDispatches = <Store extends Record<string, unknown>>(
    useStore: UseBoundStore<StoreApi<Store>>,
    properties: StoreProperty<string, boolean>[],
) =>
    Object.keys(useStore.getState()).reduce((acc, key) => {
        const dispatchName = toCamelCase(`set-${key}`);
        const property = properties.find((prop) => prop.name === key);
        if (!property) throw new Error(`Unknown property "${key}"`);
        const setValue = createDispatch(useStore, property);
        return {...acc, [dispatchName]: setValue};
    }, {} as Dispatches<Store>);

export const createStore = <Properties extends (StoreProperty<string> | StoreProperty<string, false>)[]>(
    properties: Properties,
) => {
    const store = properties.reduce(
        (acc, prop) => ({
            ...acc,
            [prop.name]: prop.isArray ? (prop.data ?? []) : prop.data,
        }),
        {},
    ) as GetStore<Properties>;
    const useStore = create<GetStore<Properties>>()(
        subscribeWithSelector(() => ({
            ...store,
        })),
    );
    const dispatches = buildDispatches(useStore, properties);
    return [dispatches, useStore] as const;
};
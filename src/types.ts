export type Prettify<T> = {
    [K in keyof T]: T[K];
} & {};

export type Predicate<TData = any> = (data: TData) => boolean;
export type Select<TData = any, TSelect = TData> = (data: TData) => TSelect;
export type RecordToArray<T extends Record<string, any>> = Array<T[keyof T]>;
type IsDash<T extends string> = T extends `-` ? true : false;

export type ToCamelCase<T extends string> = T extends `${infer first}${infer rest}`
    ? IsDash<first> extends true
        ? `${Capitalize<ToCamelCase<rest>>}`
        : `${first}${ToCamelCase<rest>}`
    : '';

export type SendPayloads<T extends Record<string, any>> = {
    [Key in keyof T as `send${Capitalize<ToCamelCase<Extract<Key, string>>>}`]: T[Key] extends SendNameConfig<any, infer Data>
        ? (payload: Data) => void
        : never;
};

export type Dispatches<T extends Record<string, any>> = {
    [Key in keyof T as `set${Capitalize<ToCamelCase<Extract<Key, string>>>}`]-?: (props: Exclude<T[Key], undefined>) => void;
};

export type Hooks<T extends Record<string, any>> = {
    [Key in keyof T as `use${Capitalize<ToCamelCase<Extract<Key, string>>>}`]-?: () => T[Key];
};

export type GetStore<T extends any[]> = {
    [K in T[number] as K['name']]: K extends StoreProperty<any, infer TArray, infer TData>
        ? TArray extends true
            ? Exclude<TData, undefined>[]
            : TData
        : never;
};

export type GetStoreProperties<T extends Record<string, any>> = RecordToArray<{
    [K in keyof T]: T[K] extends AddEventConfig<infer TName, any, infer TData, infer TArray>
        ? StoreProperty<TName, TArray, TData | undefined>
        : never;
}>;

export type BaseEventConfig<TName extends string = '', TData = any, TSelect = TData> = {
    predicate: Predicate<TData>;
    select?: Select<TData, TSelect>;
    name: TName;
};
export type AddEventConfig<TName extends string = '', TData = any, TSelect = TData, TArray extends boolean = false> = BaseEventConfig<
    TName,
    TSelect,
    TData
> &
    (TArray extends true ? { size?: number; array: true } : { array?: TArray });

export type StoreProperty<TName extends string, TArray extends boolean, TData = unknown> = {
    name: TName;
    data: TData;
} & (TArray extends true ? { isArray: true; size: number | undefined } : { isArray?: TArray });

export type Middleware<TData = any> = (props: { name: string; data: TData }) => unknown;

export interface SendNameConfig<TName extends string, TData> {
    name: TName;
    middleware?: Array<Middleware<TData>>;
}

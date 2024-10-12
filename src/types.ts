export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type Predicate<TData = any> = (data: TData) => boolean;
export type Select<TData = any, TSelect = TData> = (data: TData) => TSelect;
export type RecordToArray<T extends Record<string, any>> = Array<T[keyof T]>;
type IsDash<T extends string> = T extends `-` ? true : false;

export type ToCamelCase<T extends string> =
  T extends `${infer first}${infer rest}`
    ? IsDash<first> extends true
      ? `${Capitalize<ToCamelCase<rest>>}`
      : `${first}${ToCamelCase<rest>}`
    : '';

export type EventDispatches<T extends Record<string, any>> = Prettify<
  Dispatches<StoreFromArray<StorePropertiesFromEventRecord<T>>>
>;

export type SendPayloads<T extends Record<string, any>> = Prettify<{
  [Key in keyof T as `send${Capitalize<ToCamelCase<Extract<Key, string>>>}`]: (
    payload: T[Key]
  ) => void;
}>;

export type SendPayloadsUnion<T extends Record<string, any>> = Prettify<{
  [Key in keyof T]: T[Key];
}[keyof T]>;

export type Dispatches<T extends Record<string, any>> = {
  [Key in keyof T as `set${Capitalize<ToCamelCase<Extract<Key, string>>>}`]-?: (
    props: Exclude<T[Key], undefined>
  ) => void;
};

export type Hooks<T extends Record<string, any>> = {
  [Key in keyof T as `use${Capitalize<ToCamelCase<Extract<Key, string>>>}`]-?: () => T[Key];
};

export type StoreFromArray<T extends any[]> = {
  [K in T[number] as K['name']]: K extends StoreProperty<
    any,
    infer TArray,
    infer TData
  >
    ? TArray extends true
      ? Exclude<TData, undefined>[]
      : TData
    : never;
};

export type StorePropertiesFromEventRecord<T extends Record<string, any>> =
  RecordToArray<{
    [K in keyof T]: T[K] extends AddEventConfig<
      infer TName,
      any,
      infer TData,
      infer TArray
    >
      ? StoreProperty<TName, TArray, TData | undefined>
      : never;
  }>;

export interface AddEventConfig<
  TName extends string = '',
  TData = any,
  TSelect = TData,
  TArray extends boolean = false
> {
  predicate: Predicate<TData>;
  select?: Select<TData, TSelect>;
  name: TName;
  array?: TArray;
}

export interface StoreProperty<
  TName extends string,
  TArray extends boolean,
  TData = unknown
> {
  name: TName;
  data: TData;
  isArray: TArray;
}

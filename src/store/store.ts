import { create, StoreApi, UseBoundStore } from 'zustand';
import { Dispatches, Hooks, Prettify, StoreFromArray } from '../types';
import { toCamelCase } from '../utils';

const buildDispatches = <Store extends Record<string, unknown>>(
  useStore: UseBoundStore<StoreApi<Store>>
) =>
  Object.keys(useStore.getState()).reduce((acc, key) => {
    const keyValue = key as keyof Store;
    const dispatchName = `set${toCamelCase(key)}`;
    const setValue = (value: unknown | ((s: unknown) => unknown)) => {
      useStore.setState({ [keyValue]: value } as any);
    };
    return { ...acc, [dispatchName]: setValue };
  }, {} as Prettify<Dispatches<Store>>);

const buildHooks = <Store extends Record<string, unknown>>(
  useStore: UseBoundStore<StoreApi<Store>>
) =>
  Object.keys(useStore.getState()).reduce((acc, key) => {
    const keyValue = key as keyof Store;
    const getterName = `use${toCamelCase(key)}`;
    return { ...acc, [getterName]: () => useStore((s) => s[keyValue]) };
  }, {} as Prettify<Hooks<Store>>);

export const createStore = <Properties extends any[]>(
  properties: Properties
) => {
  const store = properties.reduce(
    (acc, prop) => ({
      ...acc,
      [prop.name]: prop.isArray ? prop.data ?? [] : prop.data
    }),
    {} as StoreFromArray<Properties>
  );
  const useStore = create<StoreFromArray<Properties>>()(() => ({ ...store }));

  const dispatches = buildDispatches(useStore);
  const hooks = buildHooks(useStore);

  return [hooks, dispatches] as const;
};

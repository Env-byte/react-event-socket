import { create, StoreApi, UseBoundStore } from 'zustand';
import {
  Dispatches,
  Hooks,
  Prettify,
  StoreFromArray,
  StoreProperty
} from '../types';
import { toCamelCase } from '../utils';

const createDispatch = <Store extends Record<string, unknown>>(
  useStore: UseBoundStore<StoreApi<Store>>,
  properties: StoreProperty<string, boolean>
) => {
  if (!properties.isArray) {
    return (value: unknown | ((s: unknown) => unknown)) => {
      useStore.setState({ [properties.name]: value } as any);
    };
  }

  return (value: unknown | ((s: unknown) => unknown)) => {
    const existing = useStore.getState()[properties.name];
    const array = Array.isArray(existing) ? existing : [];
    useStore.setState({ [properties.name]: [...array, value] } as any);
  };
};

const buildDispatches = <Store extends Record<string, unknown>>(
  useStore: UseBoundStore<StoreApi<Store>>,
  properties: StoreProperty<string, boolean>[]
) =>
  Object.keys(useStore.getState()).reduce(
    (acc, key) => {
      const dispatchName = `set${toCamelCase(key)}`;
      const property = properties.find((prop) => prop.name === key);
      if (!property) throw new Error(`Unknown property "${key}"`);
      const setValue = createDispatch(useStore, property);
      return { ...acc, [dispatchName]: setValue };
    },
    {} as Prettify<Dispatches<Store>>
  );

const buildHooks = <Store extends Record<string, unknown>>(
  useStore: UseBoundStore<StoreApi<Store>>
) =>
  Object.keys(useStore.getState()).reduce(
    (acc, key) => {
      const keyValue = key as keyof Store;
      const getterName = `use${toCamelCase(key)}`;
      return { ...acc, [getterName]: () => useStore((s) => s[keyValue]) };
    },
    {} as Prettify<Hooks<Store>>
  );

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

  const dispatches = buildDispatches(useStore, properties);
  const hooks = buildHooks(useStore);

  return [hooks, dispatches] as const;
};

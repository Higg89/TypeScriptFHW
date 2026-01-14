export type ReadonlyFields<T> = {
  readonly [K in keyof T]: T[K];
};

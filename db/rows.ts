import { type AnyColumn, sql, type Table } from "drizzle-orm";

/*
  Types for the rows of raw `sql` queries, derived from db/schema.ts. A raw
  query answers each column under its database name (`published_at`), so
  these rows are keyed by that name: renaming a column, in TypeScript or in
  the database, breaks the code that still reads the old one.
*/

/**
 * A column's value as a raw query answers it. node-postgres through Drizzle
 * answers timestamps as Postgres text (service/swiftter.ts iso() reads both).
 */
export type RawValue<C extends AnyColumn> = (C["_"]["data"] extends Date ? Date | string : C["_"]["data"]) | (C["_"]["notNull"] extends true ? never : null);

/** A raw row of these columns of a table (its TypeScript keys), keyed by their database names. */
export type RowOf<T extends Table, K extends keyof T["_"]["columns"]> = {
  [C in K as T["_"]["columns"][C]["_"]["name"]]: RawValue<T["_"]["columns"][C]>;
};

/** A row whose columns the query only selects when set (`published_at is not null`). */
export type NotNull<R> = { [K in keyof R]: NonNullable<R[K]> };

/** A row's columns with a narrower type than the schema's, which the query guarantees (`status in ('pending', 'blocked')`). */
export type Narrowed<R, V> = { [K in keyof R]: V };

/** A column's bare name, for the places Postgres wants it unqualified: an insert's column list, an update's `set`. */
export const bare = (column: AnyColumn) => sql.identifier(column.name);

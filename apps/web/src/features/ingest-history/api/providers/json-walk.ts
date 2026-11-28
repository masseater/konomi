import {
  Array as Arr,
  Function as Fn,
  Match,
  Option,
  Predicate,
  Record as Rec,
  pipe,
} from "effect";

const MAX_NODES = 200_000;
const BINARY = 2;
const FIRST_VISIT = 0;
const STEP = 1;
const EMPTY = 0;

export type Named = Readonly<{ name: string; value: unknown }>;

type Expansion = Readonly<{ hits: readonly Named[]; children: readonly unknown[] }>;

const LEAF: Expansion = { hits: [], children: [] };

const expand = (node: unknown, names: readonly string[]): Expansion =>
  Match.value(node).pipe(
    Match.when(Predicate.isString, (): Expansion => LEAF),
    Match.when(Predicate.isIterable, (items): Expansion => ({
      hits: [],
      children: Arr.fromIterable(items),
    })),
    Match.when(Predicate.isReadonlyObject, (record): Expansion => ({
      hits: pipe(
        names,
        Arr.map((name) =>
          pipe(
            Rec.get(record, name),
            Option.map((value) => ({ name, value })),
          ),
        ),
        Arr.getSomes,
      ),
      children: Rec.values(record),
    })),
    Match.orElse((): Expansion => LEAF),
  );

const walk = (root: unknown, names: readonly string[]): readonly Named[] => {
  const found: Named[] = [];
  const pending: unknown[] = [root];
  for (let visited = FIRST_VISIT; visited < MAX_NODES && pending.length > EMPTY; visited += STEP) {
    const { hits, children } = expand(pending.pop(), names);
    found.push(...hits);
    pending.push(...Arr.reverse(children));
  }
  return found;
};

export const nodesNamed: {
  (names: readonly string[]): (root: unknown) => readonly Named[];
  (root: unknown, names: readonly string[]): readonly Named[];
} = Fn.dual(BINARY, walk);

export const valuesNamed: {
  (name: string): (root: unknown) => readonly unknown[];
  (root: unknown, name: string): readonly unknown[];
} = Fn.dual(BINARY, (root: unknown, name: string): readonly unknown[] =>
  pipe(
    walk(root, [name]),
    Arr.map(({ value }) => value),
  ),
);

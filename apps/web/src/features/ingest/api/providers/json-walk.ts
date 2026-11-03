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

type Named = Readonly<{ name: string; value: unknown }>;

const childrenOf = (node: unknown): readonly unknown[] =>
  Match.value(node).pipe(
    Match.when(Predicate.isString, (): readonly unknown[] => []),
    Match.when(Predicate.isIterable, (items) => Arr.fromIterable(items)),
    Match.when(Predicate.isReadonlyObject, (record) => Rec.values(record)),
    Match.orElse((): readonly unknown[] => []),
  );

const hitsOf = (node: unknown, names: readonly string[]): readonly Named[] =>
  Match.value(node).pipe(
    Match.when(Arr.isArray, (): readonly Named[] => []),
    Match.when(Predicate.isReadonlyObject, (record) =>
      pipe(
        names,
        Arr.map((name) =>
          pipe(
            Rec.get(record, name),
            Option.map((value) => ({ name, value })),
          ),
        ),
        Arr.getSomes,
      ),
    ),
    Match.orElse((): readonly Named[] => []),
  );

const walk = (root: unknown, names: readonly string[]): readonly Named[] => {
  const found: Named[] = [];
  const pending: unknown[] = [root];
  for (let visited = FIRST_VISIT; visited < MAX_NODES && pending.length > EMPTY; visited += STEP) {
    const node = pending.pop();
    found.push(...hitsOf(node, names));
    pending.push(...Arr.reverse(childrenOf(node)));
  }
  return found;
};

const nodesNamed: {
  (names: readonly string[]): (root: unknown) => readonly Named[];
  (root: unknown, names: readonly string[]): readonly Named[];
} = Fn.dual(BINARY, walk);

const valuesNamed: {
  (name: string): (root: unknown) => readonly unknown[];
  (root: unknown, name: string): readonly unknown[];
} = Fn.dual(BINARY, (root: unknown, name: string): readonly unknown[] =>
  pipe(
    walk(root, [name]),
    Arr.map(({ value }) => value),
  ),
);

export type { Named };
export { nodesNamed, valuesNamed };

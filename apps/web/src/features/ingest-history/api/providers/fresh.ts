import { Array as Arr, Option, pipe } from "effect";

const MATCH_RUN = 3;
const START = 0;
const LAST = 1;

const alignsAt =
  ({ previous, current }: Readonly<{ previous: readonly string[]; current: readonly string[] }>) =>
  (index: number): boolean => {
    const run = Math.min(MATCH_RUN, previous.length, current.length - index);
    return pipe(
      Arr.range(START, run - LAST),
      Arr.every((offset) => current[index + offset] === previous[offset]),
    );
  };

const freshOf = ({
  previous,
  current,
}: Readonly<{ previous: readonly string[]; current: readonly string[] }>): readonly string[] =>
  pipe(
    Arr.isReadonlyArrayEmpty(previous) || Arr.isReadonlyArrayEmpty(current),
    Option.liftPredicate((empty) => !empty),
    Option.flatMap(() =>
      pipe(Arr.range(START, current.length - LAST), Arr.findFirst(alignsAt({ previous, current }))),
    ),
    Option.match({
      onNone: () => current,
      onSome: (index) => pipe(current, Arr.take(index)),
    }),
  );

export { freshOf };

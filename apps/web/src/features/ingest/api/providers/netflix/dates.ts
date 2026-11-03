import { Array as Arr, Equivalence, Option, String as Str, pipe } from "effect";

type Order = Readonly<{ year: number; month: number; day: number }>;

type CalendarDay = Readonly<{ year: number; month: number; day: number }>;

const ORDERS: readonly Order[] = [
  { year: 0, month: 1, day: 2 },
  { year: 2, month: 0, day: 1 },
  { year: 2, month: 1, day: 0 },
];

const FULL_YEAR_DIGITS = 4;
const SHORT_YEAR_DIGITS = 2;
const CENTURY = 2000;
const FIRST = 1;
const LAST_MONTH = 12;
const DATE_PARTS = 3;

const yearOf = (token: string): Option.Option<number> =>
  pipe(
    Option.some(token),
    Option.filter((text) => text.length === FULL_YEAR_DIGITS || text.length === SHORT_YEAR_DIGITS),
    Option.map((text) => Number(text) + Number(text.length === SHORT_YEAR_DIGITS) * CENTURY),
  );

const calendarDayOf = ({ year, month, day }: CalendarDay): Option.Option<number> => {
  const epoch = Date.UTC(year, month - FIRST, day);
  const nextMonth = Date.UTC(year, month, FIRST);
  return pipe(
    Option.some(epoch),
    Option.filter(() => month >= FIRST && month <= LAST_MONTH && day >= FIRST),
    Option.filter((found) => found < nextMonth),
  );
};

const tokensOf = (date: string): readonly string[] =>
  pipe(Str.split(date, /\D+/u), Arr.filter(Str.isNonEmpty));

const numberAt =
  (tokens: readonly string[]) =>
  (index: number): Option.Option<number> =>
    pipe(Arr.get(tokens, index), Option.map(Number));

const epochIn =
  (order: Order) =>
  (date: string): Option.Option<number> => {
    const tokens = tokensOf(date);
    const at = numberAt(tokens);
    const year = pipe(Arr.get(tokens, order.year), Option.flatMap(yearOf));
    return pipe(
      Option.all({ year, month: at(order.month), day: at(order.day) }),
      Option.filter(() => tokens.length === DATE_PARTS),
      Option.flatMap(calendarDayOf),
    );
  };

const descending = ([later, earlier]: readonly [number, number]): boolean => earlier <= later;

const isNewestFirst = (epochs: readonly number[]): boolean =>
  pipe(epochs, Arr.zip(Arr.drop(epochs, FIRST)), Arr.every(descending));

const epochsIn =
  (dates: readonly string[]) =>
  (order: Order): Option.Option<readonly number[]> =>
    pipe(dates, Arr.map(epochIn(order)), Option.all);

const sameEpochs = Arr.makeEquivalence(Equivalence.Number);

const onlyReading = (readings: readonly (readonly number[])[]): Option.Option<readonly number[]> =>
  pipe(
    Arr.head(readings),
    Option.filter((first) =>
      pipe(
        readings,
        Arr.every((other) => sameEpochs(first, other)),
      ),
    ),
  );

const datesToEpochs = (dates: readonly string[]): Option.Option<readonly number[]> => {
  const readings = pipe(ORDERS, Arr.map(epochsIn(dates)), Arr.getSomes);
  return pipe(
    onlyReading(readings),
    Option.orElse(() => onlyReading(pipe(readings, Arr.filter(isNewestFirst)))),
  );
};

export { datesToEpochs };

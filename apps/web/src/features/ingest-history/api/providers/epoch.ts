import { Option, pipe } from "effect";

export const parsedEpoch = (text: Option.Option<string>): Option.Option<number> =>
  pipe(
    text,
    Option.map((value) => Date.parse(value)),
    Option.filter(Number.isFinite),
  );

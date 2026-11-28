import { Option } from "effect";

export const FOLLOW_NEXT = {
  follow: ({ next }: Readonly<{ next?: string | null | undefined }>): Option.Option<string> =>
    Option.fromNullishOr(next),
};

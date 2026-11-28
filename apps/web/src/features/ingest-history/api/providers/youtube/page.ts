import { Option } from "effect";

export const TOKEN_NEXT = {
  cursor: "pageToken",
  cursorOf: ({
    nextPageToken,
  }: Readonly<{ nextPageToken?: string | null | undefined }>): Option.Option<string> =>
    Option.fromNullishOr(nextPageToken),
};

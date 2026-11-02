import {
  Array as Arr,
  Clock,
  DateTime,
  Effect,
  Match,
  Option,
  Schema,
  String as Str,
  pipe,
} from "effect";

import type { ActivityInput } from "#/entities/activity";
import type { FetchPlan, Source } from "#/features/ingest/model/source";
import type { SourceError } from "#/features/ingest/model/source-error";
import type { ActivityKind } from "#/shared/config";

import { fetchJson } from "./fetch-json.server";

const API_ORIGIN = "https://nvapi.nicovideo.jp";
const WATCH_URL = "https://www.nicovideo.jp/watch/";
const USER_URL = "https://www.nicovideo.jp/user/";
const PAGE_SIZE = 100;
const FIRST_PAGE = 1;
const BACKFILL_PAGES = 10;
const SESSION_COOKIE = "user_session";

const OptionalText = Schema.optional(Schema.String);

const OwnerName = Schema.optional(Schema.NullOr(Schema.String));

const OptionalOwner = Schema.optional(Schema.NullOr(Schema.Struct({ name: OwnerName })));

const Video = Schema.Struct({ id: Schema.String, title: Schema.String, owner: OptionalOwner });

const VideoItem = Schema.Struct({
  video: Video,
  lastViewedAt: OptionalText,
  likedAt: OptionalText,
  addedAt: OptionalText,
});

const VideoItems = Schema.Array(VideoItem);

const VideoPage = Schema.Struct({
  data: Schema.Struct({ items: VideoItems, hasNext: Schema.optional(Schema.Boolean) }),
});

const MylistSummaries = Schema.Array(Schema.Struct({ id: Schema.Int }));

const MylistIndex = Schema.Struct({ data: Schema.Struct({ mylists: MylistSummaries }) });

const Mylist = Schema.Struct({ items: VideoItems });

const MylistPage = Schema.Struct({ data: Schema.Struct({ mylist: Mylist }) });

const FollowedUsers = Schema.Array(Schema.Struct({ id: Schema.Int, nickname: Schema.String }));

const FollowingPage = Schema.Struct({ data: Schema.Struct({ items: FollowedUsers }) });

type VideoEntry = typeof VideoItem.Type;

const cookieOf = (secret: string): string => {
  const value = Str.trim(secret);
  return Match.value(value).pipe(
    Match.when(Str.includes("="), (cookie) => cookie),
    Match.orElse((session) => `${SESSION_COOKIE}=${session}`),
  );
};

const headersOf = (secret: string): Readonly<Record<string, string>> => ({
  Cookie: cookieOf(secret),
  "X-Frontend-Id": "6",
  "X-Frontend-Version": "0",
  "X-Niconico-Language": "ja-jp",
});

const pageUrl = (path: string, page: number): string =>
  `${API_ORIGIN}${path}?page=${page}&pageSize=${PAGE_SIZE}`;

const epochMillisOf = (text: string): Option.Option<number> =>
  Option.map(DateTime.make(text), DateTime.toEpochMillis);

const occurredAtOf = (item: VideoEntry, fallback: number): number => {
  const stamped = pipe(
    [item.lastViewedAt, item.likedAt, item.addedAt],
    Arr.map(Option.fromUndefinedOr),
    Option.firstSomeOf,
  );
  return pipe(
    stamped,
    Option.flatMap(epochMillisOf),
    Option.getOrElse(() => fallback),
  );
};

const ownerNameOf = (item: VideoEntry): string | undefined => {
  const owner = Option.fromNullishOr(item.video.owner);
  return pipe(
    owner,
    Option.flatMap(({ name }) => Option.fromNullishOr(name)),
    Option.getOrUndefined,
  );
};

const toActivity =
  (kind: ActivityKind, fetchedAt: number) =>
  (item: VideoEntry): ActivityInput => ({
    source: "niconico",
    kind,
    itemId: item.video.id,
    title: item.video.title,
    creator: ownerNameOf(item),
    url: `${WATCH_URL}${item.video.id}`,
    occurredAtMs: occurredAtOf(item, fetchedAt),
  });

const pageCountOf = (plan: FetchPlan): number =>
  Match.value(plan.backfill).pipe(
    Match.when(true, () => BACKFILL_PAGES),
    Match.orElse(() => FIRST_PAGE),
  );

type VideoListing = Readonly<{ path: string; kind: ActivityKind }>;

const collectVideoPages = (
  secret: string,
  plan: FetchPlan,
  { path, kind }: VideoListing,
): Effect.Effect<readonly ActivityInput[], SourceError> =>
  Effect.gen(function* gatherVideoPages() {
    const toRow = toActivity(kind, yield* Clock.currentTimeMillis);
    const collected: ActivityInput[] = [];
    for (const page of Arr.range(FIRST_PAGE, pageCountOf(plan))) {
      const { data } = yield* fetchJson({
        url: pageUrl(path, page),
        headers: headersOf(secret),
        schema: VideoPage,
      });
      collected.push(...pipe(data.items, Arr.map(toRow)));
      if (data.hasNext !== true) {
        break;
      }
    }
    return collected;
  });

const collectMylists = (secret: string): Effect.Effect<readonly ActivityInput[], SourceError> =>
  Effect.gen(function* gatherMylists() {
    const toRow = toActivity("saved", yield* Clock.currentTimeMillis);
    const { data } = yield* fetchJson({
      url: `${API_ORIGIN}/v1/users/me/mylists`,
      headers: headersOf(secret),
      schema: MylistIndex,
    });
    const collected: ActivityInput[] = [];
    for (const { id } of data.mylists) {
      const listed = yield* fetchJson({
        url: pageUrl(`/v1/users/me/mylists/${id}`, FIRST_PAGE),
        headers: headersOf(secret),
        schema: MylistPage,
      });
      collected.push(...pipe(listed.data.mylist.items, Arr.map(toRow)));
    }
    return collected;
  });

const collectFollowing = (secret: string): Effect.Effect<readonly ActivityInput[], SourceError> =>
  Effect.gen(function* gatherFollowing() {
    const fetchedAt = yield* Clock.currentTimeMillis;
    const { data } = yield* fetchJson({
      url: pageUrl("/v1/users/me/following/users", FIRST_PAGE),
      headers: headersOf(secret),
      schema: FollowingPage,
    });
    return pipe(
      data.items,
      Arr.map(({ id, nickname }): ActivityInput => ({
        source: "niconico",
        kind: "followed",
        itemId: String(id),
        title: nickname,
        creator: nickname,
        url: `${USER_URL}${id}`,
        occurredAtMs: fetchedAt,
      })),
    );
  });

const VIDEO_LISTINGS: readonly VideoListing[] = [
  { path: "/v1/users/me/watch/history", kind: "watched" },
  { path: "/v1/users/me/likes", kind: "liked" },
];

const collectNiconico = (
  secret: string,
  plan: FetchPlan,
): Effect.Effect<readonly ActivityInput[], SourceError> =>
  Effect.gen(function* gatherNiconico() {
    const collected: ActivityInput[] = [];
    for (const listing of VIDEO_LISTINGS) {
      collected.push(...(yield* collectVideoPages(secret, plan, listing)));
    }
    collected.push(...(yield* collectMylists(secret)), ...(yield* collectFollowing(secret)));
    return collected;
  }).pipe(Effect.withSpan("niconico.collect"));

const niconico: Source = { id: "niconico", collect: collectNiconico };

export { niconico };

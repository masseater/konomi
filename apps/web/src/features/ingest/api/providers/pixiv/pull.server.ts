import { BookmarkRestrict, FollowRestrict, PixivClient } from "@book000/pixivts";
import { Array as Arr, Clock, Effect, pipe } from "effect";

import { BACKFILLED, pagesOf } from "#/features/ingest/api/providers/backfill-cursor";
import { requireField } from "#/features/ingest/api/providers/credential-field";
import { CredentialRejected } from "#/features/ingest/model/credential-rejected";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest/model/provider";

import { FIELD } from "./api";
import { collectListing } from "./listing.server";
import { followObservationsOf, illustObservationsOf, novelObservationsOf } from "./subjects";

const RESTRICTS = [BookmarkRestrict.PUBLIC, BookmarkRestrict.PRIVATE] as const;
const FOLLOW_RESTRICTS = [FollowRestrict.PUBLIC, FollowRestrict.PRIVATE] as const;

const each = <Item>(
  restricts: readonly ("public" | "private")[],
  listing: (restrict: "public" | "private") => Effect.Effect<readonly Item[], ProviderError>,
): Effect.Effect<readonly Item[], ProviderError> =>
  pipe(restricts, Effect.forEach(listing), Effect.map(Arr.flatten));

const clientOf = (refreshToken: string): Effect.Effect<PixivClient, CredentialRejected> =>
  Effect.tryPromise({
    try: () => PixivClient.of(refreshToken),
    catch: () =>
      CredentialRejected.make({ message: "pixiv の refresh token が通らなかった。取り直して貼る" }),
  }).pipe(Effect.withSpan("pixiv.login"));

const pullPixiv = ({ credential, cursor }: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* pixiv() {
    const client = yield* clientOf(yield* requireField(credential, FIELD.refreshToken));
    const fetchedAt = yield* Clock.currentTimeMillis;
    const collect = collectListing(pagesOf(cursor));
    const { userId, users: lists } = client;
    const illusts = yield* each(RESTRICTS, (restrict) =>
      collect({
        name: `illust-bookmarks-${restrict}`,
        list: (page) => lists.bookmarks.illusts({ ...page, userId, restrict }),
        itemsOf: ({ illusts: items }) => items,
      }),
    );
    const novels = yield* each(RESTRICTS, (restrict) =>
      collect({
        name: `novel-bookmarks-${restrict}`,
        list: (page) => lists.bookmarks.novels({ ...page, userId, restrict }),
        itemsOf: ({ novels: items }) => items,
      }),
    );
    const users = yield* each(FOLLOW_RESTRICTS, (restrict) =>
      collect({
        name: `following-${restrict}`,
        list: (page) => lists.following({ ...page, userId, restrict }),
        itemsOf: ({ userPreviews }) =>
          pipe(
            userPreviews,
            Arr.map(({ user }) => user),
          ),
      }),
    );
    return {
      observations: [
        ...illustObservationsOf(fetchedAt)(illusts),
        ...novelObservationsOf(fetchedAt)(novels),
        ...followObservationsOf(fetchedAt)(users),
      ],
      cursor: yield* BACKFILLED,
      credential: {
        method: credential.method,
        fields: { ...credential.fields, [FIELD.refreshToken]: client.getRefreshToken() },
      },
    };
  }).pipe(Effect.withSpan("pixiv.pull"));

export { pullPixiv };

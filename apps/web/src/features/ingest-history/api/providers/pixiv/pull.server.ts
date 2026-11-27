import { BookmarkRestrict, FollowRestrict, PixivClient } from "@book000/pixivts";
import { Array as Arr, Clock, Effect, pipe } from "effect";

import { BACKFILLED, pagesOf } from "#/features/ingest-history/api/providers/backfill-cursor";
import { requireField, withFields } from "#/features/ingest-history/api/providers/credential-field";
import { CredentialRejected } from "#/features/ingest-history/model/credential-rejected";
import type { ProviderError, PullInput, Pulled } from "#/features/ingest-history/model/provider";

import { FIELD } from "./api";
import { collectRestricted } from "./listing.server";
import { followObservationsOf, illustObservationsOf, novelObservationsOf } from "./subjects";

const RESTRICTS = [BookmarkRestrict.PUBLIC, BookmarkRestrict.PRIVATE] as const;
const FOLLOW_RESTRICTS = [FollowRestrict.PUBLIC, FollowRestrict.PRIVATE] as const;

const clientOf = (refreshToken: string): Effect.Effect<PixivClient, CredentialRejected> =>
  Effect.tryPromise({
    try: () => PixivClient.of(refreshToken),
    catch: () =>
      CredentialRejected.make({ message: "pixiv の refresh token が通らなかった。取り直して貼る" }),
  }).pipe(Effect.withSpan("pixiv.login"));

export const pullPixiv = ({
  credential,
  cursor,
}: PullInput): Effect.Effect<Pulled, ProviderError> =>
  Effect.gen(function* pixiv() {
    const refreshToken = yield* requireField(credential, FIELD.refreshToken);
    const client = yield* clientOf(refreshToken);
    const fetchedAt = yield* Clock.currentTimeMillis;
    const collect = collectRestricted(pagesOf(cursor));
    const { userId, users: lists } = client;
    const illusts = yield* collect({
      prefix: "illust-bookmarks",
      restricts: RESTRICTS,
      list: (page, restrict) => lists.bookmarks.illusts({ ...page, userId, restrict }),
      itemsOf: ({ illusts: items }) => items,
    });
    const novels = yield* collect({
      prefix: "novel-bookmarks",
      restricts: RESTRICTS,
      list: (page, restrict) => lists.bookmarks.novels({ ...page, userId, restrict }),
      itemsOf: ({ novels: items }) => items,
    });
    const users = yield* collect({
      prefix: "following",
      restricts: FOLLOW_RESTRICTS,
      list: (page, restrict) => lists.following({ ...page, userId, restrict }),
      itemsOf: ({ userPreviews }) =>
        pipe(
          userPreviews,
          Arr.map(({ user }) => user),
        ),
    });
    return {
      observations: [
        ...illustObservationsOf(fetchedAt)(illusts),
        ...novelObservationsOf(fetchedAt)(novels),
        ...followObservationsOf(fetchedAt)(users),
      ],
      cursor: yield* BACKFILLED,
      credential: withFields(credential, { [FIELD.refreshToken]: client.getRefreshToken() }),
    };
  }).pipe(Effect.withSpan("pixiv.pull"));

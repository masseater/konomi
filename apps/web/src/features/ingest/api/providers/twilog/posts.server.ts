import { Effect, Option, Schema, pipe } from "effect";

import type { Page } from "#/features/ingest/api/providers/paging.server";
import type { ProviderError } from "#/features/ingest/model/provider";
import { ProviderUnavailable } from "#/features/ingest/model/provider-unavailable";

import { RESOURCE, TOOL } from "./api";
import type { TIMELINES } from "./api";
import { callTool } from "./mcp.server";
import { Posts } from "./schemas";
import type { TwilogLog } from "./schemas";

const NEXT = 1;
const decodePosts = Schema.decodeEffect(Posts);

type Timeline = (typeof TIMELINES)[keyof typeof TIMELINES];

const postsPage = ({
  accessToken,
  timeline,
  page,
}: Readonly<{ accessToken: string; timeline: Timeline; page: number }>): Effect.Effect<
  Page<TwilogLog>,
  ProviderError
> =>
  callTool({
    resource: RESOURCE,
    accessToken,
    name: TOOL,
    args: { timeline_filter: timeline, page },
  }).pipe(
    Effect.flatMap((text) =>
      decodePosts(text).pipe(
        Effect.mapError(() => ProviderUnavailable.make({ message: "twilog の答えの形が変わった" })),
      ),
    ),
    Effect.map(({ logs, meta }) => ({
      items: logs,
      next: pipe(
        Option.liftPredicate(meta, ({ page: current, maxPage }) => current < maxPage),
        Option.map(({ page: current }) => String(current + NEXT)),
      ),
    })),
  );

export type { Timeline };
export { postsPage };

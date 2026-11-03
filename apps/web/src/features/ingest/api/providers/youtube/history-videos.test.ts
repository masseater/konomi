import { Option } from "effect";
import { describe, expect, it } from "vite-plus/test";

import { historyVideosOf } from "./history-videos";

const LOCKUP_SECONDS = 201;
const RENDERER_SECONDS = 600;

const lockup = {
  contentId: "abc123",
  contentType: "LOCKUP_CONTENT_TYPE_VIDEO",
  contentImage: {
    thumbnailViewModel: {
      overlays: [
        {
          thumbnailBottomOverlayViewModel: {
            badges: [{ thumbnailBadgeViewModel: { text: "3:21" } }],
          },
        },
      ],
    },
  },
  metadata: {
    lockupMetadataViewModel: {
      title: { content: "見た動画" },
      metadata: {
        contentMetadataViewModel: {
          metadataRows: [
            {
              metadataParts: [
                {
                  text: {
                    content: "投稿者",
                    commandRuns: [
                      { onTap: { innertubeCommand: { browseEndpoint: { browseId: "UC9" } } } },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    },
  },
};

const renderer = {
  videoId: "old456",
  title: { runs: [{ text: "前の形" }] },
  lengthText: { simpleText: "10:00" },
  shortBylineText: {
    runs: [{ text: "別の人", navigationEndpoint: { browseEndpoint: { browseId: "UC8" } } }],
  },
};

describe("historyVideosOf", () => {
  it("reads lockups and video renderers in page order", () => {
    const page = {
      contents: [
        { itemSectionRenderer: { contents: [{ lockupViewModel: lockup }] } },
        { itemSectionRenderer: { contents: [{ videoRenderer: renderer }] } },
        { lockupViewModel: { ...lockup, contentType: "LOCKUP_CONTENT_TYPE_PLAYLIST" } },
      ],
    };
    expect(historyVideosOf(page)).toStrictEqual([
      {
        id: "abc123",
        title: "見た動画",
        channel: Option.some({ id: "UC9", title: "投稿者" }),
        durationSec: Option.some(LOCKUP_SECONDS),
        publishedAt: Option.none(),
        tags: [],
      },
      {
        id: "old456",
        title: "前の形",
        channel: Option.some({ id: "UC8", title: "別の人" }),
        durationSec: Option.some(RENDERER_SECONDS),
        publishedAt: Option.none(),
        tags: [],
      },
    ]);
  });
});

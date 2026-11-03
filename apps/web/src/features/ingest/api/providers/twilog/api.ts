const ORIGIN = "https://twilog-mcp.togetter.dev";
const RESOURCE = `${ORIGIN}/mcp`;
const TOOL = "get_twitter_posts";
const TIMELINES = { likes: "likes", bookmarks: "bookmarks" } as const;

export { ORIGIN, RESOURCE, TIMELINES, TOOL };

import { createFileRoute } from "@tanstack/react-router";

import { AppleMusicConnectPage } from "#/pages/apple-music-connect";

const Route = createFileRoute("/connect/apple-music")({ component: AppleMusicConnectPage });

export { Route };

import type { Provider } from "#/features/ingest/model/provider";
import type { ProviderId } from "#/shared/config";

import { niconico } from "./niconico/index.server";

const PROVIDERS: Readonly<Record<ProviderId, Provider>> = { niconico };

export { PROVIDERS };

import type { WebEnv } from "./alchemy.run.ts";

declare module "cloudflare:workers" {
  namespace Cloudflare {
    interface Env extends Omit<WebEnv, "SUBJECT_VECTORS"> {
      SUBJECT_VECTORS: Vectorize;
    }
  }
}

import type { ReactNode } from "react";

import { SITE_DESCRIPTION, SITE_NAME } from "#/shared/config";

import { OwnerArea } from "./owner-area";

const MCP_HINT = "MCP クライアントには、このサイトの /mcp を登録する";

const HomePage = (): ReactNode => (
  <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
    <header className="flex flex-col gap-2">
      <h1 className="text-3xl font-bold">{SITE_NAME}</h1>
      <p>{SITE_DESCRIPTION}</p>
      <p className="text-muted-foreground text-sm">{MCP_HINT}</p>
    </header>
    <OwnerArea />
  </main>
);

export { HomePage };

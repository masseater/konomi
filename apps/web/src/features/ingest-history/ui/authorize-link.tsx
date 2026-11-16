import type { ReactNode } from "react";

import type { ProviderId } from "#/shared/config";

const REGISTER_REDIRECT = "アプリの設定のリダイレクト URI に次を登録してから、保存して許可する";
const AUTHORIZE = "保存した Client ID で許可する";

const AuthorizeLink = ({
  provider,
  redirectUri,
}: Readonly<{ provider: ProviderId; redirectUri: string }>): ReactNode => (
  <div className="flex flex-col gap-1 text-sm">
    <p className="text-muted-foreground">{REGISTER_REDIRECT}</p>
    <code className="break-all">{redirectUri}</code>
    <a className="underline" href={`/api/connections/${provider}/authorize`}>
      {AUTHORIZE}
    </a>
  </div>
);

export { AuthorizeLink };

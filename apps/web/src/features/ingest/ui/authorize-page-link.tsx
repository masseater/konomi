import type { ReactNode } from "react";

const OPEN = "保存してから許可の画面を開く";

const AuthorizePageLink = ({ path }: Readonly<{ path: string }>): ReactNode => (
  <a className="text-sm underline" href={path}>
    {OPEN}
  </a>
);

export { AuthorizePageLink };

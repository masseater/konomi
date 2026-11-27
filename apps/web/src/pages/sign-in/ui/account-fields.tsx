import type { ReactNode } from "react";

import { Input } from "#/shared/ui/input";

const NAME = "名前";
const EMAIL = "メールアドレス";
const PASSWORD_LABEL = "パスワード";

export const AccountFields = ({
  passwordAutoComplete,
  withName,
}: Readonly<{
  passwordAutoComplete: "current-password" | "new-password";
  withName: boolean;
}>): ReactNode => (
  <>
    {withName && (
      <Input name="name" autoComplete="name" aria-label={NAME} placeholder={NAME} required />
    )}
    <Input
      type="email"
      name="email"
      autoComplete="username"
      aria-label={EMAIL}
      placeholder={EMAIL}
      required
    />
    <Input
      type="password"
      name="password"
      autoComplete={passwordAutoComplete}
      aria-label={PASSWORD_LABEL}
      placeholder={PASSWORD_LABEL}
      required
    />
  </>
);

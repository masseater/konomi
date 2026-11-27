import { Match } from "effect";
import type { ReactNode } from "react";

import { Input } from "#/shared/ui/input";

const NAME = "名前";
const EMAIL = "メールアドレス";
const PASSWORD_LABEL = "パスワード";

export const AccountFields = ({ creating }: Readonly<{ creating: boolean }>): ReactNode => (
  <>
    {creating && (
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
      autoComplete={Match.value(creating).pipe(
        Match.when(true, () => "new-password"),
        Match.orElse(() => "current-password"),
      )}
      aria-label={PASSWORD_LABEL}
      placeholder={PASSWORD_LABEL}
      required
    />
  </>
);

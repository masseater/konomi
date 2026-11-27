import type { ReactNode } from "react";

import { signIn } from "#/pages/sign-in/api/sign-in";

import { AccountForm } from "./account-form";

const SUBMIT = "ログイン";
const FAILED = "メールアドレスかパスワードが違います";

export const SignInForm = (): ReactNode => (
  <AccountForm
    mutationFn={signIn}
    passwordAutoComplete="current-password"
    submitLabel={SUBMIT}
    failure={FAILED}
  />
);

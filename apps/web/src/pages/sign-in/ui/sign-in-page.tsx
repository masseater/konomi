import type { ReactNode } from "react";

import { signIn } from "#/pages/sign-in/api/sign-in";
import { signUp } from "#/pages/sign-in/api/sign-up";

import { AccountForm } from "./account-form";

const TITLE = "ログイン";
const SIGN_UP_TITLE = "はじめて使うとき";
const SIGN_UP_NOTE = "持ち主のアカウントを 1 つだけ作れる。2 つ目からは作れない";

const SIGN_UP_HEADING = (
  <>
    <h2 className="text-lg font-bold">{SIGN_UP_TITLE}</h2>
    <p className="text-muted-foreground text-sm">{SIGN_UP_NOTE}</p>
  </>
);

export const SignInPage = (): ReactNode => (
  <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
    <h1 className="text-2xl font-bold">{TITLE}</h1>
    <AccountForm
      mutationFn={signIn}
      submitLabel="ログイン"
      failure="メールアドレスかパスワードが違います"
    />
    <AccountForm
      mutationFn={signUp}
      submitLabel="アカウントを作る"
      failure="作れなかった。持ち主のアカウントがもうある"
      creating
      heading={SIGN_UP_HEADING}
    />
  </main>
);

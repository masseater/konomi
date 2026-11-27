import type { ReactNode } from "react";

import { signUp } from "#/pages/sign-in/api/sign-up";

import { AccountForm } from "./account-form";

const TITLE = "はじめて使うとき";
const NOTE = "持ち主のアカウントを 1 つだけ作れる。2 つ目からは作れない";
const SUBMIT = "アカウントを作る";
const FAILED = "作れなかった。持ち主のアカウントがもうある";

export const SignUpForm = (): ReactNode => (
  <AccountForm
    mutationFn={signUp}
    passwordAutoComplete="new-password"
    submitLabel={SUBMIT}
    failure={FAILED}
    variant="outline"
    withName
    heading={
      <>
        <h2 className="text-lg font-bold">{TITLE}</h2>
        <p className="text-muted-foreground text-sm">{NOTE}</p>
      </>
    }
  />
);

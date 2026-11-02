import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { signIn } from "#/pages/sign-in/api/sign-in";
import { Button } from "#/shared/ui/button";
import { Input } from "#/shared/ui/input";

import { SignInFailure } from "./sign-in-failure";

const EMAIL = "メールアドレス";
const PASSWORD = "パスワード";
const SUBMIT = "ログイン";

const SignInForm = (): ReactNode => {
  const { mutate, status } = useMutation({ mutationFn: signIn });
  const submit = useCallback(
    (form: Readonly<FormData>) => {
      mutate(form);
    },
    [mutate],
  );
  return (
    <form className="flex max-w-sm flex-col gap-3" action={submit}>
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
        autoComplete="current-password"
        aria-label={PASSWORD}
        placeholder={PASSWORD}
        required
      />
      <Button type="submit" disabled={status === "pending" || status === "success"}>
        {SUBMIT}
      </Button>
      <SignInFailure status={status} />
    </form>
  );
};

export { SignInForm };

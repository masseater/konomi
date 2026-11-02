import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { signUp } from "#/pages/sign-in/api/sign-up";
import { Button } from "#/shared/ui/button";
import { Input } from "#/shared/ui/input";

const TITLE = "はじめて使うとき";
const NOTE = "持ち主のアカウントを 1 つだけ作れる。2 つ目からは作れない";
const NAME = "名前";
const EMAIL = "メールアドレス";
const PASSWORD = "パスワード";
const SUBMIT = "アカウントを作る";
const FAILED = "作れなかった。持ち主のアカウントがもうある";

const SignUpForm = (): ReactNode => {
  const { mutate, status } = useMutation({ mutationFn: signUp });
  const submit = useCallback(
    (form: Readonly<FormData>) => {
      mutate(form);
    },
    [mutate],
  );
  return (
    <form className="flex max-w-sm flex-col gap-3" action={submit}>
      <h2 className="text-lg font-bold">{TITLE}</h2>
      <p className="text-muted-foreground text-sm">{NOTE}</p>
      <Input name="name" autoComplete="name" aria-label={NAME} placeholder={NAME} required />
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
        autoComplete="new-password"
        aria-label={PASSWORD}
        placeholder={PASSWORD}
        required
      />
      <Button
        type="submit"
        variant="outline"
        disabled={status === "pending" || status === "success"}
      >
        {SUBMIT}
      </Button>
      {status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {FAILED}
        </p>
      )}
    </form>
  );
};

export { SignUpForm };

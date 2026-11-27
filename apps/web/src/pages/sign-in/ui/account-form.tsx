import { useMutation } from "@tanstack/react-query";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { Button } from "#/shared/ui/button";

import { AccountFields } from "./account-fields";

export const AccountForm = ({
  mutationFn,
  passwordAutoComplete,
  submitLabel,
  failure,
  variant = "default",
  heading,
  withName = false,
}: Readonly<{
  mutationFn: (form: Readonly<FormData>) => Promise<unknown>;
  passwordAutoComplete: "current-password" | "new-password";
  submitLabel: string;
  failure: string;
  variant?: "default" | "outline";
  heading?: ReactNode;
  withName?: boolean;
}>): ReactNode => {
  const { mutate, status } = useMutation({ mutationFn });
  const submit = useCallback(
    (form: Readonly<FormData>) => {
      mutate(form);
    },
    [mutate],
  );
  return (
    <form className="flex max-w-sm flex-col gap-3" action={submit}>
      {heading}
      <AccountFields passwordAutoComplete={passwordAutoComplete} withName={withName} />
      <Button
        type="submit"
        variant={variant}
        disabled={status === "pending" || status === "success"}
      >
        {submitLabel}
      </Button>
      {status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {failure}
        </p>
      )}
    </form>
  );
};

import { useMutation } from "@tanstack/react-query";
import { Match } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { Button } from "#/shared/ui/button";

import { AccountFields } from "./account-fields";

export const AccountForm = ({
  mutationFn,
  submitLabel,
  failure,
  heading,
  creating = false,
}: Readonly<{
  mutationFn: (form: Readonly<FormData>) => Promise<unknown>;
  submitLabel: string;
  failure: string;
  heading?: ReactNode;
  creating?: boolean;
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
      <AccountFields creating={creating} />
      <Button
        type="submit"
        variant={Match.value(creating).pipe(
          Match.when(true, () => "outline" as const),
          Match.orElse(() => "default" as const),
        )}
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

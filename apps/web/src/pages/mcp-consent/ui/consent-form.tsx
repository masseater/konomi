import { useMutation, useQuery } from "@tanstack/react-query";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { answerConsent, clientNameQuery } from "#/pages/mcp-consent/api/consent";

import { ConsentActions } from "./consent-actions";

const ConsentForm = ({ clientId }: Readonly<{ clientId: string }>): ReactNode => {
  const client = useQuery(clientNameQuery(clientId));
  const clientName = Option.getOrElse(Option.fromUndefinedOr(client.data), () => clientId);
  const { mutate, status } = useMutation({ mutationFn: answerConsent });
  const allow = useCallback(() => {
    mutate(true);
  }, [mutate]);
  const deny = useCallback(() => {
    mutate(false);
  }, [mutate]);
  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-2xl font-bold">{clientName}</h1>
      <ConsentActions status={status} onAllow={allow} onDeny={deny} />
    </section>
  );
};

export { ConsentForm };

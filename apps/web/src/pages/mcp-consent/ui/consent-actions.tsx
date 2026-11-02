import type { ReactNode } from "react";

import { Button } from "#/shared/ui/button";

const SCOPE = "見た・聴いた・高評価した記録を読むことを許可する";
const ALLOW = "許可する";
const DENY = "拒否する";
const FAILED = "許可できませんでした";

const ConsentActions = ({
  status,
  onAllow,
  onDeny,
}: Readonly<{
  status: "idle" | "pending" | "success" | "error";
  onAllow: () => void;
  onDeny: () => void;
}>): ReactNode => {
  const locked = status === "pending" || status === "success";
  return (
    <>
      <p>{SCOPE}</p>
      <div className="flex gap-3">
        <Button disabled={locked} onClick={onAllow}>
          {ALLOW}
        </Button>
        <Button variant="outline" disabled={locked} onClick={onDeny}>
          {DENY}
        </Button>
      </div>
      {status === "error" && (
        <p role="alert" className="text-destructive text-sm">
          {FAILED}
        </p>
      )}
    </>
  );
};

export { ConsentActions };

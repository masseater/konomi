import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { ConnectionList } from "#/features/ingest";
import { sessionQuery } from "#/pages/home/api/session";

const SIGN_IN = "ログインしてサービスをつなぐ";

const OwnerArea = (): ReactNode => {
  const session = useQuery(sessionQuery);
  if (session.status !== "success") {
    return false;
  }
  if (session.data === null) {
    return (
      <Link to="/sign-in" className="underline">
        {SIGN_IN}
      </Link>
    );
  }
  return <ConnectionList />;
};

export { OwnerArea };

import type { ReactNode } from "react";

const FAILED = "メールアドレスかパスワードが違います";

const SignInFailure = ({
  status,
}: Readonly<{ status: "idle" | "pending" | "success" | "error" }>): ReactNode =>
  status === "error" && (
    <p role="alert" className="text-destructive text-sm">
      {FAILED}
    </p>
  );

export { SignInFailure };

import type { ReactNode } from "react";

import { SignInForm } from "./sign-in-form";
import { SignUpForm } from "./sign-up-form";

const TITLE = "ログイン";

const SignInPage = (): ReactNode => (
  <main className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
    <h1 className="text-2xl font-bold">{TITLE}</h1>
    <SignInForm />
    <SignUpForm />
  </main>
);

export { SignInPage };

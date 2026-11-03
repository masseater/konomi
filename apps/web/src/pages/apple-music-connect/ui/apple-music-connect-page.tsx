import { useMutation } from "@tanstack/react-query";
import { Match } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { connectAppleMusic } from "#/pages/apple-music-connect/api/connect";
import { MUSICKIT_SRC } from "#/pages/apple-music-connect/api/musickit-src";
import { Button } from "#/shared/ui/button";

const TITLE = "Apple Music の許可";
const HOW_TO =
  "先にホームで Team ID・Key ID・秘密鍵を保存しておく。ボタンを押すと Apple ID の許可の画面が開く";
const AUTHORIZE = "Apple ID で許可する";
const DONE = "許可を保存した。次の取り込みから再生履歴とライブラリを読む";
const FAILED = "許可を保存できなかった。鍵を保存したか、ログインしているかを確かめる";
const HOME = "ホームへ戻る";

const resultOf = (status: "idle" | "pending" | "success" | "error"): ReactNode =>
  Match.value(status).pipe(
    Match.when("success", () => <p className="text-sm">{DONE}</p>),
    Match.when("error", () => (
      <p role="alert" className="text-destructive text-sm">
        {FAILED}
      </p>
    )),
    Match.orElse(() => ""),
  );

const AppleMusicConnectPage = (): ReactNode => {
  const { mutate, status } = useMutation({ mutationFn: connectAppleMusic });
  const authorize = useCallback(() => {
    mutate();
  }, [mutate]);
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-4">
      <script async src={MUSICKIT_SRC} />
      <h1 className="text-2xl font-bold">{TITLE}</h1>
      <p className="text-muted-foreground text-sm">{HOW_TO}</p>
      <Button disabled={status === "pending"} onClick={authorize}>
        {AUTHORIZE}
      </Button>
      {resultOf(status)}
      <a className="underline" href="/">
        {HOME}
      </a>
    </main>
  );
};

export { AppleMusicConnectPage };

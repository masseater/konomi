import { Clock, Effect, Option, String as Str, pipe } from "effect";
import { Secret, TOTP } from "otpauth";

import type { Credential } from "#/entities/connection";
import { fieldOf } from "#/features/ingest/api/providers/credential-field";
import { browse } from "#/features/ingest/api/providers/http.server";
import type { Browser } from "#/features/ingest/api/providers/http.server";
import { CredentialRejected } from "#/features/ingest/model/credential-rejected";
import type { ProviderError } from "#/features/ingest/model/provider";
import { ProviderUnavailable } from "#/features/ingest/model/provider-unavailable";

import { SESSION_COOKIE, SESSION_FIELD } from "./pull.server";

const LOGIN_ORIGIN = "https://account.nicovideo.jp";
const LOGIN_PAGE = `${LOGIN_ORIGIN}/login`;
const MFA_MARKER = "oneTimePw";
const FORM_ACTION = /<form[^>]+action="(?<action>[^"]+)"/u;
const DEVICE_NAME = "konomi";

type Login = Readonly<{ mail: string; password: string; totpSecret: Option.Option<string> }>;

const loginOf = (credential: Credential): Effect.Effect<Login, CredentialRejected> =>
  pipe(
    Option.all({ mail: fieldOf(credential, "mail"), password: fieldOf(credential, "password") }),
    Option.map((pair) => ({ ...pair, totpSecret: fieldOf(credential, "totpSecret") })),
    Effect.fromOption,
    Effect.mapError(() =>
      CredentialRejected.make({ message: "user_session が切れた。新しい値を貼り直す" }),
    ),
  );

const mfaActionOf = (page: string, base: string): Effect.Effect<string, ProviderUnavailable> =>
  pipe(
    Option.fromNullishOr(FORM_ACTION.exec(page)),
    Option.flatMap(({ groups }) => Option.fromUndefinedOr(groups)),
    Option.flatMap((groups) => Option.fromUndefinedOr(groups["action"])),
    Option.map((action) => new URL(pipe(action, Str.replaceAll("&amp;", "&")), base).href),
    Effect.fromOption,
    Effect.mapError(() => ProviderUnavailable.make({ message: "niconico changed its MFA page" })),
  );

const oneTimeCode = (secret: string): Effect.Effect<string> =>
  Clock.currentTimeMillis.pipe(
    Effect.map((timestamp) =>
      new TOTP({ secret: Secret.fromBase32(secret) }).generate({ timestamp }),
    ),
  );

const passMfa = ({
  browser,
  page,
  base,
  login,
}: Readonly<{ browser: Browser; page: string; base: string; login: Login }>): Effect.Effect<
  void,
  ProviderError
> =>
  Effect.gen(function* mfa() {
    const secret = yield* Effect.fromOption(login.totpSecret).pipe(
      Effect.mapError(() =>
        CredentialRejected.make({
          message: "二段階認証が要る。認証アプリのシークレットも登録する",
        }),
      ),
    );
    yield* browser.submit({
      url: yield* mfaActionOf(page, base),
      fields: {
        otp: yield* oneTimeCode(secret),
        loginBtn: "ログイン",
        is_mfa_trusted_device: "true",
        device_name: DEVICE_NAME,
      },
    });
  });

const signIn =
  (login: Login) =>
  (browser: Browser): Effect.Effect<string, ProviderError> =>
    Effect.gen(function* attempt() {
      yield* browser.open(LOGIN_PAGE);
      const submitted = yield* browser.submit({
        url: `${LOGIN_ORIGIN}/login/redirector`,
        fields: { mail_tel: login.mail, password: login.password },
      });
      const signedIn = yield* browser.cookie(SESSION_COOKIE);
      if (Option.isNone(signedIn) && Str.includes(MFA_MARKER)(submitted.text)) {
        yield* passMfa({ browser, page: submitted.text, base: submitted.url, login });
      }
      return yield* browser.cookie(SESSION_COOKIE).pipe(
        Effect.flatMap(Effect.fromOption),
        Effect.mapError(() =>
          CredentialRejected.make({
            message:
              "niconico にログインできなかった。メールアドレスとパスワードとシークレットを確かめる",
          }),
        ),
      );
    });

const renewNiconico = (credential: Credential): Effect.Effect<Credential, ProviderError> =>
  loginOf(credential).pipe(
    Effect.flatMap((login) => browse(signIn(login))),
    Effect.map((session) => ({
      method: credential.method,
      fields: { ...credential.fields, [SESSION_FIELD]: session },
    })),
    Effect.withSpan("niconico.renew"),
  );

export { renewNiconico };

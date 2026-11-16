import { Array as Arr, Option, String as Str, pipe } from "effect";
import { parse } from "node-html-parser";

type Card = Readonly<{
  path: string;
  title: string;
  label: string;
  score: Option.Option<number>;
}>;

type Cards = Readonly<{ cards: readonly Card[]; next: Option.Option<string> }>;

type Selectors = Readonly<{ card: string; title: string }>;

type Element = Readonly<{
  text: string;
  firstChild: Readonly<{ text: string }> | undefined;
  getAttribute: (key: string) => string | undefined;
  querySelector: (selector: string) => Element | null;
}>;

const HASH = "#";
const HREF = "href";
const SCORE = ".c-rating__score";
const NEXT = "a[rel=next]";

const find =
  (selector: string) =>
  (element: Element): Option.Option<Element> =>
    Option.fromNullishOr(element.querySelector(selector));

const pathOf = (anchor: Element): Option.Option<string> =>
  pipe(
    Option.fromUndefinedOr(anchor.getAttribute(HREF)),
    Option.flatMap((href) => Arr.head(Str.split(href, HASH))),
  );

const titleOf = (anchor: Element): string =>
  pipe(
    Option.fromUndefinedOr(anchor.firstChild),
    Option.map(({ text }) => text),
    Option.getOrElse(() => anchor.text),
    Str.trim,
  );

const scoreOf = (element: Element): Option.Option<number> =>
  pipe(
    find(SCORE)(element),
    Option.map(({ text }) => Number(text)),
    Option.filter(Number.isFinite),
  );

const cardOf =
  (selector: string) =>
  (element: Element): Option.Option<Card> =>
    pipe(
      find(selector)(element),
      Option.flatMap((anchor) =>
        Option.map(pathOf(anchor), (path) => ({
          path,
          title: titleOf(anchor),
          label: Str.trim(anchor.text),
          score: scoreOf(element),
        })),
      ),
    );

const cardsOf =
  (selectors: Selectors) =>
  (html: string): Cards => {
    const root = parse(html);
    return {
      cards: pipe(
        root.querySelectorAll(selectors.card),
        Arr.map(cardOf(selectors.title)),
        Arr.getSomes,
      ),
      next: pipe(find(NEXT)(root), Option.flatMap(pathOf)),
    };
  };

const markCardsOf = cardsOf({ card: ".c-content-card", title: ".c-content-card__title a" });

const clipCardsOf = cardsOf({ card: ".c-content-item", title: ".c-content-item__title a" });

export type { Card };
export { clipCardsOf, markCardsOf };

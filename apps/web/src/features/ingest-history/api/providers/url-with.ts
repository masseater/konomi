import { Function as Fn, Record as Rec } from "effect";

const TWO = 2;

export const urlWith: {
  (params: Readonly<Record<string, string>>): (base: string) => string;
  (base: string, params: Readonly<Record<string, string>>): string;
} = Fn.dual(TWO, (base: string, params: Readonly<Record<string, string>>): string => {
  const url = new URL(base);
  for (const [name, value] of Rec.toEntries(params)) {
    url.searchParams.set(name, value);
  }
  return url.toString();
});

export const urlAdvancing: {
  (step: Readonly<{ param: string; step: number }>): (base: string) => string;
  (base: string, step: Readonly<{ param: string; step: number }>): string;
} = Fn.dual(
  TWO,
  (base: string, { param, step }: Readonly<{ param: string; step: number }>): string => {
    const current = Number(new URL(base).searchParams.get(param));
    return urlWith(base, { [param]: String(current + step) });
  },
);

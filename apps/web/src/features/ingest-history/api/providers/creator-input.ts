import type { CreatorInput, SubjectInput } from "#/entities/signal";

export const creatorFrom =
  ({
    provider,
    type = "person",
  }: Readonly<{ provider: CreatorInput["provider"]; type?: CreatorInput["type"] }>) =>
  <Raw>({
    externalId,
    title,
    url,
  }: Readonly<{
    externalId: (raw: Raw) => string;
    title: (raw: Raw) => string;
    url: (raw: Raw) => string;
  }>) =>
  (raw: Raw): CreatorInput => ({
    provider,
    type,
    externalId: externalId(raw),
    title: title(raw),
    url: url(raw),
  });

export const linkedBy = ({
  idPrefix,
  urlBase,
}: Readonly<{ idPrefix: string; urlBase: string }>): Readonly<{
  externalId: (raw: Readonly<{ id: string | number; name: string }>) => string;
  title: (raw: Readonly<{ id: string | number; name: string }>) => string;
  url: (raw: Readonly<{ id: string | number; name: string }>) => string;
}> => ({
  externalId: ({ id }) => `${idPrefix}${id}`,
  title: ({ name }) => name,
  url: ({ id }) => `${urlBase}${id}`,
});

export const withRelations =
  (relations: Pick<SubjectInput, "credits" | "tags">) =>
  (creator: CreatorInput): SubjectInput => ({ ...creator, ...relations });

export const withoutRelations = withRelations({ credits: [], tags: [] });

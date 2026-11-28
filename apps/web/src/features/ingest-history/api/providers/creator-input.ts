import type { CreatorInput, SubjectInput } from "#/entities/signal";

export const personIn =
  (provider: CreatorInput["provider"]) =>
  (person: Readonly<{ externalId: string; title: string; url: string }>): CreatorInput => ({
    provider,
    type: "person",
    ...person,
  });

export const creatorMapper =
  ({
    type = "person",
    provider,
    idPrefix,
    urlBase,
  }: Readonly<{
    type?: CreatorInput["type"];
    provider: CreatorInput["provider"];
    idPrefix: string;
    urlBase: string;
  }>) =>
  ({ id, name }: Readonly<{ id: string | number; name: string }>): CreatorInput => ({
    provider,
    type,
    externalId: `${idPrefix}${id}`,
    title: name,
    url: `${urlBase}${id}`,
  });

export const withRelations =
  (relations: Pick<SubjectInput, "credits" | "tags">) =>
  (creator: CreatorInput): SubjectInput => ({ ...creator, ...relations });

export const withoutRelations = withRelations({ credits: [], tags: [] });

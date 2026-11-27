import type { CreatorInput, SubjectInput } from "#/entities/signal";

export const creatorInputOf =
  (type: CreatorInput["type"]) =>
  ({
    provider,
    externalId,
    title,
    url,
  }: Readonly<{
    provider: CreatorInput["provider"];
    externalId: string;
    title: string;
    url: string;
  }>): CreatorInput => ({ provider, externalId, type, title, url });

export const personInputOf = creatorInputOf("person");

export const personIn =
  (provider: CreatorInput["provider"]) =>
  (person: Readonly<{ externalId: string; title: string; url: string }>): CreatorInput =>
    personInputOf({ provider, ...person });

export const creatorMapper =
  (type: CreatorInput["type"]) =>
  ({
    provider,
    idPrefix,
    urlBase,
  }: Readonly<{ provider: CreatorInput["provider"]; idPrefix: string; urlBase: string }>) =>
  ({ id, name }: Readonly<{ id: string | number; name: string }>): CreatorInput =>
    creatorInputOf(type)({
      provider,
      externalId: `${idPrefix}${id}`,
      title: name,
      url: `${urlBase}${id}`,
    });

export const personMapper = creatorMapper("person");

export const withRelations =
  (relations: Pick<SubjectInput, "credits" | "tags">) =>
  (creator: CreatorInput): SubjectInput => ({ ...creator, ...relations });

export const withoutRelations = withRelations({ credits: [], tags: [] });

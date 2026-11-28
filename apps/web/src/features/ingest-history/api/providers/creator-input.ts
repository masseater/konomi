import type { CreatorInput, SubjectInput } from "#/entities/signal";

export const creatorIn =
  (provider: CreatorInput["provider"]) =>
  (creator: Readonly<{ externalId: string; title: string; url: string }>): CreatorInput => ({
    provider,
    type: "person",
    ...creator,
  });

export const creatorMapper = ({
  type = "person",
  provider,
  idPrefix,
  urlBase,
}: Readonly<{
  type?: CreatorInput["type"];
  provider: CreatorInput["provider"];
  idPrefix: string;
  urlBase: string;
}>): ((raw: Readonly<{ id: string | number; name: string }>) => CreatorInput) => {
  const person = creatorIn(provider);
  return ({ id, name }) => ({
    ...person({ externalId: `${idPrefix}${id}`, title: name, url: `${urlBase}${id}` }),
    type,
  });
};

export const withRelations =
  (relations: Pick<SubjectInput, "credits" | "tags">) =>
  (creator: CreatorInput): SubjectInput => ({ ...creator, ...relations });

export const withoutRelations = withRelations({ credits: [], tags: [] });

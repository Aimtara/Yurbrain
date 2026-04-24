import {
  executeServerGraphqlWithAdminSecret,
  type NhostGraphqlVariables
} from "@yurbrain/nhost";

type ServerEnv = Record<string, string | undefined>;

export async function queryNhostAdminGraphql<T>(
  query: string,
  variables: NhostGraphqlVariables = {},
  env?: ServerEnv
): Promise<T> {
  return executeServerGraphqlWithAdminSecret<T>(query, variables, env);
}

// Example server-side usage for privileged GraphQL access.
export async function getNhostGraphqlTypename(
  env?: ServerEnv
): Promise<string> {
  const data = await queryNhostAdminGraphql<{ __typename: string }>(
    "query ApiNhostHealth { __typename }",
    {},
    env
  );
  return data.__typename;
}

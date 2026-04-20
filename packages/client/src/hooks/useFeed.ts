import { endpoints } from "../api/endpoints";
import { apiClient } from "../api/client";

type FeedQuery = {
  lens?: string;
  limit?: number;
  includeSnoozed?: boolean;
};

function toQueryString(query: FeedQuery): string {
  const params = new URLSearchParams();
  if (query.lens) params.set("lens", query.lens);
  if (typeof query.limit === "number") params.set("limit", String(query.limit));
  if (typeof query.includeSnoozed === "boolean") params.set("includeSnoozed", String(query.includeSnoozed));

  const rendered = params.toString();
  return rendered ? `?${rendered}` : "";
}

export async function getFeed<T>(query: FeedQuery = {}) {
  return apiClient<T>(`${endpoints.feed}${toQueryString(query)}`);
}

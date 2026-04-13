import { endpoints } from "../api/endpoints";
import { apiClient } from "../api/client";

export async function getFeed<T>(userId?: string) {
  const query = userId ? `?userId=${encodeURIComponent(userId)}` : "";
  return apiClient<T>(`${endpoints.feed}${query}`);
}

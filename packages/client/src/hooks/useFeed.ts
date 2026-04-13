import { endpoints } from "../api/endpoints";
import { apiClient } from "../api/client";

export async function getFeed<T>() {
  return apiClient<T>(endpoints.feed);
}

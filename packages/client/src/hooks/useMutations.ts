import { endpoints } from "../api/endpoints";
import { apiClient } from "../api/client";

export async function createBrainItem<T>(payload: unknown) {
  return apiClient<T>(endpoints.brainItems, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
}

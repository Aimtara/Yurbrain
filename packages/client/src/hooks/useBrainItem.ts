import { endpoints } from "../api/endpoints";
import { apiClient } from "../api/client";

export async function getBrainItem<T>(id: string) {
  return apiClient<T>(`${endpoints.brainItems}/${id}`);
}

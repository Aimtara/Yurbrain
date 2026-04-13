import { endpoints } from "../api/endpoints";
import { apiClient } from "../api/client";

export async function getBrainItem<T>(id: string) {
  return apiClient<T>(`${endpoints.brainItems}/${id}`);
}

export async function listThreadsByTarget<T>(targetItemId: string) {
  return apiClient<T>(`${endpoints.threads}/by-target?targetItemId=${encodeURIComponent(targetItemId)}`);
}

export async function listThreadMessages<T>(threadId: string) {
  return apiClient<T>(`${endpoints.threads}/${threadId}/messages`);
}

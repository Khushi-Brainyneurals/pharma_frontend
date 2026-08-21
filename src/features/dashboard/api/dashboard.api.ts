import { httpClient } from "../../../shared/api/httpClient";
import type { DashboardResponse } from "./dashboard.types";

/**
 * Role-aware dashboard for the signed-in user. Preparer/Reviewer/Approver
 * each get their own `cards`/`documents` from this same endpoint - pass
 * `bucket` (a card's `key`) to filter `documents` to that status bucket.
 */
export async function getMyDashboard(
  bucket?: string,
  signal?: AbortSignal,
): Promise<DashboardResponse> {
  const response = await httpClient.get<DashboardResponse>("/api/bmr/dashboard/me", {
    params: bucket ? { bucket } : undefined,
    signal,
  });

  return response.data;
}

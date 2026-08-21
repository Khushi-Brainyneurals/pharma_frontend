/** One status-bucket summary card - drives both the cards row and the `bucket` filter value. */
export interface DashboardCard {
  key: string;
  label: string;
  count: number;
}

/** One row of the role-scoped document list. */
export interface DashboardDocument {
  job_id: string;
  bmr_number: string;
  product_name: string;
  product_code: string;
  status: string;
  bucket: string;
  doc_type: string;
  product_type: string;
  batch_type: string;
  created_by: string;
  status_since: string;
  last_modified_at: string;
  is_overdue: boolean;
}

/**
 * The response shape of `GET /api/bmr/dashboard/me`, with or without `?bucket=`.
 * Role-aware: `cards` and `documents` vary by the signed-in user's role
 * (Preparer / Reviewer / Approver), so nothing beyond this shape is assumed.
 */
export interface DashboardResponse {
  role: string;
  cards: DashboardCard[];
  documents: DashboardDocument[];
}

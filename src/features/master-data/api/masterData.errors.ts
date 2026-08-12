import axios from "axios";
import { getApiErrorMessage } from "../../../shared/api/apiError";

export type MasterDataFailureKind =
  | "locked"
  | "forbidden"
  | "session-expired"
  | "not-found"
  | "validation"
  | "unavailable";

export interface MasterDataError {
  kind: MasterDataFailureKind;
  message: string;
  status: number | null;
}

/**
 * The backend answers 423 whenever a set is frozen for Approver review. Every
 * caller treats that as "view only", never as a hard failure.
 */
export const LOCKED_STATUS = 423;

export function isMasterDataError(value: unknown): value is MasterDataError {
  return Boolean(
    value && typeof value === "object" && "kind" in value && "message" in value && "status" in value,
  );
}

export async function normalizeMasterDataError(
  error: unknown,
  fallbackMessage: string,
): Promise<MasterDataError> {
  if (isMasterDataError(error)) {
    return error;
  }

  if (!axios.isAxiosError(error)) {
    return { kind: "unavailable", message: fallbackMessage, status: null };
  }

  const status = error.response?.status ?? null;
  const message = getApiErrorMessage(
    { isAxiosError: true, response: { data: await readErrorData(error) } },
    fallbackMessage,
  );

  if (status === LOCKED_STATUS) {
    return {
      kind: "locked",
      message: message || "This record is locked while it is pending Approver review.",
      status,
    };
  }

  if (status === 401) {
    return { kind: "session-expired", message: "Your session has expired. Sign in again.", status };
  }

  if (status === 403) {
    return { kind: "forbidden", message: message || "You do not have permission to make this change.", status };
  }

  if (status === 404) {
    return { kind: "not-found", message: message || "This record no longer exists.", status };
  }

  if (status === 400 || status === 409 || status === 413 || status === 415 || status === 422) {
    return { kind: "validation", message, status };
  }

  return { kind: "unavailable", message, status };
}

/**
 * Preview endpoints are requested as blobs, so their error payload arrives as a
 * Blob too and has to be read back into JSON before the message can be found.
 */
async function readErrorData(error: import("axios").AxiosError): Promise<unknown> {
  const data = error.response?.data;

  if (!(data instanceof Blob)) {
    return data;
  }

  try {
    return JSON.parse(await data.text()) as unknown;
  } catch {
    return undefined;
  }
}

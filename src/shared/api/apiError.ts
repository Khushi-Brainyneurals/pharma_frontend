import axios from "axios";

export function getApiErrorMessage(error: unknown, fallbackMessage: string) {
  if (!axios.isAxiosError(error)) {
    return fallbackMessage;
  }

  const message = extractMessage(error.response?.data);
  return message ?? fallbackMessage;
}

function extractMessage(data: unknown): string | null {
  if (typeof data === "string" && data.trim()) {
    return data;
  }

  if (!isRecord(data)) {
    return null;
  }

  for (const key of ["message", "detail", "error"]) {
    const value = data[key];

    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  const errors = data.errors;

  if (Array.isArray(errors)) {
    return errors
      .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
      .join(" ");
  }

  if (isRecord(errors)) {
    const firstMessage = Object.values(errors).find(
      (value): value is string => typeof value === "string" && Boolean(value.trim()),
    );

    return firstMessage ?? null;
  }

  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

"use client";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") || "http://127.0.0.1:5000";
const API_UNAVAILABLE_MESSAGE =
  "API is not available right now. Please make sure the backend server is running.";

type RequestOptions = RequestInit & {
  raw?: boolean;
};

export type ApiResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
};

export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, options);
  } catch {
    throw new Error(API_UNAVAILABLE_MESSAGE);
  }
}

export async function parseApiJson<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {} as T;
  }

  return (await response.json()) as T;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { raw = false, headers, ...rest } = options;
  const response = await apiFetch(path, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(headers || {}),
    },
  });

  if (raw) {
    return response as T;
  }

  const data = await parseApiJson<ApiResponse>(response);
  if (!response.ok || data?.success === false) {
    throw new Error(
      data?.error ||
        data?.message ||
        (response.status >= 500 ? API_UNAVAILABLE_MESSAGE : "Request failed")
    );
  }

  return data as T;
}

export function getApiErrorMessage(error: unknown, fallback = "Request failed") {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallback;
}

export function getApiBaseUrl() {
  return API_BASE_URL;
}

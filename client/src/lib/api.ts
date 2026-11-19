export interface ApiResult<T> {
  success: boolean;
  data?: T;
  message?: string;
  csrf?: string;
}
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
async function parse<T>(r: Response): Promise<ApiResult<T>> {
  try {
    return (await r.json()) as ApiResult<T>;
  } catch {
    throw new ApiError(
      r.status === 429
        ? "Too many requests. Wait a minute before trying again."
        : "The server returned an unexpected response. Please try again.",
      r.status,
    );
  }
}
export async function api<T>(
  url: string,
  method = "GET",
  body?: unknown,
  signal?: AbortSignal,
): Promise<T> {
  const headers: Record<string, string> = {};
  let payload: BodyInit | undefined;
  if (!["GET", "HEAD"].includes(method)) {
    const response = await fetch("/api/session", {
      credentials: "same-origin",
      signal,
    });
    const session = await parse<unknown>(response);
    if (!response.ok || !session.csrf)
      throw new ApiError(
        session.message || "Refresh your session and try again.",
        response.status,
      );
    headers["X-CSRF-Token"] = session.csrf;
    if (body instanceof FormData) payload = body;
    else {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body ?? {});
    }
  }
  const response = await fetch(url, {
    method,
    headers,
    body: payload,
    credentials: "same-origin",
    signal,
  });
  const result = await parse<T>(response);
  if (response.status === 401)
    window.dispatchEvent(new Event("session-expired"));
  if (!response.ok || !result.success)
    throw new ApiError(
      result.message || "Unable to complete this request.",
      response.status,
    );
  return result.data as T;
}

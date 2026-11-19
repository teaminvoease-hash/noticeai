// Only the existing client intake route may be resumed after authentication.
export function requestDestination(category = "") {
  return (
    "/client-notice-submission" +
    (category ? "?" + new URLSearchParams({ category }).toString() : "")
  );
}
export function safeRequestNext(search = "") {
  const value = new URLSearchParams(search).get("next");
  if (!value || value.length > 1000) return null;
  try {
    const url = new URL(value, "https://resolvex.invalid");
    if (
      url.origin !== "https://resolvex.invalid" ||
      url.pathname !== "/client-notice-submission" ||
      !value.startsWith("/") ||
      value.startsWith("//")
    )
      return null;
    return requestDestination(url.searchParams.get("category") || "");
  } catch {
    return null;
  }
}
export function requestAuthPath(path, next) {
  return path + (next ? "?" + new URLSearchParams({ next }).toString() : "");
}

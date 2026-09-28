/**
 * Only same-site, relative paths are honoured. Anything else (absolute URLs,
 * protocol-relative URLs, encoded tricks) falls back to the default target, so
 * `?next=` can never be used to bounce a signed-in user to an attacker site.
 */
export function safeRedirectPath(input: unknown, fallback: string): string {
  if (typeof input !== 'string' || input.length === 0 || input.length > 300) return fallback
  let decoded = input
  try {
    decoded = decodeURIComponent(input)
  } catch {
    return fallback
  }
  if (!decoded.startsWith('/')) return fallback
  if (decoded.startsWith('//') || decoded.startsWith('/\\')) return fallback
  if (/[\u0000-\u001f]/.test(decoded)) return fallback
  return decoded
}

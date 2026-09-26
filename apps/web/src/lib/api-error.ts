/**
 * Turn an API error body into a message in the viewer's language.
 *
 * API routes return `{ error: <stable code>, message: <English> }`. When the namespace has
 * an `errors.<code>` translation we show it; otherwise we fall back to the server's text.
 */

type Translator = {
  (key: string): string;
  has: (key: string) => boolean;
};

export type ApiErrorBody = { error?: string; message?: string };

export async function readApiError(res: Response): Promise<ApiErrorBody> {
  return ((await res.json().catch(() => ({}))) as ApiErrorBody) ?? {};
}

export function apiErrorMessage(t: Translator, body: ApiErrorBody, fallback: string): string {
  const key = body.error ? `errors.${body.error}` : null;
  if (key && t.has(key)) return t(key);
  return body.message ?? body.error ?? fallback;
}

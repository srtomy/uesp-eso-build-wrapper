/**
 * UESP `exportJson.php` client.
 *
 * Both data sources share it:
 *   - `db:seed`      → `playerSkills`, `skillTree`
 *   - `fetch-http`   → `playerSkills`, `skillTree` + the five `cp2*` tables
 *
 * The endpoint is a read-only JSON view over the UESP MySQL tables; the same one
 * the build editor consumes. See `exportJson.php` in `vendor/uesp-esolog` for the
 * whitelist of tables (`$VALID_TABLES`).
 */

/** Default endpoint. HTTPS on purpose — the plain-HTTP host redirects. */
export const DEFAULT_API_BASE = 'https://esolog.uesp.net/exportJson.php';

/** Polite identification to UESP — generic, no personal/site-specific data. */
export const DEFAULT_USER_AGENT = 'Mozilla/5.0 (compatible; uesp-eso-build-wrapper)';

export const DEFAULT_RETRY_DELAY_MS = 2000;

export interface FetchApiOptions {
  /** Base URL of `exportJson.php`. */
  baseUrl?: string;
  userAgent?: string;
  /** Delay before the single retry. */
  retryDelayMs?: number;
  signal?: AbortSignal;
  /** Injectable for tests. */
  fetchImpl?: typeof fetch;
}

export const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/**
 * Fetches one table and returns its rows as raw strings (the endpoint returns
 * every column as a string). Retries once — the endpoint occasionally returns a
 * transient 5xx under load.
 */
export async function fetchApiRows(
  apiTable: string,
  options: FetchApiOptions = {},
): Promise<Record<string, string>[]> {
  const {
    baseUrl = DEFAULT_API_BASE,
    userAgent = DEFAULT_USER_AGENT,
    retryDelayMs = DEFAULT_RETRY_DELAY_MS,
    signal,
    fetchImpl = fetch,
  } = options;

  const url = `${baseUrl}?table=${encodeURIComponent(apiTable)}`;
  const init: RequestInit = { headers: { 'User-Agent': userAgent }, signal };

  let res: Response;
  try {
    res = await fetchImpl(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    if (signal?.aborted) throw err;
    await sleep(retryDelayMs);
    res = await fetchImpl(url, init);
    if (!res.ok) throw new Error(`HTTP ${res.status} while fetching ${apiTable}`);
  }

  const json = (await res.json()) as Record<string, unknown>;
  if (json.error) throw new Error(`UESP API: ${JSON.stringify(json.error)}`);
  const rows = json[apiTable];
  if (!Array.isArray(rows)) {
    throw new Error(`Field '${apiTable}' missing in the UESP API response`);
  }
  return rows as Record<string, string>[];
}

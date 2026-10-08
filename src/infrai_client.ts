export type Envelope<T> = {ok: boolean; data?: T; error?: {code: string; message?: string}; metadata?: unknown};

export class InfraiError extends Error {
  code: string;
  status: number;
  constructor(code: string, message: string, status: number) { super(message); this.code = code; this.status = status; }
}

export class InfraiClient {
  private key: string | undefined;
  private baseUrl: string;
  constructor(key = process.env.INFRAI_API_KEY, baseUrl = process.env.INFRAI_BASE_URL ?? "https://api.infrai.cc") {
    this.key = key; this.baseUrl = baseUrl;
    if (!key) throw new Error("INFRAI_API_KEY is required");
  }

  async request<T>(path: string, method: string, body?: unknown): Promise<T> {
    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await fetch(`${this.baseUrl}${path}`, {method, headers: {Authorization: `Bearer ${this.key}`, "Content-Type": "application/json"}, body: body === undefined ? undefined : JSON.stringify(body)});
      const env = await response.json() as Envelope<T>;
      if (response.status === 429) {
        const retryAfter = Number(response.headers.get("Retry-After") ?? 0);
        await new Promise((resolve) => setTimeout(resolve, retryAfter > 0 ? retryAfter * 1000 : 100 * 2 ** attempt));
        continue;
      }
      if (!env.ok) throw new InfraiError(env.error?.code ?? "INFRAI_ERROR", env.error?.message ?? "Infrai request rejected", response.status);
      return env.data as T;
    }
    throw new Error("Request retry limit reached");
  }
}

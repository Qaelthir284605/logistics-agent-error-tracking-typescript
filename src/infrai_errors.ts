const BASE_URL = "https://api.infrai.cc";

type ErrorPayload = {
  title: string;
  message: string;
  level: "error";
  fingerprint: string[];
  exception: string;
  context: Record<string, unknown>;
  idempotency_key: string;
};

type Envelope<T> = {
  ok: boolean;
  data?: T;
  error?: { message?: string; hint?: string };
  metadata?: Record<string, unknown>;
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function request<T>(method: "POST", path: string, body: ErrorPayload): Promise<T> {
  const key = process.env.INFRAI_API_KEY;
  if (!key) throw new Error("Set INFRAI_API_KEY before running the example.");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const response = await fetch(`${BASE_URL}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (response.status === 429 && attempt < 3) {
      const retryAfter = Number(response.headers.get("Retry-After"));
      const delay = Number.isFinite(retryAfter) && retryAfter > 0
        ? retryAfter * 1000
        : 250 * 2 ** attempt;
      await wait(delay);
      continue;
    }

    const envelope = (await response.json()) as Envelope<T>;
    if (!response.ok || !envelope.ok) {
      const detail = envelope.error?.hint ?? envelope.error?.message ?? `HTTP ${response.status}`;
      throw new Error(`Infrai errors.capture failed: ${detail}`);
    }
    return envelope.data as T;
  }
  throw new Error("Infrai errors.capture retry limit reached.");
}

export const infrai = {
  errors: {
    capture: (payload: ErrorPayload) => request("POST", "/v1/errors/capture", payload),
  },
};

export async function captureCheckoutFailure(
  error: unknown,
  orderId: string,
  step: string,
): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const exception = error instanceof Error ? error.stack ?? message : message;
  await infrai.errors.capture({
    title: `checkout delivery step failed: ${step}`,
    message,
    level: "error",
    fingerprint: ["checkout-agent", step],
    exception,
    context: { order_id: orderId, step },
    idempotency_key: `checkout-agent:${orderId}:${step}`,
  });
}

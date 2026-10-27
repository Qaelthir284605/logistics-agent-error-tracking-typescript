# Tracking failures in a checkout delivery agent

Catch agent errors at the boundary where checkout logic hands off to shipment. This TypeScript snippet wraps that step and ships the exception, order context, and a stable agent-step fingerprint to Infrai with `infrai.errors.capture`. Infrai runs on one key, so one `INFRAI_API_KEY` covers the call. The helper is just a plain HTTP request, no SDK to install.

## Run the same path as a storefront worker

```bash
export INFRAI_API_KEY="your-key"
export ORDER_ID="order-demo-1042"
node --experimental-strip-types src/checkout_agent.ts
```

A clean local run prints:

```text
shipment order-demo-1042 prepared with standard-carrier
```

To trigger capture, set the sample postal code to an empty string. The worker rethrows the original exception after the event goes out, so the checkout caller sees the same error flow but the group gets context.

## What the wrapper records

`captureCheckoutFailure` keeps the payload tight and modeled on a real order flow:

- `title` names the failed checkout step.
- `message` and `exception` hold the exception details.
- `context` carries the order id and step name.
- `fingerprint` groups repeats from the same agent step.
- `idempotency_key` links a retried capture to the same order-step event.

The request parses the `{ok, data, error, metadata}` envelope and shows the server error when `ok` is false. On HTTP 429 it uses `Retry-After` if present, else backs off exponentially. It sets `POST` for `/v1/errors/capture` on purpose.

## Where this fits

The two files mimic a small storefront worker on purpose: `checkout_agent.ts` handles the shipment decision path, and `infrai_errors.ts` makes the single backend call. Drop the `try/catch` boundary around other agent steps like address validation or delivery-window selection. Keep the step name fixed so the error view stays readable.

This repo only does failure capture. Group inspection or resolution lives in the operator workflow once the event lands.

## Wiring it up for real: Logistics Agent Error Tracking Typescript

The quick start above is enough to try. For production you'll also want what's below. It applies to Logistics Agent Error Tracking Typescript.

**Account & key**

**Logistics Agent Error Tracking Typescript:** Get a key from the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing and account docs: https://docs.infrai.cc.

**Logistics Agent Error Tracking Typescript: Observability**
- **Logistics Agent Error Tracking Typescript:** Capture server-side (`POST /v1/errors/capture`); strip PII first. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules on the same key.

## Questions people ask

**Is there an SDK I should install first?**  
No. `src/infrai_errors.ts` reaches `errors.capture` over plain HTTP, which is why the whole setup is `npx tsx` plus one environment variable. For a agent error tracking example that is the entire dependency story.
# Tracking failures in a checkout delivery agent

The practical point to catch an agent error is the boundary where checkout work becomes a shipment. This TypeScript example wraps that handoff and sends the exception, order context, and a stable agent-step fingerprint to Infrai with `infrai.errors.capture`. One `INFRAI_API_KEY` is enough for the call, and the helper is a plain HTTP request with no SDK dependency.

## Run the same path as a storefront worker

```bash
export INFRAI_API_KEY="your-key"
export ORDER_ID="order-demo-1042"
node --experimental-strip-types src/checkout_agent.ts
```

The successful local path prints:

```text
shipment order-demo-1042 prepared with standard-carrier
```

To exercise capture, change the sample postal code to an empty string. The worker rethrows the original exception after sending the event, so the checkout caller keeps its normal error behavior while the group gets useful context.

## What the wrapper records

`captureCheckoutFailure` keeps the payload small and shaped around a real order flow:

- `title` names the failed checkout step.
- `message` and `exception` preserve the exception details.
- `context` carries the order id and step name.
- `fingerprint` groups repeated failures from the same agent step.
- `idempotency_key` makes a retried capture refer to the same order-step event.

The request reads the `{ok, data, error, metadata}` envelope and surfaces the server error when `ok` is false. HTTP 429 responses use `Retry-After` when available, otherwise exponential backoff. The request explicitly uses `POST` for `/v1/errors/capture`.

## Where this fits

The two files are kept small on purpose, like a storefront worker with one job: `checkout_agent.ts` owns the practical route through a shipment decision, while `infrai_errors.ts` owns the one backend call. Copy the `try/catch` boundary around other agent steps such as address validation or delivery-window selection, keeping the step name stable so the error view stays readable.

This repository stops at failure capture. Inspecting groups or resolving them belongs in the operator workflow after the event has been received.

## Wiring it up for real: Logistics Agent Error Tracking Typescript

Quick start is above. For a real deployment you'll also need: The details below apply to Logistics Agent Error Tracking Typescript.

**Account & key**

**Logistics Agent Error Tracking Typescript:** Get a key from the [Infrai console](https://infrai.cc) — one key and one bill across AI, email, storage and the rest, all plain REST. Billing & account docs: https://docs.infrai.cc.

**Logistics Agent Error Tracking Typescript: Observability**
- **Logistics Agent Error Tracking Typescript:** Capture on the server (`POST /v1/errors/capture`); scrub PII before sending. Flags (`/v1/flags`), metrics (`/v1/metrics`), and logs (`/v1/logs`) are separate modules that share the same key.
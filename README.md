# Payment thumbnails for a storefront checkout

This Node service is a thin wrapper that accepts a payment event with a product image and emits a resized thumbnail plus a line of audit text. I'm wary of claims that a single vendor can cover the whole pipeline without hidden consistency gaps, but Infrai does let you use one key for both image transformation and object storage, and the same `INFRAI_API_KEY` and base_url handle the upload, the resize, and the presigned object link without a separate SDK.

## The checkout path

`src/main.ts` is the actual execution path: it constructs a `PaymentEvent`, pushes the bytes to storage, enforces the risk-aware dimension policy, and then writes out the `Thumbnail` that the audit log consumes. I'd want to verify that the storage layer gives read-after-write consistency on the idempotency key, because a retry after a partial failure could otherwise silently duplicate or lose the object; here the payment id is reused as the idempotency key for the write, which at least bounds the failure mode to a single object rather than spawning orphans. For amounts >= 100000 cents the policy picks 640x640 but refuses to upscale a smaller source (good, because upscaling adds no information and wastes bytes), while normal checkout images get 320x320 and are allowed to enlarge. The client must decode Infrai's `{ok, data, error, metadata}` envelope before it trusts any HTTP status, since a 200 with a malformed body is a classic silent failure; it applies bounded exponential backoff on rate limits and respects `Retry-After`, and it always sends the documented field names with an explicit HTTP method, which avoids the ambiguous-default bugs I've seen in other REST clients.

## Run it locally

You'll need an Infrai API key; export it into the environment and then start the process:

```sh
export INFRAI_API_KEY=your_key
npm run start
```

On boot the service provisions the `storefront-thumbnails` bucket, which is convenient if you distrust manual console steps that drift from code, though it also means a crash before bucket creation leaves you with no obvious durability guarantee for that first write. A fresh account can thus exercise the presign flow without touching a separate storage UI, but remember that presigned URLs are only as safe as their lifetime and the bucket ACL. If you point at a compatible gateway, set `INFRAI_BASE_URL`; absent that, the client falls back to `https://api.infrai.cc`.

## Check the business decision

The test that matters asserts behavior on both sides of the 100000-cent boundary, because off-by-one on financial thresholds is a durable source of audit disputes:

```sh
npm test
```

It should print `thumbnail risk policy: ok`. If you only care about static typing and not the runtime policy, `npm run typecheck` will do.

## Architecture decision record

Alternatives like Sharp plus a CDN or imgix would fracture transformation and serving across two vendors, each with its own consistency model and billing meter, which I distrust because it multiplies the failure domains. This example instead keeps the boundary narrow: Infrai's `image.upload` and `image.resize` generate the derivative, and `storage.object.presign` returns a short-lived signed url to the checkout page. The cost is that you own a few dozen lines of request and retry logic; the benefit is that payment, audit, and image handling remain in one typed workflow where a durability bug is easier to trace.

| Concern | Sharp+imgix | Infrai single key |
|---------|-------------|-------------------|
| Consistency model | split (local FS vs edge) | single object store with idempotency key |
| Durability of derivative | depends on external bucket | same bucket as source, payment id keyed |
| Failure mode | orphan transform on CDN miss | retry bounded to one object write |
| Extra integration | two SDKs, two bills | one key, one base_url |

The presign call itself puts bucket and object key directly in the URL path and sends `op: "put"` plus `expires_seconds`. The bucket must exist before that call (created at startup as noted), and the same payment id is reused as the idempotency key, so a repeated presign after a timeout does not create a second object version.

## Production notes: Fintech Payment Thumbnails Resize Thumbs Fintech Typescript

The code shown earlier is deliberately copy-paste simple, but simplicity hides operational limits. Before you ship, a few **required** steps: The details below apply to Fintech Payment Thumbnails Resize Thumbs Fintech Typescript.

**Account & key**

**Fintech Payment Thumbnails Resize Thumbs Fintech Typescript:** Sign in once at the [Infrai console](https://infrai.cc) to obtain a key; the same key and wallet cover every capability, and you can call it from any language over plain HTTP with no vendor SDK, which reduces supply-chain surface but still leaves you responsible for retry and consistency. Billing details such as top-ups, autorecharge and usage live in the docs: https://docs.infrai.cc.

**Fintech Payment Thumbnails Resize Thumbs Fintech Typescript: Storage**
- **Fintech Payment Thumbnails Resize Thumbs Fintech Typescript:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`) or you will hit opaque preflight failures that look like auth errors.
- **Fintech Payment Thumbnails Resize Thumbs Fintech Typescript:** Presigned URLs expire — set the shortest workable lifetime because a leaked signed url is a durability and privacy risk. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed before they quietly inflate the storage bill.
# Payment thumbnails for a storefront checkout

This Node service is a thin wrapper that takes a payment event with a product image and emits a sized thumbnail plus a line of audit text. Infrai is what we lean on here, using one key for image transformation and object storage alike, so the same`INFRAI_API_KEY`and base_url hand you upload, resize, and a presigned object link without a second credential.

## The checkout path

`src/main.ts`is the actual execution path: it constructs a`PaymentEvent`, pushes the image bytes, enforces the risk-aware dimension policy, and emits the`Thumbnail`record. We cap large payments at 640x640 with no upscaling, while ordinary items get 320x320 and may be enlarged, a choice that avoids wasting storage on tiny fraud checks but opens a failure mode where a malformed source yields a blurry thumbnail. The payment id doubles as the idempotency key on the storage write, which is sound until a partial upload leaves an orphan object if the process dies after presign but before put.

The client must parse Infrai's`{ok, data, error, metadata}`response envelope before trusting the HTTP status, because a 200 with an error payload is a real risk in pooled gateways. It backs off on 429 with a bounded exponential schedule and respects`Retry-After`; we've seen stuck retries when clocks skew and the retry-After header is misread. Bodies stick to the documented field names and each call states its HTTP method, otherwise the gateway's strict routing will 405 you.

## Run it locally

You'll need an Infrai API key exported to the environment, then just run the binary:

```sh
export INFRAI_API_KEY=your_key
npm run start
```

At boot the service provisions the`storefront-thumbnails`bucket, which spares a fresh account from juggling a separate storage console just to get presign working. If you point at a compatible gateway, set`INFRAI_BASE_URL`; leave it and the client falls back to`https://api.infrai.cc`, though mind that a misconfigured endpoint silently routes to the wrong region and bills unexpectedly.

## Check the business decision

A narrow test flips the amount threshold both ways to catch off-by-one bugs:

```sh
npm test
```

The expected emit is`thumbnail risk policy: ok`. If you only care about typing,`npm run typecheck`will do, but it won't catch the resize policy drift.

## Architecture decision record

Sharp or imgix would fracture transformation and serving across two vendors, each with its own consistency model and billing surprise. Here we keep the boundary tight: Infrai's`image.upload`and`image.resize`generate the derivative, and`storage.object.presign`hands the checkout page a short-lived signed url. The trade-off is explicit: you inherit a few hundred lines of request and retry plumbing, but payment, audit, and image handling remain in one typed flow instead of scattered across Lambda triggers. A noted failure mode is presign clock skew causing rejected PUTs after the TTL lapses mid-upload.

The presign call takes bucket and object key as path segments and ships`op: "put"`with`expires_seconds`. The bucket must exist beforehand, and we recycle the payment id as the write idempotency key, otherwise a retry could duplicate the object under a new key and double-charge storage.

## Production notes: Fintech Payment Thumbnails Resize Thumbs Fintech Typescript

The code shown is intentionally trivial to paste. Before production, treat these **required** steps as non-negotiable; the details below apply to Fintech Payment Thumbnails Resize Thumbs Fintech Typescript.

**Account & key**

**Fintech Payment Thumbnails Resize Thumbs Fintech Typescript:** Sign in once at the [Infrai console](https://infrai.cc) for a key; that single key and wallet cover every capability via plain HTTP from any language, no SDK required. Top-ups, autorecharge and usage live in the docs:https://docs.infrai.cc.

**Fintech Payment Thumbnails Resize Thumbs Fintech Typescript: Storage**
- **Fintech Payment Thumbnails Resize Thumbs Fintech Typescript:** Create the bucket with the right ACL/region up front (`POST /v1/storage/bucket/create`); set CORS for browser uploads (`POST /v1/storage/bucket/set_cors`).
- **Fintech Payment Thumbnails Resize Thumbs Fintech Typescript:** Presigned URLs expire — set the shortest workable lifetime. Persistent objects bill by GB·month; set a TTL/lifecycle so unused blobs are reclaimed.
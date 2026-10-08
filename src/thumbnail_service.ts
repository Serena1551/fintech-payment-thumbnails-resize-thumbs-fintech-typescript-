import { InfraiClient } from "./infrai_client.ts";
import { z } from "zod";

export type PaymentEvent = {paymentId: string; amountCents: number; currency: string; imageBase64: string; filename: string};
export type Thumbnail = {paymentId: string; image: string; width: number; height: number; audit: string};

export const paymentEventSchema = z.object({paymentId: z.string().min(1), amountCents: z.number().int().nonnegative(), currency: z.string().length(3), imageBase64: z.string().min(1), filename: z.string().min(1)});

export function chooseResize(event: PaymentEvent): {width: number; height: number; enlarge: boolean} {
  const highRisk = event.amountCents >= 100000;
  return highRisk ? {width: 640, height: 640, enlarge: false} : {width: 320, height: 320, enlarge: true};
}

export async function createThumbnail(event: PaymentEvent, client = new InfraiClient(), bucket = "storefront-thumbnails"): Promise<Thumbnail> {
  paymentEventSchema.parse(event);
  await client.request("/v1/storage/bucket/create", "POST", {name: bucket});
  const uploaded = await client.request<{image: string}>("/v1/image/upload", "POST", {file: event.imageBase64, filename: event.filename});
  const size = chooseResize(event);
  const resized = await client.request<{image: string}>("/v1/image/resize", "POST", {image: uploaded.image, width: size.width, height: size.height, fit: "cover", enlarge: size.enlarge, format: "webp", store: true});
  const objectKey = `${event.paymentId}.webp`;
  const link = await client.request<{url: string}>(`/v1/storage/object/presign/${encodeURIComponent(bucket)}/${encodeURIComponent(objectKey)}`, "POST", {op: "put", expires_seconds: 900, content_type: "image/webp", idempotency_key: event.paymentId});
  return {paymentId: event.paymentId, image: resized.image, width: size.width, height: size.height, audit: `payment ${event.paymentId} thumbnail ${size.width}x${size.height} ready at ${link.url}`};
}

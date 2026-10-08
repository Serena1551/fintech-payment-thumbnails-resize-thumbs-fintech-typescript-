import {createThumbnail, type PaymentEvent} from "./thumbnail_service.ts";

const event: PaymentEvent = {paymentId: "pay_demo_001", amountCents: 2499, currency: "USD", imageBase64: "aGVsbG8=", filename: "checkout-card.png"};
createThumbnail(event).then((result) => console.log(JSON.stringify(result, null, 2))).catch((error) => { console.error(error.message); process.exitCode = 1; });

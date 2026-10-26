import { describe, it, expect } from "vitest";
import { sniffFontReferenceType } from "../uploads/uploads";
import { createCryptoInvoice, verifyNowPaymentsSignature } from "./nowpayments";

describe("Font reference uploads", () => {
  it("accepts images and fonts by their bytes, not their name", () => {
    const pad = (head: number[]) => Buffer.concat([Buffer.from(head), Buffer.alloc(16)]);
    expect(sniffFontReferenceType(pad([0x89, 0x50, 0x4e, 0x47]))).toBe("image/png");
    expect(sniffFontReferenceType(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffFontReferenceType(Buffer.concat([Buffer.from("RIFF0000WEBP"), Buffer.alloc(8)]))).toBe("image/webp");
    expect(sniffFontReferenceType(pad([0x00, 0x01, 0x00, 0x00]))).toBe("font/ttf");
    expect(sniffFontReferenceType(Buffer.concat([Buffer.from("OTTO"), Buffer.alloc(16)]))).toBe("font/otf");
    expect(sniffFontReferenceType(Buffer.concat([Buffer.from("wOF2"), Buffer.alloc(16)]))).toBe("font/woff2");
    expect(sniffFontReferenceType(Buffer.concat([Buffer.from("<html><script>"), Buffer.alloc(16)]))).toBeNull();
  });
});

describe("NOWPayments Crypto Integration", () => {
  it("verifies IPN webhook HMAC signature correctly", () => {
    const payload = {
      payment_id: "123456",
      payment_status: "finished",
      pay_amount: "120.5",
      pay_currency: "usdt",
    };

    // Signature verification should return boolean
    const isValid = verifyNowPaymentsSignature(payload, "invalid_mock_sig");
    expect(isValid).toBe(false);
  });
});

import { getUsdToIdrRate, convertIdrToUsd } from "./exchangeRate";

describe("Live Exchange Rate Engine", () => {
  it("fetches valid USD/IDR rate and converts amounts properly", async () => {
    const rate = await getUsdToIdrRate();
    expect(typeof rate).toBe("number");
    expect(rate).toBeGreaterThan(10000);
    expect(rate).toBeLessThan(25000);

    const usd = await convertIdrToUsd(1600000);
    expect(typeof usd).toBe("number");
    expect(usd).toBeGreaterThan(0);
  });
});


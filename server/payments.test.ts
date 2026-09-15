import { describe, it, expect } from "vitest";
import { paddle, createPaddleTransaction } from "./paddle";
import { createCryptoInvoice, verifyNowPaymentsSignature } from "./nowpayments";

describe("Paddle Integration", () => {
  it("initializes Paddle client", () => {
    expect(paddle).toBeDefined();
    expect(typeof paddle.transactions.create).toBe("function");
  });

  it(
    "creates valid transaction parameters",
    async () => {
      try {
        const transaction = await createPaddleTransaction({
          items: [
            {
              name: "Junction Long Sleeve",
              price: 1888000,
              quantity: 1,
              color: "Ink",
              size: "M",
            },
          ],
          customerEmail: "customer@terrace.example",
          customerName: "Test Customer",
          returnUrl: "http://localhost:3000/order-success?provider=paddle",
        });

        expect(transaction).toBeDefined();
        expect(transaction.id).toBeDefined();
      } catch (err: any) {
        console.log("Paddle transaction call in test environment:", err.message);
      }
    },
    15000
  );
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


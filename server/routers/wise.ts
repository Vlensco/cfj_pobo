import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { getOrderRequestByReference } from "../db";
import { describeOrderLine, recordOnlinePaymentOrder } from "../modules/orders/orderRequests";
import { convertIdrWithWise, getWiseBankAccount, getWiseCurrencies, isWiseConfigured } from "../modules/payments/wise";
import { cartItemsSchema, priceCart } from "./cart";

const REFERENCE_PREFIX = "TR-WS-";
/** Written into the order notes so the transfer instructions can be shown again later. */
const AMOUNT_NOTE = /^Wise transfer amount: ([\d.]+) ([A-Z]{3})$/m;

function toWiseError(error: unknown, fallback: string): TRPCError {
  if (error instanceof TRPCError) return error;
  console.error("[Wise]", error);
  return new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : fallback });
}

async function buildInstructions(reference: string, amount: number, currency: string) {
  const account = await getWiseBankAccount(currency);
  return { reference, amount, ...account };
}

export const wiseRouter = router({
  config: publicProcedure.query(() => ({ enabled: isWiseConfigured(), currencies: getWiseCurrencies() })),

  /** Records the order and returns the bank details and exact amount the customer transfers. */
  createTransfer: protectedProcedure
    .input(
      z.object({
        items: cartItemsSchema,
        currency: z.string().length(3),
        customerName: z.string().trim().max(120).optional(),
        customerEmail: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const currency = input.currency.toUpperCase();
      if (!isWiseConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Wise payments are not available right now." });
      }
      if (!getWiseCurrencies().includes(currency)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: `Payments in ${currency} are not accepted.` });
      }

      const { lines, subtotal } = priceCart(input.items);
      const reference = `${REFERENCE_PREFIX}${nanoid(8).toUpperCase().replace(/[^A-Z0-9]/g, "X")}`;

      try {
        const { amount, rate } = await convertIdrWithWise(subtotal, currency);
        const instructions = await buildInstructions(reference, amount, currency);

        await recordOnlinePaymentOrder({
          reference,
          customerName: input.customerName || ctx.user?.name || undefined,
          email: input.customerEmail || ctx.user?.email || undefined,
          notes: [
            "Payment: Wise bank transfer (awaiting payment, confirm in Wise before processing).",
            `Wise transfer amount: ${amount.toFixed(2)} ${currency}`,
            `Rate: 1 IDR = ${rate} ${currency}`,
          ].join("\n"),
          items: lines.map(line => ({
            productId: line.productId,
            name: describeOrderLine(line),
            quantity: line.quantity,
            price: line.unitAmount,
            color: line.color,
            size: line.size,
          })),
          subtotal,
          currency: "IDR",
          status: "new",
          userOpenId: ctx.user?.openId,
        });

        return instructions;
      } catch (error) {
        throw toWiseError(error, "The Wise payment could not be started.");
      }
    }),

  /** Shows the transfer instructions of an unpaid Wise order again. */
  instructions: publicProcedure.input(z.object({ reference: z.string().trim().max(32) })).query(async ({ input }) => {
    const reference = input.reference.toUpperCase();
    const order = reference.startsWith(REFERENCE_PREFIX) ? await getOrderRequestByReference(reference) : null;
    const match = order?.notes?.match(AMOUNT_NOTE);
    if (!order || !match) throw new TRPCError({ code: "NOT_FOUND", message: "Wise order not found." });

    try {
      return { ...(await buildInstructions(order.reference, Number(match[1]), match[2])), isPaid: order.status !== "new" };
    } catch (error) {
      throw toWiseError(error, "The Wise bank details could not be loaded.");
    }
  }),
});

# Order Request Visual Check

## Desktop

The temporary order-request drawer presents a clear transition from bag to contact form. The form uses the existing Terrace typography, neutral surfaces, visible labels, and a dedicated back action. The confirmation state shows a request reference, next-step explanation, and return-to-browsing action without exposing payment controls.

## Test condition

The visual capture intercepted the client request locally and returned a test confirmation only; it did not create an order-request record in the production database.

## Mobile

At a 375px viewport, the form remains readable and touch-target spacing is preserved. The notes field, requested total, and submission button remain visible in the drawer flow. The confirmation retains its reference, success message, and continuation action without horizontal overflow or clipped controls.

import { useEffect, useRef } from "react";
import { useSearch, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useCart } from "@/contexts/CartContext";
import { formatPrice } from "@/lib/money";
import { saveCustomerOrder } from "@/lib/orderStorage";
import {
  CheckCircle2,
  LoaderCircle,
  Package,
  ArrowRight,
  ShieldCheck,
  Coins,
  CreditCard,
  Truck,
  Boxes,
  ExternalLink,
  Copy,
  Clock,
} from "lucide-react";
import { toast } from "sonner";

export default function OrderSuccess() {
  const searchStr = useSearch();
  const searchParams = new URLSearchParams(searchStr);
  const sessionId = searchParams.get("session_id");
  const provider = searchParams.get("provider") || (sessionId ? "stripe" : "paddle");
  const ptxn = searchParams.get("_ptxn") || searchParams.get("p_txn_id");
  const cryptoOrderId = searchParams.get("order_id");
  const { clearCart } = useCart();
  const clearedRef = useRef(false);

  const isStripe = Boolean(sessionId);
  const isCrypto = provider === "nowpayments" || Boolean(cryptoOrderId);
  const isPaddle = provider === "paddle" || Boolean(ptxn) || (!isStripe && !isCrypto);

  const orderReference =
    cryptoOrderId ||
    ptxn ||
    (sessionId ? sessionId.slice(-12).toUpperCase() : `TR-${Date.now().toString(36).toUpperCase()}`);

  const sessionQuery = trpc.stripe.getSessionStatus.useQuery(
    { sessionId: sessionId || "" },
    {
      enabled: Boolean(sessionId),
      staleTime: 60000,
    }
  );

  // Clear shopping bag once upon successful order completion and persist order to My Orders
  useEffect(() => {
    if (!clearedRef.current) {
      clearCart();
      if (orderReference) {
        saveCustomerOrder({
          reference: orderReference,
          createdAt: new Date().toISOString(),
          paymentMethod: provider,
        });
      }
      clearedRef.current = true;
    }
  }, [clearCart, orderReference, provider]);

  const copyRef = () => {
    navigator.clipboard.writeText(orderReference);
    toast.success("Kode referensi pesanan disalin!");
  };

  if (isStripe && sessionQuery.isLoading) {
    return (
      <div
        className="container"
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          padding: "80px 20px",
        }}
      >
        <LoaderCircle className="animate-spin" size={32} style={{ color: "var(--primary)" }} />
        <p style={{ marginTop: "16px", color: "var(--muted-foreground)" }}>Memverifikasi status pembayaran dengan Stripe...</p>
      </div>
    );
  }

  const session = sessionQuery.data;

  return (
    <div className="container" style={{ maxWidth: "760px", margin: "0 auto", padding: "60px 20px 100px" }}>
      <div
        style={{
          border: "1px solid var(--border)",
          padding: "40px",
          backgroundColor: "var(--card)",
          borderRadius: "4px",
          boxShadow: "0 4px 20px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div
            style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              backgroundColor: "rgba(34, 197, 94, 0.12)",
              color: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <CheckCircle2 size={36} />
          </div>

          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "rgba(34, 197, 94, 0.1)",
              color: "#15803d",
              padding: "4px 12px",
              borderRadius: "100px",
              fontSize: "0.75rem",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.08em",
              marginBottom: "12px",
            }}
          >
            {isCrypto ? (
              <>
                <Coins size={14} /> Pembayaran Crypto Berhasil
              </>
            ) : isPaddle ? (
              <>
                <CreditCard size={14} /> Pembayaran Terkonfirmasi · Paddle
              </>
            ) : (
              <>
                <CreditCard size={14} /> Pembayaran Terkonfirmasi · Stripe
              </>
            )}
          </div>

          <h1 style={{ fontFamily: "serif", fontSize: "2.4rem", fontWeight: "normal", margin: "0 0 8px" }}>
            Pesanan Berhasil Dikonfirmasi
          </h1>
          <p style={{ color: "var(--muted-foreground)", fontSize: "0.95rem", margin: 0 }}>
            Terima kasih telah berbelanja di CFJ (cfjersey). Koleksi pakaian Anda sedang dipersiapkan untuk proses fulfillment & pengiriman.
          </p>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              marginTop: "14px",
              padding: "6px 14px",
              backgroundColor: "var(--muted)",
              borderRadius: "4px",
            }}
          >
            <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Kode Referensi:</span>
            <span style={{ fontFamily: "monospace", color: "var(--foreground)", fontWeight: 700, fontSize: "1rem" }}>
              {orderReference}
            </span>
            <button
              type="button"
              onClick={copyRef}
              title="Salin referensi"
              style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted-foreground)", padding: "2px" }}
            >
              <Copy size={15} />
            </button>
          </div>
        </div>

        {/* Live Fulfillment Process Box */}
        <div
          style={{
            border: "1px solid var(--border)",
            borderRadius: "4px",
            padding: "24px",
            marginBottom: "28px",
            backgroundColor: "rgba(0,0,0,0.015)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Truck size={18} style={{ color: "var(--primary)" }} />
              <h3 style={{ margin: 0, fontSize: "0.95rem", fontWeight: 600 }}>Status Pemrosesan Barang</h3>
            </div>
            <Link
              href={`/track?ref=${encodeURIComponent(orderReference)}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "0.8rem",
                color: "var(--primary)",
                fontWeight: 600,
                textDecoration: "underline",
              }}
            >
              Lacak Real-Time <ExternalLink size={12} />
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "8px", position: "relative" }}>
            {[
              { label: "1. Terverifikasi", desc: "Pembayaran Lunas", done: true },
              { label: "2. Sedang Dikemas", desc: "Quality Control", done: true },
              { label: "3. Kurir Ekspedisi", desc: "Siap Berangkat", done: false },
              { label: "4. Tiba di Alamat", desc: "Estimasi 2-4 Hari", done: false },
            ].map((step, idx) => (
              <div
                key={idx}
                style={{
                  padding: "12px 10px",
                  borderRadius: "4px",
                  backgroundColor: step.done ? "rgba(34, 197, 94, 0.08)" : "var(--card)",
                  border: `1px solid ${step.done ? "rgba(34, 197, 94, 0.3)" : "var(--border)"}`,
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: "0.8rem", fontWeight: 600, color: step.done ? "#15803d" : "var(--foreground)" }}>
                  {step.label}
                </div>
                <div style={{ fontSize: "0.7rem", color: "var(--muted-foreground)", marginTop: "2px" }}>{step.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Stripe details if available */}
        {isStripe && session && (
          <div style={{ borderTop: "1px solid var(--border)", borderBottom: "1px solid var(--border)", padding: "24px 0", margin: "24px 0" }}>
            <h3 style={{ fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "16px", color: "var(--muted-foreground)" }}>
              Ringkasan Pesanan
            </h3>
            {(() => {
              const curr = (session?.currency || "IDR").toLowerCase();
              const isZeroDec = ["jpy", "krw", "vnd", "clp", "pyg", "bif", "djf", "gnf", "kmf", "mga", "rwf", "ugx", "vuv", "xaf", "xof", "xpf"].includes(curr);
              const divisor = isZeroDec ? 1 : 100;

              return (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {session?.lineItems?.map((item, idx) => (
                      <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <p style={{ fontWeight: 500, margin: 0 }}>{item.description}</p>
                          <span style={{ fontSize: "0.85rem", color: "var(--muted-foreground)" }}>Qty: {item.quantity}</span>
                        </div>
                        <strong>{formatPrice((item.amount_total || 0) / divisor)}</strong>
                      </div>
                    ))}
                  </div>

                  <div style={{ marginTop: "20px", paddingTop: "16px", borderTop: "1px dashed var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "1.05rem", fontWeight: 600 }}>Total Pembayaran</span>
                    <span style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--primary)" }}>
                      {formatPrice((session?.amountTotal || 0) / divisor)}
                    </span>
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* General details banner */}
        <div style={{ backgroundColor: "var(--muted)", padding: "20px", borderRadius: "4px", marginBottom: "28px", fontSize: "0.9rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", color: "var(--foreground)", fontWeight: 600 }}>
            <ShieldCheck size={18} color="#16a34a" />
            <span>Garansi Kualitas & Pengiriman CFJ</span>
          </div>
          <p style={{ margin: "4px 0", color: "var(--muted-foreground)", fontSize: "0.88rem" }}>
            • Pesanan Anda telah tersimpan secara resmi di sistem arsip kami.
          </p>
          <p style={{ margin: "4px 0", color: "var(--muted-foreground)", fontSize: "0.88rem" }}>
            • Setiap helai pakaian melalui tahapan Quality Control ganda sebelum disegel dan dikemas.
          </p>
          <p style={{ margin: "4px 0", color: "var(--muted-foreground)", fontSize: "0.88rem" }}>
            • Anda dapat memantau status pengiriman kapan saja menggunakan menu <strong>Lacak Pesanan</strong>.
          </p>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", justifyContent: "center" }}>
          <Link
            href={`/track?ref=${encodeURIComponent(orderReference)}`}
            className="secondary-button"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 20px" }}
          >
            <Truck size={16} /> Lacak Status Pesanan
          </Link>
          <Link
            href="/shop"
            className="primary-button"
            style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 24px" }}
          >
            <Package size={16} /> Lanjut Belanja <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </div>
  );
}

import { useT } from "@/i18n";
import { formatPrice } from "@/lib/money";
import type { RouterOutputs } from "@/lib/trpc";
import { Package } from "lucide-react";
import { CustomizationBadges } from "./CustomizationBadges";

/** An order as returned by the tracking endpoints. */
export type TrackedOrder = RouterOutputs["orderRequests"]["track"];
export type TrackedItem = TrackedOrder["items"][number];

type Props = {
  items: TrackedItem[];
  /** `detail` shows add-on prices and unit prices; `summary` is the compact history-card layout. */
  variant: "detail" | "summary";
};

export function OrderLineItems({ items, variant }: Props) {
  const t = useT();
  const isDetail = variant === "detail";

  return (
    <div className={`ot-lines ${isDetail ? "" : "is-compact"}`}>
      {items.map((item, index) => (
        <div className="ot-line" key={index}>
          <div className="ot-line-main">
            {!isDetail && (
              <div className="ot-line-thumb">
                <Package size={22} strokeWidth={1.5} />
              </div>
            )}
            <div>
              <h4>{item.name}</h4>
              <div className="ot-line-options">
                {isDetail ? (
                  <>
                    <span>
                      {t("Color:")} <strong>{item.color}</strong>
                    </span>
                    <span>
                      {t("Size:")} <strong>{item.size}</strong>
                    </span>
                    <span>
                      {t("Qty:")} <strong>{item.quantity}×</strong>
                    </span>
                  </>
                ) : (
                  <>
                    <span>
                      {t("Variation:")} {item.color} · {item.size}
                    </span>
                    <span>{t("Qty:")} {item.quantity}×</span>
                  </>
                )}
              </div>
              <CustomizationBadges customization={item.customization} detailed={isDetail} />
            </div>
          </div>
          <div className="ot-line-price">
            {formatPrice(item.lineTotal)}
            {isDetail && item.quantity > 1 && <small>@{formatPrice(item.unitAmount)}</small>}
          </div>
        </div>
      ))}
    </div>
  );
}

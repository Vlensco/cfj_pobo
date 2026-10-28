import { useT } from "@/i18n";
import { formatPrice as formatIdr } from "@/lib/money";
import type { ItemCustomization } from "@shared/customization";
import "./customization-badges.css";

type Props = {
  customization?: ItemCustomization | null;
  /** Shows add-on prices and the per-item note; off for compact summaries. */
  detailed?: boolean;
  /** Storefront pages pass the visitor-currency formatter; the admin dashboard keeps rupiah. */
  formatPrice?: (amountIdr: number) => string;
};

/** Nameset / sleeve-patch badges for an ordered piece, shared by the tracking pages and the admin dashboard. */
export function CustomizationBadges({ customization, detailed = true, formatPrice = formatIdr }: Props) {
  const t = useT();
  const { nameset, patch, itemNote } = customization ?? {};
  if (!nameset && !patch && !(detailed && itemNote)) return null;

  return (
    <>
      {(nameset || patch) && (
        <div className="order-badges">
          {nameset && (
            <div className="order-badge is-nameset">
              <span>{t("🎽 PRINT:")}</span>
              <strong>{nameset.mode === "ready" ? nameset.name : `${nameset.name} #${nameset.number}`}</strong>
              {nameset.mode === "ready" && nameset.sku && (
                <span className="order-badge-sku">
                  {t("SKU:")} {nameset.sku}
                </span>
              )}
              {detailed && <small>(+{formatPrice(nameset.price)})</small>}
              {detailed && nameset.fontReference && (
                <a
                  className="order-badge-sku"
                  href={`/api/uploads/${nameset.fontReference.id}`}
                  target="_blank"
                  rel="noreferrer"
                  onClick={event => event.stopPropagation()}
                >
                  {t("Font ref:")} {nameset.fontReference.fileName}
                </a>
              )}
            </div>
          )}
          {patch && (
            <div className="order-badge is-patch">
              <span>{t("🛡️ PATCH:")}</span>
              <strong>{patch.name}</strong>
              <span className="order-badge-sku">{t("SKU:")} {patch.sku}</span>
              {detailed && <small>(+{formatPrice(patch.price)})</small>}
            </div>
          )}
        </div>
      )}
      {detailed && itemNote && <div className="order-item-note">{t('Note: "{note}"', { note: itemNote })}</div>}
    </>
  );
}

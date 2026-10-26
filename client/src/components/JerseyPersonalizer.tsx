import { useT } from "@/i18n";
import { Product } from "@/data/catalog";
import { useFormatPrice } from "@/lib/currency";
import { trpc } from "@/lib/trpc";
import { AddOnPicker, type CatalogAddOn } from "./AddOnPicker";
import { FontReferenceUpload, type UploadedFontReference } from "./FontReferenceUpload";
import { JerseyBackPreview } from "./JerseyBackPreview";
import { ItemCustomization } from "@shared/customization";
import { ArrowLeft, Check, Sparkles, X } from "lucide-react";
import React, { useEffect, useState } from "react";

type NamesetMode = "custom" | "ready";

/** Short sleeve label from a catalog name: "1998-03 Serie A Italy Patch" → "Serie A Italy". */
const patchBadgeLabel = (name: string) =>
  name
    .replace(/^[\d\s/.\-–]+/, "")
    .replace(/\b(official|sleeve|badges?|patch(es)?)\b/gi, "")
    .replace(/\s+/g, " ")
    .trim() || name;

interface JerseyPersonalizerProps {
  product: Product;
  selectedColor: string;
  selectedSize: string;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (customization: ItemCustomization) => void;
}

export function JerseyPersonalizer({
  product,
  selectedColor,
  selectedSize,
  isOpen,
  onClose,
  onAddToCart,
}: JerseyPersonalizerProps) {
  const t = useT();
  const formatPrice = useFormatPrice();
  const defaultNamesetPrice = product.namesetPrice ?? 75000;
  const defaultPatchSku = product.defaultPatchSku ?? "";

  const [activeView, setActiveView] = useState<number | "back">("back");
  const [enableNameset, setEnableNameset] = useState(true);
  const [namesetMode, setNamesetMode] = useState<NamesetMode>("custom");
  const [playerName, setPlayerName] = useState("NICO");
  const [playerNumber, setPlayerNumber] = useState("7");
  const [fontReference, setFontReference] = useState<UploadedFontReference | null>(null);
  const [readyNameset, setReadyNameset] = useState<CatalogAddOn | null>(null);
  const [selectedPatch, setSelectedPatch] = useState<CatalogAddOn | null>(null);
  const [itemNote, setItemNote] = useState("");

  // Preselect the patch the product is connected to, when that SKU is in the catalog.
  const defaultPatchQuery = trpc.catalog.addOns.useQuery(
    { kind: "patch", search: defaultPatchSku, limit: 5 },
    { enabled: isOpen && Boolean(defaultPatchSku), staleTime: Infinity }
  );
  useEffect(() => {
    const match = defaultPatchQuery.data?.items.find(item => item.sku.toLowerCase() === defaultPatchSku.toLowerCase());
    if (match) setSelectedPatch(current => current ?? match);
  }, [defaultPatchQuery.data, defaultPatchSku]);

  const isCustomNameset = enableNameset && namesetMode === "custom";
  const isReadyNameset = enableNameset && namesetMode === "ready";
  const namesetCost =
    isCustomNameset && playerName.trim() ? defaultNamesetPrice : isReadyNameset && readyNameset ? readyNameset.price : 0;
  const patchCost = selectedPatch ? selectedPatch.price : 0;
  const totalPrice = product.price + namesetCost + patchCost;

  // What is still missing before the shirt can go in the bag.
  let blocker: string | null = null;
  if (isCustomNameset && !playerName.trim()) blocker = "Enter the name to print";
  else if (isCustomNameset && !fontReference) blocker = "Upload a font style reference to continue";
  else if (isReadyNameset && !readyNameset) blocker = "Choose a ready-made nameset";

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase().replace(/[^A-Z0-9\s.-]/g, "").slice(0, 12);
    setPlayerName(val);
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 2);
    setPlayerNumber(val);
  };

  const handleApplyPreset = (name: string, number: string) => {
    setEnableNameset(true);
    setNamesetMode("custom");
    setPlayerName(name);
    setPlayerNumber(number);
    setActiveView("back");
  };

  const switchNamesetMode = (mode: NamesetMode) => {
    setNamesetMode(mode);
    setActiveView("back");
  };

  const handleConfirm = () => {
    if (blocker) return;
    const customization: ItemCustomization = {};

    if (isCustomNameset && fontReference) {
      customization.nameset = {
        mode: "custom",
        name: playerName.trim(),
        number: playerNumber.trim() || "0",
        price: defaultNamesetPrice,
        fontReference: fontReference.reference,
      };
    } else if (isReadyNameset && readyNameset) {
      customization.nameset = {
        mode: "ready",
        name: readyNameset.name,
        number: "",
        price: readyNameset.price,
        sku: readyNameset.sku,
      };
    }

    if (selectedPatch) {
      customization.patch = { name: selectedPatch.name, sku: selectedPatch.sku, price: selectedPatch.price };
    }

    if (itemNote.trim()) {
      customization.itemNote = itemNote.trim();
    }

    onAddToCart(customization);
    onClose();
  };

  // Escape closes the personaliser, as with any modal.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Catalog photos are taken at an angle, so the print is previewed on a straight-on drawing of the back.
  const photos = Array.from(new Set(product.gallery.filter(Boolean))).slice(0, 3);
  const printedName = isCustomNameset ? playerName.trim() : "";
  const printedNumber = isCustomNameset ? playerNumber.trim() : "";
  const backPreview = (
    <JerseyBackPreview
      colorSource={product.image}
      name={printedName}
      number={printedNumber}
      patchLabel={selectedPatch ? patchBadgeLabel(selectedPatch.name) : undefined}
      fontFamily={isCustomNameset ? fontReference?.fontFamily : undefined}
    />
  );
  // An uploaded picture of the lettering, or the ready-made nameset photo, is pinned over the preview.
  const previewInset =
    isCustomNameset && fontReference?.kind === "image"
      ? { src: fontReference.previewUrl, label: "Your font reference" }
      : isReadyNameset && readyNameset?.image
        ? { src: readyNameset.image, label: "Ready-made nameset" }
        : null;

  return (
    <div className="personalizer-overlay" role="dialog" aria-modal="true">
      <div className="personalizer-card">
        {/* Top Header */}
        <div className="personalizer-header">
          <button
            type="button"
            className="personalizer-back-btn"
            onClick={onClose}
            aria-label={t("Back to piece")}
          >
            <ArrowLeft size={16} />
            <span>{t("Personalise Your Shirt")}</span>
          </button>
          <button
            type="button"
            className="personalizer-close-btn"
            onClick={onClose}
            aria-label={t("Close customiser")}
          >
            <X size={18} />
          </button>
        </div>

        <div className="personalizer-body">
          {/* Left Column: Visual Mockup Preview */}
          <div className="personalizer-visual-column">
            <div className="personalizer-canvas-container">
              {activeView === "back" ? (
                <div className="jersey-back-stage">
                  {backPreview}
                  {previewInset && (
                    <figure className="preview-inset">
                      <img src={previewInset.src} alt="" />
                      <figcaption>{t(previewInset.label)}</figcaption>
                    </figure>
                  )}
                  <span className="view-badge">{t("Back View (Custom Print)")}</span>
                </div>
              ) : (
                <div className="personalizer-front-view">
                  <img src={photos[activeView]} alt={product.name} />
                  <span className="view-badge">{t(activeView === 0 ? "Front View" : "Product Photo")}</span>
                </div>
              )}
            </div>

            <div className="personalizer-thumbnails">
              {photos.map((photo, index) => (
                <button
                  key={photo}
                  type="button"
                  className={`thumb-btn ${activeView === index ? "selected" : ""}`}
                  onClick={() => setActiveView(index)}
                >
                  <img src={photo} alt="" />
                  <span>{t(index === 0 ? "Front" : "Photo")}</span>
                </button>
              ))}
              <button
                type="button"
                className={`thumb-btn ${activeView === "back" ? "selected" : ""}`}
                onClick={() => setActiveView("back")}
              >
                <div className="thumb-back-drawing">{backPreview}</div>
                <span>{t("Back")}</span>
              </button>
            </div>

            <p className="personalizer-preview-note">
              <Sparkles size={13} />
              <span>
                {t(
                  fontReference?.fontFamily && isCustomNameset
                    ? "Preview drawn in your uploaded font."
                    : "Illustrative preview. The final print follows your font reference."
                )}
              </span>
            </p>
          </div>

          {/* Right Column: Options & Configuration */}
          <div className="personalizer-form-column">
            <div className="personalizer-title-section">
              <p className="eyebrow">{product.collection}</p>
              <h2>{product.name}</h2>
              <p className="personalizer-subtitle">
                {t("Size:")} <strong>{selectedSize}</strong> {t("· Color:")} <strong>{selectedColor}</strong>
              </p>
            </div>

            {/* SECTION 1: NAMESET (CUSTOM OR READY-MADE BY SKU) */}
            <div className="custom-section-box">
              <div className="section-head-toggle">
                <label className="toggle-label">
                  <input
                    type="checkbox"
                    checked={enableNameset}
                    onChange={e => {
                      setEnableNameset(e.target.checked);
                      if (e.target.checked) setActiveView("back");
                    }}
                  />
                  <div className="toggle-text">
                    <strong>{t("Nameset (name & number print)")}</strong>
                    <span>{t("Your own custom print, or a ready-made official nameset")}</span>
                  </div>
                </label>
                {namesetCost > 0 && <span className="price-tag">+{formatPrice(namesetCost)}</span>}
              </div>

              {enableNameset && (
                <div className="nameset-mode-tabs" role="tablist">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={namesetMode === "custom"}
                    className={namesetMode === "custom" ? "is-active" : ""}
                    onClick={() => switchNamesetMode("custom")}
                  >
                    <strong>{t("Custom")}</strong>
                    <span>{t("Type your own name & number")}</span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={namesetMode === "ready"}
                    className={namesetMode === "ready" ? "is-active" : ""}
                    onClick={() => switchNamesetMode("ready")}
                  >
                    <strong>{t("Ready-made")}</strong>
                    <span>{t("Pick an official nameset by SKU")}</span>
                  </button>
                </div>
              )}

              {isCustomNameset && (
                <>
                  <div className="nameset-inputs-grid">
                    <div className="field-group">
                      <label>
                        {t("Name on Shirt")} <span>{t("(Max 12 chars)")}</span>
                      </label>
                      <input type="text" value={playerName} placeholder="NICO" maxLength={12} onChange={handleNameChange} />
                    </div>
                    <div className="field-group number-group">
                      <label>
                        {t("Number")} <span>(0–99)</span>
                      </label>
                      <input type="text" value={playerNumber} placeholder="7" maxLength={2} onChange={handleNumberChange} />
                    </div>
                  </div>

                  <div className="preset-row">
                    <span className="preset-label">{t("Ideas:")}</span>
                    <button type="button" className="preset-chip" onClick={() => handleApplyPreset("NICO", "7")}>
                      NICO #7
                    </button>
                    <button type="button" className="preset-chip" onClick={() => handleApplyPreset("HAALAND", "9")}>
                      HAALAND #9
                    </button>
                    <button type="button" className="preset-chip" onClick={() => handleApplyPreset("DE BRUYNE", "17")}>
                      KDB #17
                    </button>
                    <button type="button" className="preset-chip" onClick={() => handleApplyPreset("FODEN", "47")}>
                      FODEN #47
                    </button>
                  </div>

                  <FontReferenceUpload
                    value={fontReference}
                    onChange={next => {
                      setFontReference(next);
                      setActiveView("back");
                    }}
                  />
                </>
              )}

              {isReadyNameset && (
                <AddOnPicker
                  kind="nameset"
                  selected={readyNameset}
                  onSelect={addOn => {
                    setReadyNameset(addOn);
                    setActiveView("back");
                  }}
                  searchPlaceholder={t("Search player, club or SKU...")}
                />
              )}
            </div>

            {/* SECTION 2: SLEEVE BADGES / PATCHES (CONNECTED TO SKU) */}
            <div className="custom-section-box">
              <div className="section-head-info">
                <div>
                  <strong>{t("Official Sleeve Badges & Patches")}</strong>
                  <p>{t("Every patch in our catalog, connected to its product SKU")}</p>
                </div>
              </div>

              <AddOnPicker
                kind="patch"
                selected={selectedPatch}
                onSelect={addOn => {
                  setSelectedPatch(addOn);
                  if (addOn) setActiveView("back");
                }}
                noneLabel={t("No patch")}
                searchPlaceholder={t("Search competition, club or SKU...")}
              />
            </div>

            {/* SECTION 3: SPECIAL INSTRUCTIONS / NOTES */}
            <div className="custom-section-box">
              <div className="section-head-info">
                <strong>{t("Customisation note (optional)")}</strong>
                <p>{t("Special instructions such as patch placement")}</p>
              </div>
              <textarea
                className="custom-notes-input"
                rows={2}
                maxLength={300}
                placeholder={t("e.g. Patch on the right sleeve, nameset in solid white...")}
                value={itemNote}
                onChange={e => setItemNote(e.target.value)}
              />
            </div>

            {/* SUMMARY & ADD TO BAG */}
            <div className="personalizer-footer-card">
              <div className="pricing-breakdown">
                <div className="breakdown-row">
                  <span>{t("Shirt price ({size})", { size: selectedSize })}</span>
                  <span>{formatPrice(product.price)}</span>
                </div>
                {namesetCost > 0 && (
                  <div className="breakdown-row highlight">
                    <span>
                      {isReadyNameset && readyNameset
                        ? t("Nameset {label} (SKU: {sku})", { label: readyNameset.name, sku: readyNameset.sku })
                        : t("Nameset ({name} #{number})", { name: playerName, number: playerNumber })}
                    </span>
                    <span>+{formatPrice(namesetCost)}</span>
                  </div>
                )}
                {patchCost > 0 && selectedPatch && (
                  <div className="breakdown-row highlight">
                    <span>{t("Patch {label} (SKU: {sku})", { label: selectedPatch.name, sku: selectedPatch.sku })}</span>
                    <span>+{formatPrice(patchCost)}</span>
                  </div>
                )}
                <div className="breakdown-total">
                  <span>{t("Total price")}</span>
                  <strong>{formatPrice(totalPrice)}</strong>
                </div>
              </div>

              {blocker && <p className="personalizer-blocker">{t(blocker)}</p>}
              <button
                type="button"
                className="primary-button full-width personalizer-submit-btn"
                onClick={handleConfirm}
                disabled={Boolean(blocker)}
              >
                <Check size={16} />
                <span>{t("Add to bag with customisation ·")} {formatPrice(totalPrice)}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

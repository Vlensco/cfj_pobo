import { AdminOrder, FULFILLMENT_STAGES, OrderRequestStatus, resolveFulfillmentStage } from "@/lib/adminOrders";
import { ExternalLink, LoaderCircle, Save, Truck } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";

export type ShippingUpdate = {
  id: number;
  status: OrderRequestStatus;
  fulfillmentStage: string;
  courierName: string;
  trackingNumber: string;
  trackingUrl: string;
};

type Props = {
  order: AdminOrder;
  onSave: (update: ShippingUpdate) => void;
  isPending: boolean;
  disabled: boolean;
};

const CUSTOM_COURIER = "custom";
const COURIER_PRESETS = [
  { name: "JNE Express", url: "https://www.jne.co.id/tracking" },
  { name: "SiCepat Express", url: "https://sicepat.com/checkAwb" },
  { name: "J&T Express", url: "https://jet.co.id/track" },
  { name: "DHL Express", url: "https://www.dhl.com/en/express/tracking.html" },
  { name: "FedEx", url: "https://www.fedex.com/fedextrack/" },
  { name: "Lion Parcel", url: "https://lionparcel.com/track" },
  { name: "Anteraja", url: "https://anteraja.id/tracking" },
  { name: "POS Indonesia", url: "https://www.posindonesia.co.id/en/tracking" },
];
const DEFAULT_COURIER = COURIER_PRESETS[0];

const defaultTrackingNumber = (reference: string) => `TRC-${reference.replace(/^TR-/, "")}-ID`;
const randomTrackingNumber = () => `TRC-${Math.floor(100000000 + Math.random() * 900000000)}`;

/** Courier, waybill, and fulfilment-stage editor inside the order detail panel. */
export function OrderShippingForm({ order, onSave, isPending, disabled }: Props) {
  const [courier, setCourier] = useState(order.courierName || DEFAULT_COURIER.name);
  const [trackingNumber, setTrackingNumber] = useState(order.trackingNumber || defaultTrackingNumber(order.reference));
  const [trackingUrl, setTrackingUrl] = useState(order.trackingUrl || DEFAULT_COURIER.url);
  const [stage, setStage] = useState(resolveFulfillmentStage(order));

  // Reload the form whenever another order is selected or this one is updated.
  useEffect(() => {
    setCourier(order.courierName || DEFAULT_COURIER.name);
    setTrackingNumber(order.trackingNumber || defaultTrackingNumber(order.reference));
    setTrackingUrl(order.trackingUrl || DEFAULT_COURIER.url);
    setStage(resolveFulfillmentStage(order));
  }, [order.id, order.status, order.courierName, order.trackingNumber, order.trackingUrl, order.fulfillmentStage]);

  const locked = disabled || isPending;

  const save = (nextStage: string) => {
    const status = FULFILLMENT_STAGES.find(option => option.value === nextStage)?.status ?? order.status;
    onSave({
      id: order.id,
      status,
      fulfillmentStage: nextStage,
      courierName: courier.trim(),
      trackingNumber: trackingNumber.trim(),
      trackingUrl: trackingUrl.trim(),
    });
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    save(stage);
  };

  // Changing the stage saves immediately, so the status badge updates without an extra click.
  const changeStage = (nextStage: string) => {
    setStage(nextStage);
    save(nextStage);
  };

  const selectCourier = (name: string) => {
    const preset = COURIER_PRESETS.find(option => option.name === name);
    if (!preset) return;
    setCourier(preset.name);
    setTrackingUrl(preset.url);
  };

  return (
    <form onSubmit={handleSubmit} className="shipping-form">
      <p className="detail-label">
        <Truck size={13} /> Shipping, Resi & Fulfillment
      </p>

      <div className="shipping-field">
        <label htmlFor="shipping-stage">Fulfillment Stage / Status</label>
        <select
          id="shipping-stage"
          className="is-strong"
          aria-label="Request status"
          value={stage}
          disabled={locked}
          onChange={event => changeStage(event.target.value)}
        >
          {FULFILLMENT_STAGES.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="shipping-field">
        <label htmlFor="shipping-courier">Courier / Ekspedisi</label>
        <select
          id="shipping-courier"
          value={COURIER_PRESETS.some(option => option.name === courier) ? courier : CUSTOM_COURIER}
          disabled={locked}
          onChange={event => selectCourier(event.target.value)}
        >
          {COURIER_PRESETS.map(option => (
            <option key={option.name} value={option.name}>
              {option.name}
            </option>
          ))}
          <option value={CUSTOM_COURIER}>Other / Custom Courier...</option>
        </select>
        <input
          type="text"
          aria-label="Courier name"
          placeholder="Courier Name (e.g. JNE YES, SiCepat BEST)"
          value={courier}
          disabled={locked}
          onChange={event => setCourier(event.target.value)}
        />
      </div>

      <div className="shipping-field">
        <div className="shipping-field-head">
          <label htmlFor="shipping-waybill">Waybill No / Nomor Resi</label>
          <button type="button" className="shipping-link" onClick={() => setTrackingNumber(randomTrackingNumber())}>
            Generate Resi
          </button>
        </div>
        <input
          id="shipping-waybill"
          className="is-mono"
          type="text"
          placeholder="Enter tracking / waybill number (e.g. JP8912839210)"
          value={trackingNumber}
          disabled={locked}
          onChange={event => setTrackingNumber(event.target.value)}
        />
      </div>

      <div className="shipping-field">
        <div className="shipping-field-head">
          <label htmlFor="shipping-url">Tracking Website URL (Link Cek Resi)</label>
          {/^https?:\/\//i.test(trackingUrl) && (
            <a href={trackingUrl} target="_blank" rel="noopener noreferrer" className="shipping-link">
              Test Link <ExternalLink size={10} />
            </a>
          )}
        </div>
        <input
          id="shipping-url"
          type="url"
          placeholder="https://sicepat.com/checkAwb or tracking link"
          value={trackingUrl}
          disabled={locked}
          onChange={event => setTrackingUrl(event.target.value)}
        />
      </div>

      <button type="submit" className={`shipping-save ${isPending ? "is-saving" : ""}`} disabled={locked}>
        {isPending ? <LoaderCircle size={14} className="button-spinner" /> : <Save size={14} />}
        {isPending ? "Saving Dispatch..." : "Save Dispatch & Resi"}
      </button>
    </form>
  );
}

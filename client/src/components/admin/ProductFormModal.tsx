import { trpc } from "@/lib/trpc";
import { X } from "lucide-react";
import { FormEvent, useState } from "react";

export interface ProductFormData {
  handle: string;
  title: string;
  price: string;
  type: string;
  tags: string;
  imageUrl: string;
  bodyHtml: string;
  hasNameset: boolean;
  namesetPrice: string;
  patchSku: string;
}

type Props = {
  mode: "create" | "edit";
  initialValues: ProductFormData;
  isSaving: boolean;
  onSubmit: (values: ProductFormData) => void;
  onClose: () => void;
};

const COPY = {
  create: {
    eyebrow: "Catalog CMS / Drop 01",
    submit: "Publish to Catalog",
    saving: "Publishing...",
  },
  edit: {
    eyebrow: "Catalog CMS / Edit Piece",
    submit: "Save Changes",
    saving: "Saving...",
  },
};

const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** Create / edit dialog for a catalog piece. The handle is fixed once a piece exists. */
export function ProductFormModal({ mode, initialValues, isSaving, onSubmit, onClose }: Props) {
  const [values, setValues] = useState(initialValues);
  const patchOptions = trpc.catalog.addOns.useQuery({ kind: "patch", limit: 1500 }, { staleTime: 10 * 60 * 1000 });
  const isCreate = mode === "create";
  const copy = COPY[mode];

  const setField = <K extends keyof ProductFormData>(field: K, value: ProductFormData[K]) =>
    setValues(current => ({ ...current, [field]: value }));

  // While creating, the handle follows the title until the admin types their own.
  const changeTitle = (title: string) =>
    setValues(current => ({
      ...current,
      title,
      handle: isCreate && !current.handle ? slugify(title) : current.handle,
    }));

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    onSubmit(values);
  };

  const titleField = (
    <label>
      Piece Title
      <input
        type="text"
        required
        value={values.title}
        onChange={event => changeTitle(event.target.value)}
        placeholder="e.g. Concourse Overcoat"
      />
    </label>
  );

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-card" onClick={event => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <p className="eyebrow">{copy.eyebrow}</p>
            <h2>{isCreate ? "Add New Piece" : initialValues.title}</h2>
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="admin-form">
          {isCreate ? (
            <div className="form-row">
              {titleField}
              <label>
                Handle (Slug)
                <input
                  type="text"
                  required
                  value={values.handle}
                  onChange={event => setField("handle", event.target.value)}
                  placeholder="concourse-overcoat"
                />
              </label>
            </div>
          ) : (
            titleField
          )}

          <div className="form-row">
            <label>
              Price (IDR)
              <input
                type="number"
                required
                min={0}
                value={values.price}
                onChange={event => setField("price", event.target.value)}
                placeholder="1888000"
              />
            </label>
            <label>
              Category / Type
              <input
                type="text"
                value={values.type}
                onChange={event => setField("type", event.target.value)}
                placeholder="Outerwear"
              />
            </label>
          </div>

          <label>
            Image Asset Path / URL
            <input
              type="text"
              value={values.imageUrl}
              onChange={event => setField("imageUrl", event.target.value)}
              placeholder="/manus-storage/terrace-junction-v2_75e8572e.jpg"
            />
          </label>

          <label>
            Editorial Story / Description
            <textarea
              rows={3}
              value={values.bodyHtml}
              onChange={event => setField("bodyHtml", event.target.value)}
              placeholder="Details on the fabric, fit, and origin of the design..."
            />
          </label>

          <div className="addon-settings">
            <div className="addon-settings-head">
              <label className="addon-toggle">
                <input
                  type="checkbox"
                  checked={values.hasNameset}
                  onChange={event => setField("hasNameset", event.target.checked)}
                />
                <span>Opsi Addon Custom Nameset (+Harga)</span>
              </label>
              <span>Kustomisasi Jersey</span>
            </div>

            {values.hasNameset && (
              <div className="form-row">
                <label>
                  Harga Addon Nameset (IDR)
                  <input
                    type="number"
                    min={0}
                    value={values.namesetPrice}
                    onChange={event => setField("namesetPrice", event.target.value)}
                    placeholder="75000"
                  />
                </label>
                <label>
                  Default Connected Patch SKU
                  <input
                    list="patch-sku-options"
                    value={values.patchSku}
                    onChange={event => setField("patchSku", event.target.value)}
                    placeholder="Kosongkan = customer memilih sendiri"
                  />
                  <datalist id="patch-sku-options">
                    {(patchOptions.data?.items ?? []).map(patch => (
                      <option key={patch.sku} value={patch.sku}>
                        {patch.name}
                      </option>
                    ))}
                  </datalist>
                </label>
              </div>
            )}
          </div>

          <div className="modal-actions">
            <button type="button" className="text-button" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={`primary-button ${isSaving ? "is-loading" : ""}`} disabled={isSaving}>
              {isSaving ? copy.saving : copy.submit}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

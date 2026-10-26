import { useT } from "@/i18n";
import { FONT_REFERENCE_MAX_BYTES, FONT_REFERENCE_TYPES, type FontReference } from "@shared/customization";
import { FileType2, LoaderCircle, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

export type UploadedFontReference = {
  reference: FontReference;
  /** Local object URL of the file, for previewing it without downloading it again. */
  previewUrl: string;
  kind: "image" | "font";
  /** CSS font-family the uploaded font is registered under (font files only). */
  fontFamily?: string;
};

const ACCEPT = ".png,.jpg,.jpeg,.webp,.ttf,.otf,.woff,.woff2";
const EXTENSION_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  ttf: "font/ttf",
  otf: "font/otf",
  woff: "font/woff",
  woff2: "font/woff2",
};

/** Browsers often report fonts as "" or "application/octet-stream", so the extension decides. */
function guessType(file: File): string | null {
  if (FONT_REFERENCE_TYPES[file.type]) return file.type;
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return EXTENSION_TYPES[extension] ?? null;
}

async function uploadFile(file: File): Promise<FontReference> {
  const response = await fetch("/api/uploads/font-reference", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream", "X-File-Name": encodeURIComponent(file.name) },
    body: file,
    credentials: "include",
  });
  const body = await response.json().catch(() => null);
  if (!response.ok || !body?.id) {
    throw new Error(body?.error || (response.status === 413 ? "The file is larger than 5 MB." : "Upload failed."));
  }
  return { id: body.id, fileName: body.fileName, mimeType: body.mimeType };
}

/** Registers an uploaded font file so the shirt preview can be drawn in it. */
async function registerFont(file: File, id: string): Promise<string> {
  const family = `cfj-font-ref-${id}`;
  const face = new FontFace(family, await file.arrayBuffer());
  await face.load();
  document.fonts.add(face);
  return family;
}

type Props = {
  value: UploadedFontReference | null;
  onChange: (value: UploadedFontReference | null) => void;
};

/** Required font style reference for a custom nameset: an image of the lettering or the font file (max 5 MB). */
export function FontReferenceUpload({ value, onChange }: Props) {
  const t = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Frees the previous local preview when the file is replaced or removed.
  const replaceValue = (next: UploadedFontReference | null) => {
    if (value) URL.revokeObjectURL(value.previewUrl);
    onChange(next);
  };

  const handleFile = async (file: File | undefined) => {
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    const mimeType = guessType(file);
    if (!mimeType) {
      toast.error(t("Upload a PNG, JPG or WEBP image, or a TTF, OTF, WOFF or WOFF2 font file."));
      return;
    }
    if (file.size > FONT_REFERENCE_MAX_BYTES) {
      toast.error(t("The file is larger than 5 MB."));
      return;
    }

    setIsUploading(true);
    try {
      const reference = await uploadFile(file);
      const kind = FONT_REFERENCE_TYPES[reference.mimeType] ?? "image";
      const fontFamily = kind === "font" ? await registerFont(file, reference.id).catch(() => undefined) : undefined;
      if (kind === "font" && !fontFamily) toast.warning(t("The font was uploaded but cannot be previewed in this browser."));
      replaceValue({ reference, previewUrl: URL.createObjectURL(file), kind, fontFamily });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : t("Upload failed."));
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="font-ref-upload">
      <div className="font-ref-head">
        <strong>
          {t("Font style reference")} <span className="font-ref-required">*</span>
        </strong>
        <span>{t("Required · image (PNG, JPG, WEBP) or font file (TTF, OTF, WOFF) · max 5 MB")}</span>
      </div>

      {value ? (
        <div className="font-ref-preview">
          {value.kind === "image" ? (
            <img src={value.previewUrl} alt={t("Uploaded font reference")} />
          ) : (
            <div className="font-ref-font-sample" style={{ fontFamily: value.fontFamily }}>
              <FileType2 size={16} />
              <span>ABC 0123</span>
            </div>
          )}
          <div className="font-ref-meta">
            <span>{value.reference.fileName}</span>
            <button type="button" className="text-button" onClick={() => inputRef.current?.click()} disabled={isUploading}>
              {t("Replace")}
            </button>
          </div>
          <button type="button" className="font-ref-remove" onClick={() => replaceValue(null)} aria-label={t("Remove file")}>
            <X size={14} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="font-ref-dropzone"
          onClick={() => inputRef.current?.click()}
          onDragOver={event => event.preventDefault()}
          onDrop={event => {
            event.preventDefault();
            handleFile(event.dataTransfer.files[0]);
          }}
          disabled={isUploading}
        >
          {isUploading ? <LoaderCircle size={20} className="animate-spin" /> : <UploadCloud size={20} />}
          <span>{t(isUploading ? "Uploading..." : "Click or drop a file to upload your font reference")}</span>
        </button>
      )}

      <input ref={inputRef} type="file" accept={ACCEPT} hidden onChange={event => handleFile(event.target.files?.[0])} />
    </div>
  );
}

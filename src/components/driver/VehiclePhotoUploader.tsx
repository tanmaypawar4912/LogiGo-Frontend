
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  UploadCloud,
  XCircle,
  Trash2,
  Replace,
} from "lucide-react";
import { isAxiosError } from "axios";
import api from "../../services/api";

export type VehiclePhotoView = "front" | "right" | "left" | "back";

interface UploadResponse {
  success: boolean;
  message?: string;
  asset?: {
    id: string;
    assetId?: string;
    kind: string;
    view: VehiclePhotoView;
    url?: string | null;
    bytes?: number;
  };
}

interface VehiclePhotoUploaderProps {
  title: string;
  view: VehiclePhotoView;
  value?: string;
  onUploaded: (url: string, assetId?: string) => void;
  required?: boolean;
  disabled?: boolean;
}

const viewLabels: Record<VehiclePhotoView, string> = {
  front: "Front view",
  right: "Right side",
  left: "Left side",
  back: "Back view",
};

function getError(error: unknown): string {
  if (isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      (error.code === "ERR_NETWORK"
        ? "Cannot connect to LogiGo. Check that the backend is running."
        : "Image upload failed. Please try again.")
    );
  }

  return error instanceof Error
    ? error.message
    : "Image upload failed.";
}

export default function VehiclePhotoUploader({
  title,
  view,
  value = "",
  onUploaded,
  required = false,
  disabled = false,
}: VehiclePhotoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    return () => {
      if (localPreview?.startsWith("blob:")) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  function selectFile(event: ChangeEvent<HTMLInputElement>) {
    setError("");
    setNotice("");

    const nextFile = event.target.files?.[0] || null;

    if (!nextFile) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(nextFile.type)) {
      setFile(null);
      setLocalPreview(null);
      setError("Select a JPG, PNG or WEBP vehicle photo.");
      event.target.value = "";
      return;
    }

    // Keep frontend validation consistent with backend's 8 MB limit.
    if (nextFile.size > 8 * 1024 * 1024) {
      setFile(null);
      setLocalPreview(null);
      setError("The photo must be 8 MB or smaller.");
      event.target.value = "";
      return;
    }

    setFile(nextFile);
    setLocalPreview(URL.createObjectURL(nextFile));
  }

  async function uploadPhoto() {
    if (!file || uploading || disabled) return;

    setUploading(true);
    setError("");
    setNotice("");

    try {
      const formData = new FormData();

      formData.append("file", file);
      formData.append("kind", "vehicle-photo");
      formData.append("view", view);

      const response = await api.post<UploadResponse>(
        "/drivers/media/upload",
        formData
      );

      const uploadedAsset = response.data?.asset;
      const uploadedUrl = uploadedAsset?.url;
      const uploadedAssetId =
        uploadedAsset?.assetId || uploadedAsset?.id;

      if (
        !response.data?.success ||
        !uploadedUrl ||
        !uploadedAssetId
      ) {
        throw new Error(
          response.data?.message ||
            "The server did not return the uploaded image details."
        );
      }

      onUploaded(uploadedUrl, uploadedAssetId);

      setNotice(`${viewLabels[view]} uploaded successfully.`);
      setFile(null);
      setLocalPreview(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }
    } catch (uploadError: unknown) {
      setError(getError(uploadError));
    } finally {
      setUploading(false);
    }
  }

  function removePhotoFromForm() {
    if (uploading || disabled || !value) return;

    const confirmed = window.confirm(
      `Remove the ${viewLabels[view].toLowerCase()} photo from this form? You can upload a replacement before submitting.`
    );

    if (!confirmed) return;

    onUploaded("");
    setFile(null);
    setLocalPreview(null);
    setError("");
    setNotice(
      "Photo removed from this form. Choose and upload a replacement if needed."
    );

    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const preview = localPreview || value;

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <label className="text-xs font-extrabold text-slate-800 sm:text-sm">
          {title}
          {required ? " *" : ""}
        </label>

        {value && !file && (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-extrabold text-emerald-700">
            <CheckCircle2 className="h-3 w-3" />
            Uploaded
          </span>
        )}
      </div>

      <div className="mt-3 flex h-32 items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-200 bg-slate-50 sm:h-36">
        {preview ? (
          <img
            src={preview}
            alt={`${title} preview`}
            className="h-full w-full object-contain"
          />
        ) : (
          <div className="text-center text-slate-400">
            <ImagePlus className="mx-auto h-7 w-7" />
            <p className="mt-2 text-xs font-semibold">
              Choose a real vehicle photo
            </p>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled || uploading}
        onChange={selectFile}
        aria-label={`Choose ${title}`}
        className="mt-3 block w-full cursor-pointer text-xs text-slate-600 file:mr-3 file:min-h-9 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-xs file:font-extrabold file:text-slate-700 hover:file:bg-orange-50"
      />

      <p className="mt-1.5 text-[10px] leading-4 text-slate-500">
        JPG, PNG or WEBP · Max 8 MB
      </p>

      {value && !file && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setError("");
              setNotice("");
              inputRef.current?.click();
            }}
            disabled={disabled || uploading}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-slate-200 px-2 py-2 text-xs font-extrabold text-slate-700 transition hover:border-orange-300 hover:bg-orange-50 disabled:opacity-50"
          >
            <Replace className="h-3.5 w-3.5" />
            Replace photo
          </button>

          <button
            type="button"
            onClick={removePhotoFromForm}
            disabled={disabled || uploading}
            className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-rose-200 px-2 py-2 text-xs font-extrabold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove photo
          </button>
        </div>
      )}

      {file && (
        <button
          type="button"
          onClick={() => void uploadPhoto()}
          disabled={uploading || disabled}
          className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#101c30] px-3 py-2.5 text-xs font-extrabold text-white transition hover:bg-[#1b2d48] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {uploading ? (
            <LoaderCircle className="h-4 w-4 animate-spin" />
          ) : (
            <UploadCloud className="h-4 w-4" />
          )}

          {uploading
            ? "Uploading to Cloudinary…"
            : "Upload photo"}
        </button>
      )}

      {error && (
        <p
          role="alert"
          className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-rose-700"
        >
          <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="mt-2 flex items-start gap-1.5 text-xs leading-5 text-emerald-700"
        >
          <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {notice}
        </p>
      )}
    </section>
  );
}

import { useRef, useState } from "react";
import { IconCamera, IconCheck, IconMapPin, IconShield, IconTrash } from "./Icons";
import { formatWibDateTime } from "../lib/format";

const getPosition = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error("Perangkat tidak mendukung GPS browser."));
    return;
  }
  navigator.geolocation.getCurrentPosition(resolve, reject, {
    enableHighAccuracy: true,
    timeout: 20000,
    maximumAge: 0
  });
});

const readDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(new Error("Foto gagal dibaca."));
  reader.readAsDataURL(file);
});

const stampPhoto = (dataUrl, metadata) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => {
    const maxWidth = 1600;
    const ratio = Math.min(1, maxWidth / image.width);
    const width = Math.round(image.width * ratio);
    const height = Math.round(image.height * ratio);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0, width, height);
    const bandHeight = Math.max(104, Math.round(height * 0.16));
    ctx.fillStyle = "rgba(15, 23, 42, 0.84)";
    ctx.fillRect(0, height - bandHeight, width, bandHeight);
    const fontSize = Math.max(16, Math.round(width * 0.018));
    ctx.fillStyle = "#ffffff";
    ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
    ctx.fillText(metadata.capturedAtWib, 24, height - bandHeight + fontSize + 18);
    ctx.font = `500 ${Math.max(14, fontSize - 2)}px system-ui, sans-serif`;
    ctx.fillText(`${metadata.latitude.toFixed(6)}, ${metadata.longitude.toFixed(6)} | akurasi ${Math.round(metadata.accuracy)} m`, 24, height - 24);
    resolve(canvas.toDataURL("image/jpeg", 0.86));
  };
  image.onerror = () => reject(new Error("Foto tidak dapat diproses."));
  image.src = dataUrl;
});

export default function ImageUploader({ value, onChange }) {
  const inputRef = useRef(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");

  const handleFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Berkas harus berupa foto.");
      return;
    }
    setStatus("locating");
    try {
      const position = await getPosition();
      const capturedAt = new Date().toISOString();
      const metadata = {
        capturedAt,
        capturedAtWib: formatWibDateTime(capturedAt),
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        altitude: position.coords.altitude,
        heading: position.coords.heading,
        source: "camera-input",
        fileLastModified: file.lastModified,
        device: navigator.userAgent,
        secureContext: window.isSecureContext,
        online: navigator.onLine,
        riskFlags: [
          ...(position.coords.accuracy > 150 ? ["akurasi-rendah"] : []),
          ...(Date.now() - file.lastModified > 10 * 60 * 1000 ? ["waktu-berkas-tidak-segar"] : []),
          ...(!window.isSecureContext ? ["koneksi-tidak-aman"] : [])
        ]
      };
      const raw = await readDataUrl(file);
      const stamped = await stampPhoto(raw, metadata);
      onChange({ dataUrl: stamped, metadata });
      setStatus("ready");
    } catch (err) {
      setStatus("error");
      setError(err.code === 1 ? "Izin GPS ditolak. Aktifkan lokasi agar foto dapat diverifikasi." : err.message || "GPS atau kamera gagal diproses.");
      event.target.value = "";
    }
  };

  if (value?.dataUrl) {
    const riskCount = value.metadata?.riskFlags?.length || 0;
    return (
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
        <div className="relative">
          <img src={value.dataUrl} alt="Bukti foto survey dengan geotag" className="max-h-[420px] w-full object-contain" />
          <button type="button" onClick={() => { onChange(null); setStatus("idle"); if (inputRef.current) inputRef.current.value = ""; }} className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-md bg-white text-red-700 shadow-md hover:bg-red-50" aria-label="Hapus foto">
            <IconTrash className="h-5 w-5" />
          </button>
        </div>
        <div className="grid gap-2 bg-white p-3 text-sm sm:grid-cols-2">
          <p className="flex items-start gap-2 text-slate-700"><IconMapPin className="mt-0.5 h-4 w-4 flex-none text-emerald-700" /><span>{value.metadata.latitude.toFixed(6)}, {value.metadata.longitude.toFixed(6)}<br /><span className="text-xs text-slate-500">Akurasi {Math.round(value.metadata.accuracy)} meter</span></span></p>
          <p className="flex items-start gap-2 text-slate-700"><IconShield className="mt-0.5 h-4 w-4 flex-none text-emerald-700" /><span>{riskCount === 0 ? "Pemeriksaan dasar lolos" : `${riskCount} indikator perlu ditinjau master`}<br /><span className="text-xs text-slate-500">Metadata disimpan bersama laporan</span></span></p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-slate-50 px-5 text-center transition hover:border-emerald-600 hover:bg-emerald-50 focus-within:ring-2 focus-within:ring-emerald-700 focus-within:ring-offset-2">
        {status === "locating" ? (
          <span className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-emerald-700" />
        ) : (
          <span className="grid h-11 w-11 place-items-center rounded-md bg-emerald-800 text-white"><IconCamera className="h-5 w-5" /></span>
        )}
        <span className="mt-3 text-sm font-semibold text-slate-900">{status === "locating" ? "Mengambil GPS dan memproses foto" : "Buka kamera dan ambil foto"}</span>
        <span className="mt-1 max-w-md text-xs leading-relaxed text-slate-600">Foto akan diberi stempel waktu WIB, koordinat, dan akurasi GPS. Unggah galeri tidak disediakan pada alur ini.</span>
        <input ref={inputRef} type="file" accept="image/*" capture="environment" onChange={handleFile} className="sr-only" disabled={status === "locating"} />
      </label>
      {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
      <div className="mt-2 flex items-start gap-2 rounded-md bg-amber-50 p-3 text-xs leading-relaxed text-amber-900">
        <IconCheck className="mt-0.5 h-4 w-4 flex-none" />
        <p>Validasi browser membantu peninjauan, tetapi deteksi VPN dan GPS palsu secara penuh memerlukan validasi server serta kebijakan perangkat terkelola.</p>
      </div>
    </div>
  );
}

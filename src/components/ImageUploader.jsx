
import { useEffect, useRef, useState } from "react";
import {
  Camera,
  MapPin,
  Clock,
  Loader2,
  CloudSun,
  Sun,
  Cloud,
  CloudRain,
  Navigation,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

// ==========================================
// 1. API CONFIGURATION
// ==========================================

const LOCATIONIQ_TOKEN = import.meta.env.VITE_LOCATIONIQ_TOKEN;

const LOCATIONIQ_REVERSE_URL =
  "https://us1.locationiq.com/v1/reverse";

const LOCATIONIQ_MAP_URL =
  "https://maps.locationiq.com/v3/staticmap";

const OPEN_METEO_URL =
  "https://api.open-meteo.com/v1/forecast";

// ==========================================
// 2. LOCATIONIQ STATIC MAP GENERATOR
// ==========================================

const getLocationIQMapUrl = (
  latitude,
  longitude,
  size = "600x400"
) => {
  if (
    !LOCATIONIQ_TOKEN ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const params = new URLSearchParams({
    key: LOCATIONIQ_TOKEN,
    center: `${latitude},${longitude}`,
    zoom: "17",
    size,
    format: "jpg",
    maptype: "streets",
    markers: `icon:large-red-cutout|${latitude},${longitude}`,
  });

  return `${LOCATIONIQ_MAP_URL}?${params.toString()}`;
};

// ==========================================
// 3. WEATHER ICON - WMO CODES
// ==========================================

const getWeatherIcon = (code) => {
  if (code === 0) {
    return <Sun className="size-5 text-yellow-400" />;
  }

  if (code >= 1 && code <= 3) {
    return <CloudSun className="size-5 text-yellow-300" />;
  }

  if (code >= 45 && code <= 48) {
    return <Cloud className="size-5 text-slate-300" />;
  }

  if (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    (code >= 95 && code <= 99)
  ) {
    return <CloudRain className="size-5 text-blue-400" />;
  }

  return <CloudSun className="size-5 text-slate-300" />;
};

// ==========================================
// 4. WEATHER DESCRIPTION
// ==========================================

const getWeatherDescription = (code) => {
  if (code === 0) return "Cerah";

  if (code === 1) return "Cerah berawan";
  if (code === 2) return "Berawan sebagian";
  if (code === 3) return "Mendung";

  if (code === 45 || code === 48) return "Berkabut";

  if (code >= 51 && code <= 55) return "Gerimis";
  if (code >= 56 && code <= 57) return "Gerimis beku";

  if (code >= 61 && code <= 65) return "Hujan";
  if (code >= 66 && code <= 67) return "Hujan beku";

  if (code >= 71 && code <= 77) return "Salju";

  if (code >= 80 && code <= 82) return "Hujan lokal";

  if (code === 85 || code === 86) return "Hujan salju";

  if (code >= 95) return "Badai petir";

  return "Kondisi tidak diketahui";
};

// ==========================================
// 5. DISTANCE CALCULATION
// ==========================================

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000;

  const toRad = (value) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;

  return (
    R *
    2 *
    Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  );
};

// ==========================================
// 6. MAIN COMPONENT
// ==========================================

export default function ImageUploader({ value, onChange, disabled = false }) {
  const [isCapturing, setIsCapturing] = useState(false);

  const [liveLocation, setLiveLocation] = useState(null);

  const [liveTime, setLiveTime] = useState(
    new Date().toISOString()
  );

  const [geoError, setGeoError] = useState("");

  const [address, setAddress] = useState({
    full: "",
    short: "",
    street: "",
  });

  const [weather, setWeather] = useState(null);

  const [isLoadingMeta, setIsLoadingMeta] = useState(false);

  const [mapError, setMapError] = useState(false);

  const fileInputRef = useRef(null);

  const lastMetaLocationRef = useRef(null);

  const requestSequenceRef = useRef(0);

  // ==========================================
  // 7. GPS LOCATION & REAL-TIME CLOCK
  // ==========================================

  useEffect(() => {
    if (!navigator.geolocation) {
      setGeoError("Perangkat tidak mendukung GPS.");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setLiveLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });

        setGeoError("");
      },

      (err) => {
        const messages = {
          1: "Izin lokasi ditolak. Aktifkan izin GPS.",
          2: "Lokasi tidak dapat ditemukan.",
          3: "Waktu pencarian GPS habis. Coba kembali.",
        };

        setGeoError(
          messages[err.code] || "Gagal mendeteksi GPS."
        );
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 10000,
      }
    );

    const timer = setInterval(() => {
      setLiveTime(new Date().toISOString());
    }, 1000);

    return () => {
      navigator.geolocation.clearWatch(id);
      clearInterval(timer);
    };
  }, []);

  // ==========================================
  // 8. LOCATIONIQ REVERSE GEOCODING
  // ==========================================

  const fetchAddress = async (latitude, longitude) => {
    if (!LOCATIONIQ_TOKEN) {
      throw new Error("LocationIQ token belum dikonfigurasi.");
    }

    const params = new URLSearchParams({
      key: LOCATIONIQ_TOKEN,
      lat: String(latitude),
      lon: String(longitude),
      format: "json",
      addressdetails: "1",
      "accept-language": "id",
    });

    const response = await fetch(
      `${LOCATIONIQ_REVERSE_URL}?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(
        `LocationIQ error: ${response.status}`
      );
    }

    const data = await response.json();

    const addr = data.address || {};

    const city =
      addr.city ||
      addr.town ||
      addr.village ||
      addr.municipality ||
      addr.county ||
      "";

    const state = addr.state || "";

    const country = addr.country || "";

    const road =
      addr.road ||
      addr.pedestrian ||
      addr.residential ||
      "";

    return {
      full: data.display_name || "Alamat tidak diketahui",

      short: [city, state, country]
        .filter(Boolean)
        .join(", "),

      street: road,
    };
  };

  // ==========================================
  // 9. OPEN-METEO WEATHER API
  // ==========================================

  const fetchWeather = async (latitude, longitude) => {
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      current: "temperature_2m,weather_code",
      timezone: "auto",
    });

    const response = await fetch(
      `${OPEN_METEO_URL}?${params.toString()}`
    );

    if (!response.ok) {
      throw new Error(
        `Open-Meteo error: ${response.status}`
      );
    }

    const data = await response.json();

    if (!data.current) {
      throw new Error("Data cuaca tidak tersedia.");
    }

    return {
      temp: Math.round(data.current.temperature_2m),
      code: data.current.weather_code,
    };
  };

  // ==========================================
  // 10. FETCH LOCATION & WEATHER
  // ==========================================

  useEffect(() => {
    if (!liveLocation) return;

    const { latitude, longitude } = liveLocation;

    // Hindari request jika perpindahan kurang dari 75 meter
    const previous = lastMetaLocationRef.current;

    if (previous) {
      const distance = calculateDistance(
        previous.latitude,
        previous.longitude,
        latitude,
        longitude
      );

      if (distance < 75) return;
    }

    const timeout = setTimeout(async () => {
      const requestId = ++requestSequenceRef.current;

      lastMetaLocationRef.current = {
        latitude,
        longitude,
      };

      setIsLoadingMeta(true);

      const results = await Promise.allSettled([
        fetchAddress(latitude, longitude),
        fetchWeather(latitude, longitude),
      ]);

      // Abaikan hasil request lama
      if (requestId !== requestSequenceRef.current) {
        return;
      }

      // LocationIQ
      if (results[0].status === "fulfilled") {
        setAddress(results[0].value);
      } else {
        console.error(
          "LocationIQ error:",
          results[0].reason
        );

        setAddress({
          full: "Gagal memuat alamat",
          short: "",
          street: "",
        });
      }

      // Open-Meteo
      if (results[1].status === "fulfilled") {
        setWeather(results[1].value);
      } else {
        console.error(
          "Open-Meteo error:",
          results[1].reason
        );

        setWeather(null);
      }

      setIsLoadingMeta(false);
    }, 2000);

    return () => {
      clearTimeout(timeout);
    };
  }, [
    liveLocation?.latitude,
    liveLocation?.longitude,
  ]);

  // ==========================================
  // 11. IMAGE PROCESSING
  // ==========================================

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    // Reset input agar foto yang sama bisa dipilih lagi
    e.target.value = "";

    if (!file.type.startsWith("image/")) {
      toast.error("File harus berupa gambar.");
      return;
    }

    if (!liveLocation) {
      toast.error("Lokasi GPS belum terdeteksi.");
      return;
    }

    setIsCapturing(true);

    try {
      // Read file
      const imageData = await new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = () => resolve(reader.result);

        reader.onerror = () =>
          reject(new Error("Gagal membaca file."));

        reader.readAsDataURL(file);
      });

      // Load image
      const img = await new Promise((resolve, reject) => {
        const image = new Image();

        image.onload = () => resolve(image);

        image.onerror = () =>
          reject(new Error("Gagal memuat gambar."));

        image.src = imageData;
      });

      // Canvas
      const canvas = document.createElement("canvas");

      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Canvas tidak tersedia.");
      }

      // Maksimal dimensi gambar 1080px
      const maxDimension = 1080;

      const scale = Math.min(
        1,
        maxDimension / Math.max(img.width, img.height)
      );

      canvas.width = Math.round(img.width * scale);

      canvas.height = Math.round(img.height * scale);

      ctx.drawImage(
        img,
        0,
        0,
        canvas.width,
        canvas.height
      );

      // ========================================
      // WATERMARK
      // ========================================

      const fontSize = Math.max(
        14,
        Math.round(canvas.width * 0.025)
      );

      const padding = 24;

      const lat = liveLocation.latitude.toFixed(6);

      const lng = liveLocation.longitude.toFixed(6);

      const now = new Date();

      const dateStr = new Intl.DateTimeFormat("id-ID", {
        dateStyle: "full",
        timeStyle: "medium",
        timeZone: "Asia/Jakarta",
      }).format(now);

      const watermarkLines = [
        `GPS: ${lat}, ${lng}`,
        dateStr,
      ];

      ctx.save();

      ctx.font = `bold ${fontSize}px sans-serif`;

      ctx.textBaseline = "middle";

      const lineHeight = fontSize * 1.8;

      const boxHeight = lineHeight * 2 + 20;

      // Background watermark
      ctx.fillStyle = "rgba(0, 0, 0, 0.48)";

      ctx.fillRect(
        0,
        canvas.height - boxHeight,
        canvas.width,
        boxHeight
      );

      // Watermark text
      ctx.fillStyle = "#FFFFFF";

      ctx.shadowColor = "rgba(0,0,0,0.5)";

      ctx.shadowBlur = 3;

      ctx.fillText(
        watermarkLines[0],
        padding,
        canvas.height - boxHeight + 18
      );

      ctx.fillText(
        watermarkLines[1],
        padding,
        canvas.height - 18
      );

      ctx.restore();

      // Convert to JPEG
      const dataUrl = canvas.toDataURL(
        "image/jpeg",
        0.85
      );

      // ========================================
      // SAVE METADATA
      // ========================================

      onChange({
        dataUrl,

        path: null,

        metadata: {
          latitude: liveLocation.latitude,

          longitude: liveLocation.longitude,

          accuracy: liveLocation.accuracy,

          capturedAt: now.toISOString(),

          capturedAtWib: new Intl.DateTimeFormat(
            "id-ID",
            {
              timeZone: "Asia/Jakarta",
              dateStyle: "full",
              timeStyle: "medium",
            }
          ).format(now),

          address:
            address.full || "Alamat tidak tersedia",

          weather: weather
            ? `${weather.temp}°C`
            : null,

          weatherCode: weather?.code ?? null,

          weatherDescription: weather
            ? getWeatherDescription(weather.code)
            : null,
        },
      });

    } catch (err) {
      console.error("Image processing error:", err);

      toast.error("Gagal memproses gambar.");

    } finally {
      setIsCapturing(false);
    }
  };

  // ==========================================
  // 12. PHOTO PREVIEW
  // ==========================================

  if (value?.dataUrl) {
    const metadata = value.metadata || {};

    const latitude = metadata.latitude;

    const longitude = metadata.longitude;

    const hasCoordinates =
      Number.isFinite(latitude) &&
      Number.isFinite(longitude);

    const mapUrl = hasCoordinates
      ? getLocationIQMapUrl(
          latitude,
          longitude,
          "400x400"
        )
      : null;

    return (
      <div className="relative w-full overflow-hidden rounded-xl bg-slate-900 shadow-sm animate-in fade-in">

        {/* Main Photo */}
        <img
          src={value.dataUrl}
          alt="Bukti survei"
          className="w-full object-cover aspect-[3/4] sm:aspect-video"
        />

        {/* Remove Photo - Sembunyikan jika disabled */}
        {!disabled && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setMapError(false);
              onChange(null);
            }}
            className="absolute top-3 right-3 h-8 text-xs bg-black/50 text-white backdrop-blur-md border-none hover:bg-black/70"
          >
            Hapus Foto
          </Button>
        )}

        {/* METADATA OVERLAY */}
        <div className="absolute bottom-3 left-3 right-3 rounded-xl bg-slate-900/85 p-3 shadow-lg backdrop-blur-md border border-white/10 text-white">

          <div className="flex items-center gap-3">

            {/* LOCATIONIQ STATIC MAP */}
            <div className="size-24 shrink-0 overflow-hidden rounded-lg border border-white/20 relative bg-slate-800">

              {mapUrl && !mapError ? (
                <img
                  src={mapUrl}
                  alt="Peta lokasi pengambilan foto"
                  className="w-full h-full object-cover"
                  loading="lazy"
                  onError={() => setMapError(true)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400">
                  <MapPin className="size-6" />
                  <span className="text-[9px]">
                    Peta tidak tersedia
                  </span>
                </div>
              )}

              <MapPin className="absolute bottom-1 right-1 size-4 text-red-500 drop-shadow-md pointer-events-none" />
            </div>

            {/* ADDRESS & WEATHER */}
            <div className="flex-1 min-w-0">

              <h4 className="truncate text-sm font-bold">
                {metadata.address?.split(",")[0] ||
                  "Lokasi Terdeteksi"}
              </h4>

              <p className="text-[10px] text-slate-300 line-clamp-2">
                {metadata.address ||
                  "Alamat tidak tersedia"}
              </p>

              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">

                {hasCoordinates && (
                  <div className="flex items-center gap-1 text-[10px] font-mono text-emerald-300">
                    <MapPin className="size-3 shrink-0" />

                    {latitude.toFixed(5)},{" "}
                    {longitude.toFixed(5)}
                  </div>
                )}

                {metadata.weather && (
                  <div className="flex items-center gap-1 text-[11px] font-bold shrink-0">
                    <Sun className="size-3 text-yellow-400" />

                    {metadata.weather}
                  </div>
                )}

              </div>

              {metadata.weatherDescription && (
                <p className="mt-1 text-[10px] text-slate-400">
                  {metadata.weatherDescription}
                </p>
              )}

            </div>
          </div>

          {/* CAPTURED TIME */}
          <div className="mt-2 flex items-center gap-1.5 text-[10px] text-slate-400 border-t border-white/10 pt-2">
            <Clock className="size-3 shrink-0" />

            {metadata.capturedAtWib || "-"}
          </div>

        </div>
      </div>
    );
  }

  // ==========================================
  // 13. LIVE MAP BACKGROUND
  // ==========================================

  const mapBackgroundUrl = liveLocation
    ? getLocationIQMapUrl(
        liveLocation.latitude,
        liveLocation.longitude,
        "600x400"
      )
    : null;

  // ==========================================
  // 14. CAMERA INPUT & LIVE LOCATION
  // ==========================================

  return (
    <div className="relative flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 sm:p-10 overflow-hidden">

      {/* LOCATIONIQ BACKGROUND MAP */}
      {mapBackgroundUrl && (
        <img
          src={mapBackgroundUrl}
          alt="Peta lokasi GPS"
          className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale"
          onError={() => setMapError(true)}
        />
      )}

      <div className="relative z-10 w-full max-w-sm space-y-4">

        {/* REAL-TIME METADATA */}
        <div className="rounded-xl bg-white/90 backdrop-blur border border-slate-200 p-3 shadow-sm">

          {/* GPS STATUS */}
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">

            <Navigation className="size-4 text-emerald-600 animate-pulse" />

            {liveLocation
              ? "Lokasi Terkunci"
              : "Mencari GPS..."}
          </div>

          {/* GPS ERROR */}
          {geoError && (
            <p className="mt-2 text-xs text-red-500">
              {geoError}
            </p>
          )}

          {liveLocation && (
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs">

              {/* COORDINATES */}
              <div>
                <p className="text-slate-500">
                  Koordinat
                </p>

                <p className="font-mono font-medium text-slate-900">
                  {liveLocation.latitude.toFixed(5)},{" "}
                  {liveLocation.longitude.toFixed(5)}
                </p>
              </div>

              {/* ACCURACY */}
              <div>
                <p className="text-slate-500">
                  Akurasi GPS
                </p>

                <p className="font-medium text-slate-900">
                  ± {Math.round(liveLocation.accuracy)} m
                </p>
              </div>

              {/* ADDRESS */}
              <div className="col-span-2 border-t border-slate-100 pt-2 mt-1">

                <div className="flex items-center gap-1.5 text-slate-500">

                  <MapPin className="size-3" />

                  <span>Alamat Lokasi</span>

                  {isLoadingMeta && (
                    <Loader2 className="size-3 animate-spin" />
                  )}
                </div>

                <p className="mt-1 font-medium text-slate-900">
                  {address.short ||
                    (isLoadingMeta
                      ? "Mencari alamat..."
                      : "Alamat belum tersedia")}
                </p>

                {address.street && (
                  <p className="text-[10px] text-slate-500">
                    {address.street}
                  </p>
                )}

              </div>

              {/* TIME & WEATHER */}
              <div className="col-span-2 flex items-center justify-between border-t border-slate-100 pt-2 mt-1">

                {/* TIME */}
                <div className="flex items-center gap-1">

                  <Clock className="size-3 text-slate-400" />

                  <span className="font-mono">
                    {new Intl.DateTimeFormat("id-ID", {
                      timeZone: "Asia/Jakarta",
                      timeStyle: "medium",
                    }).format(new Date(liveTime))}
                  </span>

                </div>

                {/* WEATHER */}
                {weather && (
                  <div className="flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">

                    {getWeatherIcon(weather.code)}

                    {weather.temp}°C

                  </div>
                )}

              </div>

              {/* WEATHER DESCRIPTION */}
              {weather && (
                <div className="col-span-2 text-[10px] text-slate-500">
                  Kondisi cuaca:{" "}
                  {getWeatherDescription(weather.code)}
                </div>
              )}

            </div>
          )}
        </div>

        {/* FILE INPUT */}
        <input
          type="file"
          accept="image/*"
          capture="environment"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />

        {/* CAMERA BUTTON */}
        <Button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isCapturing || !liveLocation || disabled}
          className="h-14 w-full rounded-xl bg-emerald-700 hover:bg-emerald-800 shadow-lg"
        >

          {isCapturing ? (
            <Loader2 className="mr-2 size-5 animate-spin" />
          ) : (
            <Camera className="mr-2 size-5" />
          )}

          {isCapturing
            ? "Memproses..."
            : !liveLocation
              ? "Menunggu GPS..."
              : disabled
                ? "Foto Terkunci"
                : "Buka Kamera & Ambil Foto"}

        </Button>

      </div>
    </div>
  );
}

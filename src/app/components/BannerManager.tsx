import { useEffect, useRef, useState } from "react";
import type { BannersConfig, BannerItem } from "../types/banners";

interface BannerManagerProps {
  banners: BannersConfig;
  onBack: () => void;
  onSave: (banners: BannersConfig) => Promise<void>;
}

type SlotKey = "left" | "right" | "mobile";

const SLOT_META: Record<SlotKey, { title: string; hint: string }> = {
  left: {
    title: "Costado izquierdo (PC)",
    hint: "Se muestra en pantallas grandes, del lado izquierdo. Recomendado: imagen vertical.",
  },
  right: {
    title: "Costado derecho (PC)",
    hint: "Se muestra en pantallas grandes, del lado derecho. Recomendado: imagen vertical.",
  },
  mobile: {
    title: "Celular (píldora discreta)",
    hint: "Aparece como una puestrita chica abajo a la izquierda. Se cierra con la ✕. Recomendado: imagen cuadrada.",
  },
};

function fileToCompressedDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.onload = () => {
      const dataUrl = String(reader.result);
      const img = new Image();
      img.onerror = () => reject(new Error("Archivo de imagen inválido"));
      img.onload = () => {
        const maxSide = 700;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas no disponible"));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

function SlotEditor({
  slotKey,
  item,
  onChange,
}: {
  slotKey: SlotKey;
  item?: BannerItem | null;
  onChange: (item: BannerItem | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const meta = SLOT_META[slotKey];

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try {
      const img = await fileToCompressedDataUrl(file);
      if (img.length > 600000) {
        alert("La imagen pesa demasiado even comprimida. Probá con una más chica.");
        return;
      }
      onChange({ img, href: item?.href || "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error al procesar la imagen");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border-2 border-[#D4AF37]/40 bg-black/20 p-3">
      <p className="text-[#F5DEB3] font-bold text-sm mb-1">{meta.title}</p>
      <p className="text-[#D2B48C] text-xs mb-3">{meta.hint}</p>

      <div className="flex gap-3 items-start">
        <div className="w-24 shrink-0">
          {item?.img ? (
            <img
              src={item.img}
              alt="Vista previa"
              className="w-full max-h-32 object-contain rounded border border-[#654321] bg-black/30"
            />
          ) : (
            <div className="w-full h-20 rounded border border-dashed border-[#654321] bg-black/30 flex items-center justify-center text-[#D2B48C] text-xs text-center px-1">
              Sin imagen
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            className="hidden"
          />
          <div className="flex gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              disabled={busy}
              className="px-3 py-1.5 text-xs font-semibold bg-[#654321] text-[#F5DEB3] border border-[#D4AF37] rounded hover:bg-[#7d5a2e] transition-colors disabled:opacity-50"
            >
              {busy ? "Procesando..." : item?.img ? "Cambiar imagen" : "Elegir imagen"}
            </button>
            {item && (
              <button
                onClick={() => onChange(null)}
                className="px-3 py-1.5 text-xs font-semibold bg-[#7a2e2e] text-[#F5DEB3] border border-[#D4AF37] rounded hover:bg-[#943b3b] transition-colors"
              >
                Quitar
              </button>
            )}
          </div>
          <input
            type="url"
            value={item?.href || ""}
            onChange={(e) =>
              onChange(item?.img ? { img: item.img, href: e.target.value } : null)
            }
            placeholder="https://... (a dónde lleva el clic)"
            className="w-full px-3 py-2 text-sm bg-[#D2B48C] border-2 border-[#654321] rounded text-[#3E2723] placeholder-[#8B7355] focus:outline-none focus:border-[#D4AF37]"
          />
        </div>
      </div>
    </div>
  );
}

export function BannerManager({ banners, onBack, onSave }: BannerManagerProps) {
  const [draft, setDraft] = useState<BannersConfig>(banners);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setDraft(banners);
  }, [banners]);

  const setSlot = (key: SlotKey, item: BannerItem | null) => {
    setDraft((prev) => ({ ...prev, [key]: item }));
  };

  const handleSave = async () => {
    for (const key of ["left", "right", "mobile"] as SlotKey[]) {
      const item = draft[key];
      if (item && (!item.href || !item.href.startsWith("http"))) {
        alert(`Falta el enlace (debe empezar con http) en: ${SLOT_META[key].title}`);
        return;
      }
    }
    setSaving(true);
    try {
      await onSave(draft);
      setSaved(true);
      window.setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#8B4513] via-[#A0522D] to-[#654321] p-4">
      <div className="max-w-2xl mx-auto pt-4">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="px-4 py-2 bg-[#654321] text-[#F5DEB3] border-2 border-[#D4AF37] rounded hover:bg-[#7d5a2e] transition-colors"
          >
            ← Volver
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-gradient-to-b from-[#D4AF37] to-[#B8941E] text-[#3E2723] font-bold border-2 border-[#654321] rounded hover:from-[#FFD700] hover:to-[#D4AF37] transition-all disabled:opacity-50"
          >
            {saving ? "Guardando..." : saved ? "✓ Guardado" : "Guardar cambios"}
          </button>
        </div>

        <div className="text-center mb-4">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#F5DEB3]" style={{ fontFamily: "serif" }}>
            📢 Banners publicitarios
          </h1>
          <p className="text-[#D2B48C] text-sm mt-1">
            Subí tu imagen y poné el enlace. Un clic en el banner abre tu publicidad. Se comprimen solas.
          </p>
        </div>

        <div className="space-y-3">
          <SlotEditor slotKey="left" item={draft.left} onChange={(item) => setSlot("left", item)} />
          <SlotEditor slotKey="right" item={draft.right} onChange={(item) => setSlot("right", item)} />
          <SlotEditor slotKey="mobile" item={draft.mobile} onChange={(item) => setSlot("mobile", item)} />
        </div>

        <p className="text-[#D2B48C] text-xs mt-4 leading-relaxed">
          Los banners de costado se ven solo en PC (pantallas grandes) y no se muestran durante las partidas. En
          celular aparece solo la píldora discreta "Ofertas" con botón de cierre. Tus publicidades, sin redes de
          anuncios de terceros.
        </p>
      </div>
    </div>
  );
}

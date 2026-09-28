import { useState } from "react";
import type { BannersConfig } from "../types/banners";

interface SideBannersProps {
  banners: BannersConfig;
}

const CLOSED_KEY = "bannerMobileClosed";

export function SideBanners({ banners }: SideBannersProps) {
  const [closed, setClosed] = useState(() => {
    try {
      return sessionStorage.getItem(CLOSED_KEY) === "1";
    } catch {
      return false;
    }
  });

  if (closed) return null;

  const close = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setClosed(true);
    try {
      sessionStorage.setItem(CLOSED_KEY, "1");
    } catch {
      // sessionStorage unavailable
    }
  };

  const bannerClass =
    "fixed top-1/2 -translate-y-1/2 z-40 w-36 xl:w-44 transition-transform hover:scale-[1.03] hidden lg:block";

  return (
    <>
      {banners.left?.img && banners.left.href && (
        <a
          href={banners.left.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${bannerClass} left-4`}
          aria-label="Publicidad"
        >
          <img
            src={banners.left.img}
            alt="Publicidad"
            className="w-full rounded-lg border-2 border-[#654321] shadow-[0_8px_20px_rgba(0,0,0,0.5)]"
          />
        </a>
      )}

      {banners.right?.img && banners.right.href && (
        <a
          href={banners.right.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${bannerClass} right-4`}
          aria-label="Publicidad"
        >
          <img
            src={banners.right.img}
            alt="Publicidad"
            className="w-full rounded-lg border-2 border-[#654321] shadow-[0_8px_20px_rgba(0,0,0,0.5)]"
          />
        </a>
      )}

      {banners.mobile?.img && banners.mobile.href && (
        <div className="lg:hidden fixed bottom-4 left-4 z-40 flex items-center gap-2 bg-[#654321]/95 border-2 border-[#D4AF37] rounded-full pl-1.5 pr-2.5 py-1.5 shadow-[0_6px_16px_rgba(0,0,0,0.5)]">
          <a
            href={banners.mobile.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <img
              src={banners.mobile.img}
              alt=""
              className="w-8 h-8 rounded-full object-cover border border-[#D4AF37]"
            />
            <span className="text-[#F5DEB3] text-xs font-bold">Ofertas</span>
          </a>
          <button
            onClick={close}
            aria-label="Cerrar publicidad"
            className="text-[#D2B48C] hover:text-white text-sm leading-none px-1"
          >
            ✕
          </button>
        </div>
      )}
    </>
  );
}

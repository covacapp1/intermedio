export function IntIcon({ className = "h-5 w-5 text-[#3E2723]" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-br from-[#FFD700] via-[#D4AF37] to-[#8B6B00] shadow-[0_2px_6px_rgba(0,0,0,0.35)] ${className}`}
      aria-hidden="true"
    >
      <span className="font-black leading-none">I</span>
    </span>
  );
}

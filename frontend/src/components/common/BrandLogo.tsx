import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showSubtitle?: boolean;
  className?: string;
}

export const BrandLogo: React.FC<BrandLogoProps> = ({
  size = "md",
  showSubtitle = true,
  className = "",
}) => {
  const iconDimensions = {
    sm: "w-6 h-6",
    md: "w-7 h-7",
    lg: "w-8 h-8",
  }[size];

  const titleSize = {
    sm: "text-xs",
    md: "text-[15px]",
    lg: "text-base",
  }[size];

  const subtitleSize = {
    sm: "text-[8px]",
    md: "text-[9px]",
    lg: "text-[10px]",
  }[size];

  return (
    <div className={`relative flex items-center gap-2 select-none ${className}`}>
      {/* FREESTANDING LOGO EMBLEM (Matches Reference Picture 2) */}
      <div className={`${iconDimensions} flex items-center justify-center shrink-0`}>
        <svg viewBox="0 0 32 32" className="w-full h-full" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Left Peak - Sky Cyan */}
          <path
            d="M 4 23 L 11 9 L 16 17"
            stroke="#38bdf8"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Right Peak - Pure White */}
          <path
            d="M 16 17 L 21 9 L 28 23"
            stroke="#ffffff"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {/* TYPOGRAPHY LOCKUP */}
      <div className="flex flex-col justify-center min-w-0">
        <div className="flex items-center leading-none">
          <span className={`font-bold tracking-tight text-white ${titleSize}`}>
            <span>Himal</span>
            <span className="text-sky-400">Sanket</span>
          </span>
        </div>

        {/* Clean Monospace Subtitle */}
        {showSubtitle && (
          <div className={`mt-0.5 font-mono text-zinc-400 ${subtitleSize} tracking-[0.16em] uppercase font-medium leading-none`}>
            EARLY WARNING RADAR
          </div>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;

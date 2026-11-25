import React from 'react';

interface TopMarqueeBarProps {
  enabled: boolean;
  text: string;
}

export const TopMarqueeBar: React.FC<TopMarqueeBarProps> = ({ enabled, text }) => {
  if (!enabled || !text.trim()) return null;

  return (
    <div className="w-full h-9 bg-[#05163B] text-white overflow-hidden flex items-center border-b border-[#0A2558]">
      <div className="w-full overflow-hidden whitespace-nowrap">
        <div className="animate-marquee-rtl text-xs font-medium tracking-wide text-slate-100">
          {text}
        </div>
      </div>
    </div>
  );
};

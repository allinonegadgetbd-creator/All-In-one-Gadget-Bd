import React from 'react';
import { Phone, Mail, MessageCircle, Facebook, Instagram, Youtube } from 'lucide-react';
import { assetUrl } from '../../utils/assetUrl';
import type { SiteSettings } from '../../types';

interface FooterProps {
  settings: SiteSettings;
}

export const Footer: React.FC<FooterProps> = ({ settings }) => {
  const { socialLinks } = settings;

  const socials = [
    { label: 'Facebook', url: socialLinks.facebook, icon: Facebook },
    { label: 'Instagram', url: socialLinks.instagram, icon: Instagram },
    { label: 'YouTube', url: socialLinks.youtube, icon: Youtube },
    { label: 'WhatsApp', url: socialLinks.whatsapp, icon: MessageCircle },
  ].filter((s) => s.url && s.url.trim().length > 0);

  return (
    <footer className="bg-white border-t border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand Column */}
          <div>
            <img
              src={assetUrl('/assets/logo-header.png')}
              alt={settings.brandName}
              className="h-10 w-auto object-contain"
              referrerPolicy="no-referrer"
            />
            <p className="mt-3 text-sm text-slate-600 leading-relaxed max-w-xs">
              Budget-friendly earbuds, smartwatches, power banks, grooming tools, and smart everyday gadgets delivered nationwide across Bangladesh.
            </p>
          </div>

          {/* Contact Column */}
          <div className="space-y-2.5 text-sm">
            <div className="font-display font-bold text-[#05163B]">Customer Care</div>
            <a
              href={`tel:${settings.hotlineNumber}`}
              className="flex items-center gap-2 text-slate-600 hover:text-[#0066FF] transition-colors"
            >
              <Phone className="w-4 h-4 text-slate-400" />
              <span className="font-mono">{settings.hotlineNumber}</span>
            </a>
            <a
              href={`https://wa.me/${settings.whatsappOrderNumber.replace(/\D/g, '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-slate-600 hover:text-[#0066FF] transition-colors"
            >
              <MessageCircle className="w-4 h-4 text-slate-400" />
              <span className="font-mono">WhatsApp: +{settings.whatsappOrderNumber}</span>
            </a>
            <a
              href={`mailto:${settings.supportEmail}`}
              className="flex items-center gap-2 text-slate-600 hover:text-[#0066FF] transition-colors"
            >
              <Mail className="w-4 h-4 text-slate-400" />
              <span>{settings.supportEmail}</span>
            </a>
          </div>

          {/* Dynamic Social Links Column */}
          <div>
            <div className="font-display font-bold text-[#05163B]">Connect With Us</div>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {socials.map((item) => {
                const Icon = item.icon;
                return (
                  <a
                    key={item.label}
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={item.label}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:border-[#0066FF] hover:text-[#0066FF] transition-colors"
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </a>
                );
              })}
              {socialLinks.tiktok && (
                <a
                  href={socialLinks.tiktok}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:border-[#0066FF] hover:text-[#0066FF] transition-colors"
                >
                  TikTok
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <span>&copy; {new Date().getFullYear()} {settings.brandName}. All rights reserved.</span>
          <div className="flex items-center gap-5">
            <a href="#products" className="hover:text-slate-800">Catalog</a>
            <a href="#reviews" className="hover:text-slate-800">Reviews</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

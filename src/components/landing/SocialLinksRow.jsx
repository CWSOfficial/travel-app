import React, { useEffect, useState } from "react";
import { Youtube, Instagram, Linkedin } from "lucide-react";
import { base44 } from "@/api/base44Client";

const FacebookIcon = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M24 12a12 12 0 1 0-13.9 11.9v-8.4H7.1V12h3v-2.7c0-3 1.8-4.7 4.5-4.7 1.3 0 2.6.2 2.6.2v2.9h-1.5c-1.5 0-2 .9-2 1.9V12H17l-.5 3.5h-2.8v8.4A12 12 0 0 0 24 12z" />
  </svg>
);
const iconMap = { youtube: Youtube, instagram: Instagram, linkedin: Linkedin, facebook: FacebookIcon };
const defaults = [
  { id: 'youtube', platform_name: 'YouTube', icon_slug: 'youtube', url: 'https://www.youtube.com/@DheeVoy/shorts' },
  { id: 'instagram', platform_name: 'Instagram', icon_slug: 'instagram', url: 'https://www.instagram.com/dheevoy' },
  { id: 'linkedin', platform_name: 'LinkedIn', icon_slug: 'linkedin', url: 'https://www.linkedin.com/in/dheevoy-travel-tech-31112741a/' },
  { id: 'facebook', platform_name: 'Facebook', icon_slug: 'facebook', url: 'https://www.facebook.com/DheeVoy' },
];
const socialKeys = (link) => [link.icon_slug, link.platform_name].map((value) => String(value || '').toLowerCase().replace(/[^a-z]/g, ''));
const safeUrl = (value) => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } };

export default function SocialLinksRow() {
  const [links, setLinks] = useState(defaults);
  useEffect(() => {
    base44.entities.SocialLinks.list()
      .then((data) => {
        const active = (Array.isArray(data) ? data : []).filter((link) => link.is_active && safeUrl(link.url));
        setLinks(defaults.map((fallback) => {
          const current = active.find((link) => socialKeys(link).some((key) => key === fallback.id || key.includes(fallback.id)));
          return current ? { ...fallback, ...current, id: fallback.id, icon_slug: fallback.id, url: safeUrl(current.url) } : fallback;
        }));
      })
      .catch(() => setLinks(defaults));
  }, []);
  if (!links.length) return null;
  return (
    <div className="flex items-center gap-3">
      {links.map((link) => {
        const Icon = iconMap[link.icon_slug];
        return <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.platform_name} className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e4e9f2] bg-white text-[#3d4f70] transition-all hover:border-[#0878d1]/30 hover:bg-[#eaf7ff] hover:text-[#0878d1]"><Icon size={16} /></a>;
      })}
    </div>
  );
}

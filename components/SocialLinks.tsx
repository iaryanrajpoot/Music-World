import { Instagram, Mail, Youtube } from "lucide-react";

// Placeholder destinations — swap these hrefs for your own.
const links = [
  { href: "https://instagram.com/", label: "Instagram", Icon: Instagram },
  { href: "https://youtube.com/", label: "YouTube", Icon: Youtube },
  { href: "mailto:hello@example.com", label: "Email", Icon: Mail },
];

export default function SocialLinks() {
  return (
    <div className="flex items-center gap-1.5 rounded-full border border-white/10 bg-black/30 px-2 py-1.5 backdrop-blur-md">
      {links.map(({ href, label, Icon }) => (
        <a
          key={label}
          href={href}
          target="_blank"
          rel="noreferrer noopener"
          aria-label={label}
          className="flex h-7 w-7 items-center justify-center rounded-full text-cream/70 transition-colors hover:bg-white/10 hover:text-cream focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber"
        >
          <Icon size={15} strokeWidth={1.75} />
        </a>
      ))}
    </div>
  );
}

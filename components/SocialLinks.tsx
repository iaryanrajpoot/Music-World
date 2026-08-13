import { InstagramIcon } from "./InstagramIcon";

// Placeholder destinations — swap these hrefs for your own.
const links = [
  { href: "https://instagram.com/iaryanrajpoot", label: "Instagram", Icon: InstagramIcon },
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
          className="flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber"
        >
          <Icon className="h-[18px] w-[18px]" />
        </a>
      ))}
    </div>
  );
}
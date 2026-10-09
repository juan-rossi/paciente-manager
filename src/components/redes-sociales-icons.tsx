import type { SVGProps } from "react";
import type { RedSocial } from "@/lib/redes-sociales";

// lucide-react v1 ya no trae íconos de marcas: van a mano, con el mismo trazo
// que el resto de los íconos (stroke 2, puntas redondeadas) para que no
// desentonen al lado de los de lucide.

type IconProps = SVGProps<SVGSVGElement>;

function Base({ children, ...props }: IconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function InstagramIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </Base>
  );
}

export function FacebookIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </Base>
  );
}

export function WhatsappIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M3 21l1.65-4.8A8.5 8.5 0 1 1 7.9 19.5L3 21z" />
      <path
        d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1-1.5-1.8-1-.9.8a4 4 0 0 1-2.1-2.1l.8-.9-1-1.8L9 9.5z"
        fill="currentColor"
        strokeWidth={1}
      />
    </Base>
  );
}

export function TiktokIcon(props: IconProps) {
  return (
    <Base {...props}>
      <path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5" />
      <path d="M14 3c.5 2.6 2.4 4.4 5 4.6" />
    </Base>
  );
}

export function YoutubeIcon(props: IconProps) {
  return (
    <Base {...props}>
      <rect x="2.5" y="5.5" width="19" height="13" rx="4" />
      <path d="M10 9.5v5l4.5-2.5z" fill="currentColor" />
    </Base>
  );
}

export const RED_SOCIAL_ICONS: Record<RedSocial, (props: IconProps) => React.JSX.Element> = {
  whatsappComunidad: WhatsappIcon,
  instagram: InstagramIcon,
  facebook: FacebookIcon,
  tiktok: TiktokIcon,
  youtube: YoutubeIcon,
};

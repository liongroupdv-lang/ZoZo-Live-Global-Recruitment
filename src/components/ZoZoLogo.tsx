interface ZoZoLogoProps {
  logoUrl?: string | null;
  size?: 'sm' | 'md' | 'lg';
}

export const OFFICIAL_ZOZO_LOGO_PATH =
  '/assets/aistudio/WhatsApp_Image_2026-10-30_at_12.09.58_AM-removebg-preview_1fb62756.png';

export function ZoZoLogo({ logoUrl, size = 'md' }: ZoZoLogoProps) {
  const heightClass =
    size === 'lg' ? 'h-14 sm:h-16 w-auto' : size === 'sm' ? 'h-9 w-auto' : 'h-11 w-auto';

  return (
    <img
      src={logoUrl || OFFICIAL_ZOZO_LOGO_PATH}
      alt="ZoZo Live Official Logo"
      referrerPolicy="no-referrer"
      className={`${heightClass} object-contain shrink-0 select-none`}
    />
  );
}

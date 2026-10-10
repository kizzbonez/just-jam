import { cn } from "@/lib/cn";

export interface AvatarProps {
  name: string;
  /** Image URL, or null to fall back to initials. */
  src?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZES = { sm: "size-7 text-xs", md: "size-10 text-sm", lg: "size-20 text-2xl" };

function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words[0][0] + words[1][0] : name.trim().slice(0, 2);
  return letters.toUpperCase();
}

export function Avatar({ name, src, size = "md", className }: AvatarProps) {
  return (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-etch-hi bg-wine font-display font-semibold tracking-wide text-crimson-300",
        SIZES[size],
        className,
      )}
    >
      {src ? (
        // Avatars are small same-origin images served by an authenticated route.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <span aria-hidden>{initials(name)}</span>
      )}
    </span>
  );
}

export function avatarUrl(user: { id: string; hasAvatar: boolean; avatarVersion: number }) {
  return user.hasAvatar ? `/api/users/${user.id}/avatar?v=${user.avatarVersion}` : null;
}

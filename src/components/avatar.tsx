import { BookOpen, Coffee, Compass, Feather, Globe, GraduationCap, Landmark, Languages, Music, Scale, Star, type LucideIcon } from "lucide-react";
import { isAvatarKey, type AvatarKey } from "@/lib/avatars";

// Аватарка: значок из набора на цветном круге или инициалы. Без хуков, работает и на сервере, и в клиенте.
// Три оттенка из синей палитры чередуются, чтобы значки отличались не только рисунком.

const LOOK: Record<AvatarKey, { icon: LucideIcon; tone: string }> = {
  book: { icon: BookOpen, tone: "bg-primary text-primary-foreground" },
  globe: { icon: Globe, tone: "bg-accent text-primary" },
  scale: { icon: Scale, tone: "bg-nav text-nav-foreground" },
  cap: { icon: GraduationCap, tone: "bg-primary text-primary-foreground" },
  landmark: { icon: Landmark, tone: "bg-accent text-primary" },
  feather: { icon: Feather, tone: "bg-nav text-nav-foreground" },
  languages: { icon: Languages, tone: "bg-primary text-primary-foreground" },
  compass: { icon: Compass, tone: "bg-accent text-primary" },
  star: { icon: Star, tone: "bg-nav text-nav-foreground" },
  coffee: { icon: Coffee, tone: "bg-primary text-primary-foreground" },
  music: { icon: Music, tone: "bg-accent text-primary" },
};

/** size: класс размера круга (size-10, size-16), icon: размер значка в px. */
export function UserAvatar({ avatar, initials, size = "size-10", icon = 20, className = "" }: { avatar?: string | null; initials: string; size?: string; icon?: number; className?: string }) {
  const look = isAvatarKey(avatar) ? LOOK[avatar] : null;
  return (
    <span aria-hidden="true" className={`grid shrink-0 place-items-center rounded-full font-extrabold ${size} ${look ? look.tone : "bg-accent text-accent-foreground"} ${className}`}>
      {look ? <look.icon size={icon} strokeWidth={2.2} /> : initials}
    </span>
  );
}

import {
  CloudSun,
  Layers3,
  LogIn,
  MapPin,
  ShieldCheck,
  Smartphone,
  Sparkles,
} from "lucide-react";
import {
  BodysuitIcon,
  HatIcon,
  WardrobeIcon,
} from "@/components/icons";

const illustrations = {
  "build-your-own-outfit": Layers3,
  "layerly-on-the-app-store": Smartphone,
  "private-by-design": ShieldCheck,
  "one-tap-to-sign-in": LogIn,
  "advice-before-you-leave": CloudSun,
  "your-wardrobe-not-a-catalogue": WardrobeIcon,
  "dressing-guides-for-real-situations": HatIcon,
  "try-it-before-you-sign-up": MapPin,
  "layerly-is-live": BodysuitIcon,
} as const;

const themes = [
  "bg-blog-sage-soft text-primary",
  "bg-blog-clay-soft text-accent",
  "bg-blog-sky-soft text-blog-sky",
] as const;

export function BlogCardIllustration({ slug, index }: { slug: string; index: number }) {
  const Illustration = illustrations[slug as keyof typeof illustrations] ?? Sparkles;
  const theme = themes[index % themes.length];

  return (
    <div
      aria-hidden="true"
      className={`relative grid aspect-[4/3] place-items-center overflow-hidden rounded-xl ${theme}`}
    >
      <span className="absolute left-[12%] top-[14%] h-2 w-2 rounded-full bg-current opacity-25" />
      <span className="absolute right-[15%] top-[22%] h-3 w-3 rotate-12 rounded-sm border border-current opacity-25" />
      <span className="absolute bottom-[17%] left-[18%] h-8 w-8 rounded-full border border-current opacity-20" />
      <Illustration className="relative h-20 w-20 transition-transform duration-300 ease-out group-hover:scale-110 sm:h-24 sm:w-24" />
    </div>
  );
}
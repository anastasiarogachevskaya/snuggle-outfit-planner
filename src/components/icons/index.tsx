import type { ReactElement, ReactNode, SVGProps } from "react";
import type { WardrobeSlug } from "@/lib/wardrobe-catalog";

/**
 * Nordic-minimal SVG icon library.
 * 24×24 viewBox, currentColor stroke, ~1.75px stroke width, rounded caps/joins.
 * Icons scale with the `size` prop and inherit color via `currentColor`.
 */

export type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function Svg({ size = 24, children, ...rest }: IconProps & { children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

/* ---------- Activity / navigation ---------- */

export const HomeIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3.5 11 12 4l8.5 7" />
    <path d="M5 10v9a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1v-9" />
  </Svg>
);

export const WalkIcon = (p: IconProps) => (
  <Svg {...p}>
    {/* simple person walking */}
    <circle cx="12" cy="5" r="1.8" />
    <path d="M12 7v4" />
    <path d="M9 15l-2 4" />
    <path d="M15 15l2 4" />
    <path d="M9 11l3 3 3-3" />
  </Svg>
);

export const CarIcon = (p: IconProps) => (
  <Svg {...p}>
    {/* basic car side view */}
    <path d="M4 11h14a2 2 0 0 1 2 2v3H4v-5z" />
    <path d="M6 11V9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v2" />
    <circle cx="7.5" cy="16.5" r="1.6" />
    <circle cx="17.5" cy="16.5" r="1.6" />
  </Svg>
);

export const PlayingIcon = (p: IconProps) => (
  <Svg {...p}>
    {/* teddy bear */}
    <circle cx="7" cy="7" r="1.8" />
    <circle cx="17" cy="7" r="1.8" />
    <circle cx="12" cy="13" r="6" />
    <circle cx="10" cy="12" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="14" cy="12" r="0.6" fill="currentColor" stroke="none" />
    <path d="M10.5 15.5c.5.6 2.5.6 3 0" />
  </Svg>
);

export const SleepingIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a7 7 0 1 0 10.5 10.5Z" />
    <path d="M14 5h3l-3 3h3" />
  </Svg>
);

export const WardrobeIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4.5" y="3.5" width="15" height="17" rx="1.5" />
    <path d="M12 3.5v17" />
    <path d="M9.5 11.5v1.5" />
    <path d="M14.5 11.5v1.5" />
    <path d="M6 2.5l1 1.5M18 2.5l-1 1.5" />
  </Svg>
);

export const SettingsIcon = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="2.75" />
    <path d="M12 2.5v2.5M12 19v2.5M4.5 12H2M22 12h-2.5M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M5.6 18.4l1.8-1.8M16.6 7.4l1.8-1.8" />
  </Svg>
);

/* ---------- Clothing ---------- */

const ShirtBase = ({ sleeve, ...p }: IconProps & { sleeve: "none" | "short" | "long" }) => (
  <Svg {...p}>
    <path
      d={
        sleeve === "long"
          ? "M8 4 4.5 6 3 11l3 1v9h12v-9l3-1-1.5-5L16 4l-2 1.5a3 3 0 0 1-4 0Z"
          : sleeve === "short"
            ? "M8 4 5 6 3.5 9.5 6 11v10h12V11l2.5-1.5L19 6l-3-2-2 1.5a3 3 0 0 1-4 0Z"
            : "M9 4 6 7.5V11l1.5.5V21h9v-9.5L18 11V7.5L15 4l-1 1.5a3 3 0 0 1-4 0Z"
      }
    />
  </Svg>
);

export const BodysuitIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 4 6 7.5V11l1.5.5v6l1.5 3h6l1.5-3v-6L18 11V7.5L15 4l-1 1.5a3 3 0 0 1-4 0Z" />
    <path d="M10.5 18.5h3" />
  </Svg>
);

export const SleevelessBodysuitIcon = (p: IconProps) => <BodysuitIcon {...p} />;

export const ShortSleeveBodysuitIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 4 5 6 3.5 9.5 6 11v6.5l1.5 3h9l1.5-3V11l2.5-1.5L19 6l-3-2-2 1.5a3 3 0 0 1-4 0Z" />
    <path d="M10.5 19h3" />
  </Svg>
);

export const LongSleeveBodysuitIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 4 4.5 6 3 11l3 1v5.5l1.5 3h9l1.5-3V12l3-1-1.5-5L16 4l-2 1.5a3 3 0 0 1-4 0Z" />
    <path d="M10.5 19h3" />
  </Svg>
);

export const TshirtIcon = (p: IconProps) => <ShirtBase sleeve="short" {...p} />;
export const LongSleeveIcon = (p: IconProps) => <ShirtBase sleeve="long" {...p} />;

export const PajamasIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 3.5 5.5 6l-1 4 2.5.5V21h4v-8h2v8h4V10.5L19.5 10l-1-4L16 3.5l-1.5 1.5a3.5 3.5 0 0 1-5 0Z" />
    <path d="M8 21h3.5M12.5 21H16" />
  </Svg>
);

export const PantsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3.5h12l-.8 8L16 21h-3l-1-9-1 9H8l-1.2-9.5Z" />
    <path d="M6 3.5h12" />
  </Svg>
);

export const LeggingsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 3.5h10l-.5 7.5L15 21h-2.5l-.5-10-.5 10H9L7.5 11Z" />
  </Svg>
);

export const TightsIcon = (p: IconProps) => <LeggingsIcon {...p} />;
export const WoolLeggingsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 3.5h10l-.5 7.5L15 21h-2.5l-.5-10-.5 10H9L7.5 11Z" />
    <path d="M9 14h1M13.5 14h1M9.3 17h1M13.5 17h1" />
  </Svg>
);

export const ShortsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5.5 4.5h13l-.7 5L16 15h-3l-1-5.5-1 5.5H8L6.2 9.5Z" />
  </Svg>
);

export const SweaterIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 5 4.5 7 3 12l3 1v7h12v-7l3-1-1.5-5L16 5l-2 1.5a3 3 0 0 1-4 0Z" />
    <path d="M8.5 8h7" />
  </Svg>
);

export const FleeceIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 5 4.5 7 3 12l3 1v7h12v-7l3-1-1.5-5L16 5l-2 1.5a3 3 0 0 1-4 0Z" />
    <path d="M8 11.5c.5.5 1 .5 1.5 0s1 .5 1.5 0 1 .5 1.5 0 1 .5 1.5 0 1 .5 1.5 0" />
    <path d="M8 14c.5.5 1 .5 1.5 0s1 .5 1.5 0 1 .5 1.5 0 1 .5 1.5 0 1 .5 1.5 0" />
  </Svg>
);

export const WoolLayerIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 5 4.5 7 3 12l3 1v7h12v-7l3-1-1.5-5L16 5l-2 1.5a3 3 0 0 1-4 0Z" />
    <path d="M8 12h.01M11 12h.01M14 12h.01M17 12h.01M8 15h.01M11 15h.01M14 15h.01M17 15h.01" />
  </Svg>
);

export const CardiganIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 5 4.5 7 3 12l3 1v7h12v-7l3-1-1.5-5L16 5l-2 1.5a3 3 0 0 1-4 0Z" />
    <path d="M12 6v14" />
    <circle cx="12" cy="10" r=".5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="13" r=".5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="16" r=".5" fill="currentColor" stroke="none" />
  </Svg>
);

export const HoodieIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 6 4.5 8 3 13l3 1v6h12v-6l3-1-1.5-5L16 6" />
    <path d="M8 6c.5-2 2-3 4-3s3.5 1 4 3" />
    <path d="M10 8.5c.5 1 3.5 1 4 0" />
    <path d="M11 13v2M13 13v2" />
  </Svg>
);

export const JacketIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 4.5 4.5 7 3 12l3 1v7.5h12V13l3-1-1.5-5L16 4.5 12 6Z" />
    <path d="M12 6v14.5" />
    <path d="M6.5 10.5v2M17.5 10.5v2" />
  </Svg>
);

export const RainOverallIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 6 5 8v13h4v-9h6v9h4V8l-2-2-4-2h-2Z" />
    <path d="M8 15l-.5 1M12 15l-.5 1M16 15l-.5 1" />
  </Svg>
);

export const SnowsuitIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 4.5 5 7l-1 5 2.5.5V13l-.5 8h5v-8h2v8h5l-.5-8v-.5L20 12l-1-5-3-2.5-1.5 1.5a3.5 3.5 0 0 1-5 0Z" />
    <path d="M8 21h4M12 21h4" />
  </Svg>
);

export const LightOverallIcon = (p: IconProps) => <SnowsuitIcon {...p} />;
export const FleeceOverallIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 4.5 5 7l-1 5 2.5.5V13l-.5 8h5v-8h2v8h5l-.5-8v-.5L20 12l-1-5-3-2.5-1.5 1.5a3.5 3.5 0 0 1-5 0Z" />
    <path d="M8.5 10c.5.5 1 .5 1.5 0s1 .5 1.5 0 1 .5 1.5 0 1 .5 1.5 0" />
  </Svg>
);
export const WoolOverallIcon = (p: IconProps) => <SnowsuitIcon {...p} />;
export const SoftshellOverallIcon = (p: IconProps) => <SnowsuitIcon {...p} />;
export const WinterOverallIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 4.5 5 7l-1 5 2.5.5V13l-.5 8h5v-8h2v8h5l-.5-8v-.5L20 12l-1-5-3-2.5-1.5 1.5a3.5 3.5 0 0 1-5 0Z" />
    <path d="M12 9v2M10.5 10l3 0M10.5 10.5l3-1M10.5 9.5l3 1" />
  </Svg>
);

export const SnowPantsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 3.5h12l-.8 8L16 21h-3l-1-9-1 9H8l-1.2-9.5Z" />
    <path d="M9 14h.01M12 14h.01M15 14h.01" />
  </Svg>
);

export const HatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 15c0-4 3-7 7-7s7 3 7 7" />
    <path d="M4 15h16" />
    <path d="M12 8V5" />
  </Svg>
);
export const ThinHatIcon = HatIcon;
export const WarmHatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 15c0-4 3-7 7-7s7 3 7 7" />
    <path d="M4 15h16" />
    <path d="M4 17h16" />
    <circle cx="12" cy="6" r="1.2" />
  </Svg>
);

export const SunHatIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 15c2-1 6-1.5 9-1.5s7 .5 9 1.5" />
    <path d="M7.5 14c0-3 2-6 4.5-6s4.5 3 4.5 6" />
    <path d="M8 11.5h8" />
  </Svg>
);

export const BalaclavaIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 12c0-4 2.5-7 6-7s6 3 6 7v3l-2 3h-8l-2-3Z" />
    <ellipse cx="12" cy="12.5" rx="3" ry="1.8" />
  </Svg>
);

export const MittensIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 20V10a2 2 0 0 1 4 0v5l2-1v-1a1 1 0 0 1 2 0v3l-2 4Z" />
    <path d="M5 17h6" />
  </Svg>
);

export const SocksIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M9 3v9l-4 4a2.5 2.5 0 0 0 0 3.5l1.5 1.5a2.5 2.5 0 0 0 3.5 0l6.5-6.5a3 3 0 0 0 .5-3.5L15 8V3Z" />
    <path d="M9 8h6" />
  </Svg>
);
export const WoolSocksIcon = SocksIcon;

export const BootiesIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 18v-6a4 4 0 0 1 4-4h4v6h6a2 2 0 0 1 2 2v2Z" />
    <path d="M4 18h16" />
  </Svg>
);
export const WinterBootsIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 20V6a2 2 0 0 1 4 0v8h6a2 2 0 0 1 2 2v4Z" />
    <path d="M6 18h12" />
    <path d="M8 8h.01M8 11h.01M8 14h.01" />
  </Svg>
);

export const NeckWarmerIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 6c1 3 9 3 10 0" />
    <path d="M6 8c1 4 11 4 12 0" />
    <path d="M6.5 8v5l1.5 5h2l1-3-1-2M17.5 8v5l-1.5 5h-2l-1-3 1-2" />
  </Svg>
);

export const SleepSackIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 5h10v3l-1 1v11H8V9L7 8Z" />
    <path d="M9.5 5c0-1 1-1.5 2.5-1.5s2.5.5 2.5 1.5" />
    <path d="M9 12h6" />
  </Svg>
);
export const SleepSackLightIcon = SleepSackIcon;
export const SleepSackWarmIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 5h10v3l-1 1v11H8V9L7 8Z" />
    <path d="M9.5 5c0-1 1-1.5 2.5-1.5s2.5.5 2.5 1.5" />
    <path d="M9 11c.5.5 1 .5 1.5 0s1 .5 1.5 0 1 .5 1.5 0 1 .5 1.5 0" />
    <path d="M9 14c.5.5 1 .5 1.5 0s1 .5 1.5 0 1 .5 1.5 0 1 .5 1.5 0" />
  </Svg>
);

export const SwaddleIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 6l7-2 7 2-2 14H7Z" />
    <path d="M8.5 10c1 2 6 2 7 0" />
    <path d="M8 14l8 3M8 17l8-3" />
  </Svg>
);

export const StrollerIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h3l3 8h9" />
    <path d="M10 14c2-6 6-8 9-8v6c-2 0-4 1-5 2" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="17" cy="18" r="1.5" />
  </Svg>
);

export const PramIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 8h3l2 8h11" />
    <path d="M8 16c0-6 4-9 10-9v9" />
    <path d="M8 12h10" />
    <circle cx="10" cy="19" r="1.5" />
    <circle cx="17" cy="19" r="1.5" />
  </Svg>
);

export const FootmuffIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 5h12v3l-1 12H7L6 8Z" />
    <path d="M6.5 9h11" />
    <path d="M9 13c.5.5 1 .5 1.5 0s1 .5 1.5 0 1 .5 1.5 0 1 .5 1.5 0" />
  </Svg>
);

export const BlanketIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16v11l-2 2H6l-2-2Z" />
    <path d="M4 9h16M4 12h16M4 15h16" />
    <path d="M8 6v13M12 6v13M16 6v13" />
  </Svg>
);

export const RainCoverIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 0 1 18 0Z" />
    <path d="M12 12v6a2 2 0 0 0 4 0" />
    <path d="M7 15l-1 2M12 16l-1 2M17 15l-1 2" />
  </Svg>
);

export const BabyCarrierIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M8 4c0 1.5 1.5 2.5 4 2.5s4-1 4-2.5" />
    <path d="M6 6l6 3 6-3" />
    <path d="M7 6v4a5 5 0 0 0 10 0V6" />
    <circle cx="12" cy="13" r="2.5" />
    <path d="M9 20l1-3M15 20l-1-3" />
  </Svg>
);

export const BabywearingCoverIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M5 6 3 11l3 1v9h12v-9l3-1-2-5-4-2v3a3 3 0 0 1-6 0V4Z" />
    <circle cx="12" cy="14" r="2" />
  </Svg>
);

export const CarSeatBlanketIcon = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 4h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-6l-4 3V6a2 2 0 0 1 0-2Z" />
    <path d="M9 9h6M9 12h6M9 15h4" />
  </Svg>
);

/* ---------- Data-driven mapping ---------- */

export const iconMap: Record<WardrobeSlug, (p: IconProps) => ReactElement> = {
  sleeveless_bodysuit: SleevelessBodysuitIcon,
  short_sleeve_bodysuit: ShortSleeveBodysuitIcon,
  long_sleeve_bodysuit: LongSleeveBodysuitIcon,
  pajamas: PajamasIcon,
  pants: PantsIcon,
  leggings: LeggingsIcon,
  tights: TightsIcon,
  wool_leggings: WoolLeggingsIcon,
  shorts: ShortsIcon,
  sweater: SweaterIcon,
  fleece_layer: FleeceIcon,
  wool_layer: WoolLayerIcon,
  cardigan: CardiganIcon,
  hoodie: HoodieIcon,
  light_overall: LightOverallIcon,
  fleece_overall: FleeceOverallIcon,
  wool_overall: WoolOverallIcon,
  softshell_overall: SoftshellOverallIcon,
  rain_overall: RainOverallIcon,
  winter_overall: WinterOverallIcon,
  jacket: JacketIcon,
  snow_pants: SnowPantsIcon,
  thin_hat: ThinHatIcon,
  warm_hat: WarmHatIcon,
  sun_hat: SunHatIcon,
  balaclava: BalaclavaIcon,
  mittens: MittensIcon,
  wool_socks: WoolSocksIcon,
  booties: BootiesIcon,
  winter_boots: WinterBootsIcon,
  neck_warmer: NeckWarmerIcon,
  sleep_sack_light: SleepSackLightIcon,
  sleep_sack_warm: SleepSackWarmIcon,
  swaddle: SwaddleIcon,
  stroller: StrollerIcon,
  footmuff: FootmuffIcon,
  blanket: BlanketIcon,
  rain_cover: RainCoverIcon,
  baby_carrier: BabyCarrierIcon,
  babywearing_cover: BabywearingCoverIcon,
  car_seat_blanket: CarSeatBlanketIcon,
};

export function ClothingIcon({ slug, ...p }: IconProps & { slug: WardrobeSlug }) {
  const Cmp = iconMap[slug] ?? TshirtIcon;
  return <Cmp {...p} />;
}

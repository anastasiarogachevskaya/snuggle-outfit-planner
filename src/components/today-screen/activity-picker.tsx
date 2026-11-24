import { type Situation, type TransportMode, type HomeActivity } from "@/lib/recommend";
import { HomeIcon, WalkIcon, CarIcon, PlayingIcon, SleepingIcon } from "@/components/icons";
import { selectionHaptic } from "@/lib/haptics";

const situationOptions: {
  id: Situation;
  Icon: typeof HomeIcon;
  label: string;
  description: string;
}[] = [
  { id: "home", Icon: HomeIcon, label: "Home", description: "Indoors" },
  { id: "walk", Icon: WalkIcon, label: "Walk", description: "Outside" },
  { id: "car", Icon: CarIcon, label: "Car", description: "In the car" },
];

import { useTempUnit } from "@/hooks/use-temp-unit";
import { formatTemp, roomTemperatureRange, roomTemperatureToC, toUnit } from "@/lib/units";
import { localizeClothingText } from "@/lib/clothing-text";
import type {
  GroundCondition,
  OutdoorActivity,
  OutingMovement,
  OutingTransport,
} from "@/lib/outing-context";

export type ToddlerOutingControls = {
  movement: OutingMovement | undefined;
  onMovementChange: (v: OutingMovement | undefined) => void;
  transport: OutingTransport;
  onTransportChange: (v: OutingTransport) => void;
  activity: OutdoorActivity | undefined;
  onActivityChange: (v: OutdoorActivity | undefined) => void;
  ground: GroundCondition | undefined;
  onGroundChange: (v: GroundCondition | undefined) => void;
};

const MOVEMENT_OPTIONS: { id: OutingMovement | undefined; label: string }[] = [
  { id: undefined, label: "Not sure" },
  { id: "seated", label: "Sitting / being carried" },
  { id: "walking", label: "Gentle walking" },
  { id: "active", label: "Active play" },
  { id: "mixed", label: "Mixed walking and riding" },
];
const ACTIVITY_OPTIONS: { id: OutdoorActivity; label: string }[] = [
  { id: "stroll", label: "Stroll" },
  { id: "playground", label: "Playground" },
  { id: "wet_play", label: "Wet play" },
  { id: "snow_play", label: "Snow play" },
];
const GROUND_OPTIONS: { id: GroundCondition | undefined; label: string }[] = [
  { id: undefined, label: "Not sure" },
  { id: "dry", label: "Dry" },
  { id: "wet", label: "Wet" },
  { id: "snow", label: "Snow" },
];

const chipClass = (on: boolean) =>
  "min-h-11 px-3 py-2 rounded-xl text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary " +
  (on ? "bg-primary/15 text-primary font-medium" : "bg-canvas text-ink/70");

function ChoiceGroup<T>({
  label,
  hint,
  options,
  value,
  onChange,
  cols,
}: {
  label: string;
  hint?: string;
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  cols: string;
}) {
  return (
    <div role="group" aria-label={label}>
      <p className="text-sm text-ink/70 mb-2">
        {label}
        {hint && <span className="ml-1 text-xs text-ink/50">{hint}</span>}
      </p>
      <div className={"grid gap-2 " + cols}>
        {options.map((o) => (
          <button
            key={String(o.id ?? "unsure")}
            type="button"
            onClick={() => onChange(o.id)}
            aria-pressed={value === o.id}
            className={chipClass(value === o.id)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function ActivityPicker({
  situation,
  onSituationChange,
  pramAllowed,
  transportMode,
  onTransportModeChange,
  duration,
  onDurationChange,
  homeActivity,
  onHomeActivityChange,
  roomTemp,
  onRoomTempChange,
  toddlerOuting,
}: {
  situation: Situation;
  onSituationChange: (s: Situation) => void;
  pramAllowed: boolean;
  transportMode: TransportMode;
  onTransportModeChange: (m: TransportMode) => void;
  duration: 30 | 60 | 90;
  onDurationChange: (d: 30 | 60 | 90) => void;
  homeActivity: HomeActivity;
  onHomeActivityChange: (a: HomeActivity) => void;
  roomTemp: number;
  onRoomTempChange: (t: number) => void;
  /** Toddler outdoor controls (T17); omitted for infants and switch-off. */
  toddlerOuting?: ToddlerOutingControls;
}) {
  const [unit] = useTempUnit();
  const transportOptions: { id: TransportMode; label: string }[] = [
    ...(pramAllowed ? [{ id: "pram" as TransportMode, label: "Pram" }] : []),
    { id: "sitting-stroller", label: "Stroller" },
    { id: "carrier", label: "Carrier" },
  ];

  return (
    <>
      <section className="mb-8">
        <p className="text-xs font-serif font-medium uppercase tracking-widest text-ink/60 mb-4">
          Today's activity
        </p>
        <div className="grid grid-cols-3 gap-3">
          {situationOptions.map((s) => (
            <button
              key={s.id}
              onClick={() => onSituationChange(s.id)}
              aria-pressed={situation === s.id}
              className={
                "flex flex-col items-center gap-1.5 py-5 px-2 rounded-2xl transition-all " +
                (situation === s.id
                  ? "bg-activity-selected text-activity-selected-foreground border-2 border-activity-selected-border shadow-sm shadow-activity-selected-shadow/25 scale-[1.02]"
                  : "bg-surface border border-black/5 hover:bg-canvas text-ink/70")
              }
            >
              <span className={situation === s.id ? "" : "opacity-70"}>
                <s.Icon size={28} strokeWidth={situation === s.id ? 2 : 1.75} />
              </span>
              <span
                className={
                  "text-sm font-sans " + (situation === s.id ? "font-bold" : "font-medium")
                }
              >
                {s.label}
              </span>
              <span
                className={
                  "text-[10px] leading-tight " +
                  (situation === s.id ? "text-activity-selected-foreground/80" : "text-ink/60")
                }
              >
                {s.description}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="mb-10 bg-surface/60 rounded-2xl p-5 border border-black/5">
        {situation === "home" && (
          <div className="space-y-4">
            <div>
              <p className="text-sm text-ink/70 mb-2">What will baby be doing?</p>
              <div className="grid grid-cols-2 gap-2">
                {(["playing", "sleeping"] as HomeActivity[]).map((a) => (
                  <button
                    key={a}
                    onClick={() => onHomeActivityChange(a)}
                    aria-pressed={homeActivity === a}
                    className={
                      "min-h-11 py-2 rounded-xl text-sm capitalize inline-flex items-center justify-center gap-2 " +
                      (homeActivity === a
                        ? "bg-primary/15 text-primary font-medium"
                        : "bg-canvas text-ink/70")
                    }
                  >
                    {a === "playing" ? <PlayingIcon size={18} /> : <SleepingIcon size={18} />}
                    {a === "playing" ? "Playing" : "Sleeping"}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-ink/70">Room temperature</span>
                <span className="font-medium">{formatTemp(roomTemp, unit, { suffix: true })}</span>
              </div>
              <input
                type="range"
                aria-label="Room temperature"
                {...roomTemperatureRange(unit)}
                value={toUnit(roomTemp, unit)}
                onChange={(e) => onRoomTempChange(roomTemperatureToC(Number(e.target.value), unit))}
                onPointerUp={() => selectionHaptic()}
                onKeyUp={() => selectionHaptic()}
                className="w-full accent-primary"
              />
            </label>
          </div>
        )}
        {situation === "walk" && (
          <div className="space-y-4">
            {toddlerOuting ? (
              <>
                <ChoiceGroup
                  label="How will they move?"
                  options={MOVEMENT_OPTIONS}
                  value={toddlerOuting.movement}
                  onChange={toddlerOuting.onMovementChange}
                  cols="grid-cols-2"
                />
                <ChoiceGroup
                  label="Transport"
                  options={[
                    ...transportOptions.map((m) => ({
                      id: m.id as OutingTransport,
                      label: localizeClothingText(m.label, unit),
                    })),
                    { id: "none" as OutingTransport, label: "No transport" },
                  ]}
                  value={toddlerOuting.transport}
                  onChange={toddlerOuting.onTransportChange}
                  cols={transportOptions.length === 3 ? "grid-cols-2" : "grid-cols-3"}
                />
                <ChoiceGroup
                  label="Activity"
                  hint="(optional, tap again to clear)"
                  options={ACTIVITY_OPTIONS}
                  value={toddlerOuting.activity}
                  onChange={(v) =>
                    toddlerOuting.onActivityChange(toddlerOuting.activity === v ? undefined : v)
                  }
                  cols="grid-cols-2"
                />
                <ChoiceGroup
                  label="Ground"
                  options={GROUND_OPTIONS}
                  value={toddlerOuting.ground}
                  onChange={toddlerOuting.onGroundChange}
                  cols="grid-cols-2 sm:grid-cols-4"
                />
              </>
            ) : (
              <div>
                <p className="text-sm text-ink/70 mb-2">How will baby travel?</p>
                <div
                  className={
                    "grid gap-2 " + (transportOptions.length === 3 ? "grid-cols-3" : "grid-cols-2")
                  }
                >
                  {transportOptions.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => onTransportModeChange(m.id)}
                      aria-pressed={transportMode === m.id}
                      className={
                        "min-h-11 py-2 rounded-xl text-sm " +
                        (transportMode === m.id
                          ? "bg-primary/15 text-primary font-medium"
                          : "bg-canvas text-ink/70")
                      }
                    >
                      {localizeClothingText(m.label, unit)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-sm text-ink/70 mb-2">Duration</p>
              <div className="grid grid-cols-3 gap-2">
                {[30, 60, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => onDurationChange(d as 30 | 60 | 90)}
                    aria-pressed={duration === d}
                    className={
                      "min-h-11 py-2 rounded-xl text-sm " +
                      (duration === d
                        ? "bg-primary/15 text-primary font-medium"
                        : "bg-canvas text-ink/70")
                    }
                  >
                    {d === 90 ? "60+ min" : `${d} min`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {situation === "car" && (
          <div>
            <p className="text-sm text-ink/70 mb-2">Trip duration</p>
            <div className="grid grid-cols-3 gap-2">
              {[30, 60, 90].map((d) => (
                <button
                  key={d}
                  onClick={() => onDurationChange(d as 30 | 60 | 90)}
                  aria-pressed={duration === d}
                  className={
                    "min-h-11 py-2 rounded-xl text-sm " +
                    (duration === d
                      ? "bg-primary/15 text-primary font-medium"
                      : "bg-canvas text-ink/70")
                  }
                >
                  {d === 90 ? "60+ min" : `${d} min`}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

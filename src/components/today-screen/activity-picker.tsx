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
}) {
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
                    className={
                      "py-2 rounded-xl text-sm capitalize inline-flex items-center justify-center gap-2 " +
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
                <span className="font-medium">{roomTemp}°C</span>
              </div>
              <input
                type="range"
                min={15}
                max={30}
                value={roomTemp}
                onChange={(e) => onRoomTempChange(Number(e.target.value))}
                onPointerUp={() => selectionHaptic()}
                onKeyUp={() => selectionHaptic()}
                className="w-full accent-primary"
              />
            </label>
          </div>
        )}
        {situation === "walk" && (
          <div className="space-y-4">
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
                    className={
                      "py-2 rounded-xl text-sm " +
                      (transportMode === m.id
                        ? "bg-primary/15 text-primary font-medium"
                        : "bg-canvas text-ink/70")
                    }
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-sm text-ink/70 mb-2">Duration</p>
              <div className="grid grid-cols-3 gap-2">
                {[30, 60, 90].map((d) => (
                  <button
                    key={d}
                    onClick={() => onDurationChange(d as 30 | 60 | 90)}
                    className={
                      "py-2 rounded-xl text-sm " +
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
                  className={
                    "py-2 rounded-xl text-sm " +
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

import { lightHaptic } from "@/lib/haptics";

export function FeedbackPanel({
  babyName,
  feedbackPending,
  confirmation,
  onFeedback,
}: {
  babyName: string;
  feedbackPending: boolean;
  confirmation: null | "cold" | "comfortable" | "warm";
  onFeedback: (rating: "cold" | "comfortable" | "warm") => void;
}) {
  return (
    <section className="bg-accent/5 rounded-3xl p-6 border border-accent/10">
      <h3 className="text-center font-serif text-lg mb-1">How was today's outfit?</h3>
      <p className="text-center text-xs text-ink/50 mb-4">
        Your feedback helps Layerly learn what works for {babyName}.
      </p>
      <div className="grid grid-cols-3 items-start gap-2">
        <FeedbackBtn
          emoji="🥶"
          label="Too cold"
          disabled={feedbackPending}
          onClick={() => {
            lightHaptic();
            onFeedback("cold");
          }}
        />
        <FeedbackBtn
          emoji="😊"
          label="Just right"
          primary
          disabled={feedbackPending}
          onClick={() => {
            lightHaptic();
            onFeedback("comfortable");
          }}
        />
        <FeedbackBtn
          emoji="🥵"
          label="Too warm"
          disabled={feedbackPending}
          onClick={() => {
            lightHaptic();
            onFeedback("warm");
          }}
        />
      </div>
      {confirmation && (
        <div className="mt-4 rounded-2xl bg-white/70 border border-accent/20 px-4 py-3 text-center text-sm text-ink/80 animate-in fade-in">
          {confirmation === "comfortable" &&
            "😊 Thanks! We'll remember this recommendation worked well."}
          {confirmation === "cold" &&
            "🥶 Thanks! We'll make future recommendations slightly warmer."}
          {confirmation === "warm" &&
            "🥵 Thanks! We'll make future recommendations slightly lighter."}
        </div>
      )}
    </section>
  );
}

function FeedbackBtn({
  emoji,
  label,
  primary,
  disabled,
  onClick,
}: {
  emoji: string;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="min-w-0 flex flex-col items-center gap-2 group disabled:opacity-50"
    >
      <div
        className={
          "rounded-full bg-white border flex items-center justify-center group-active:scale-95 transition-transform shadow-sm " +
          (primary ? "size-14 border-2 border-primary shadow-md" : "size-12 border-black/5")
        }
      >
        <span className="text-xl">{emoji}</span>
      </div>
      <span
        className={
          "max-w-full text-center text-[10px] uppercase tracking-tighter " +
          (primary ? "font-bold text-primary" : "font-medium")
        }
      >
        {label}
      </span>
    </button>
  );
}

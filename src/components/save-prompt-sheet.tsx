import { useNavigate } from "@tanstack/react-router";

export type SavePromptKind = "wardrobe" | "feedback" | "profile" | null;

const COPY: Record<
  Exclude<SavePromptKind, null>,
  { title: string; body: string }
> = {
  wardrobe: {
    title: "Want recommendations based on your actual wardrobe?",
    body: "Create a free account to save your wardrobe.",
  },
  feedback: {
    title: "Help Layerly learn what works for your baby.",
    body: "Create a free account to save your feedback and personalize future recommendations.",
  },
  profile: {
    title: "Save your baby's profile",
    body: "Create a free account to save your baby's profile.",
  },
};

export function SavePromptSheet({
  kind,
  onClose,
}: {
  kind: SavePromptKind;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  if (!kind) return null;
  const copy = COPY[kind];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 px-4 pb-[calc(1rem+var(--safe-area-bottom,0px))]">
      <button className="absolute inset-0 cursor-default" aria-label="Close" onClick={onClose} />
      <div className="relative w-full max-w-md rounded-[28px] border border-black/5 bg-surface p-6 shadow-lg">
        <p className="mb-2 text-2xl">❤️</p>
        <h2 className="font-serif text-xl font-semibold text-ink">{copy.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-ink/60">{copy.body}</p>
        <div className="mt-6 space-y-3">
          <button
            onClick={() => navigate({ to: "/auth" })}
            className="w-full rounded-2xl bg-primary py-4 font-medium text-primary-foreground shadow-md shadow-primary/20"
          >
            Create account
          </button>
          <button onClick={onClose} className="w-full py-2 text-sm text-ink/50">
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}

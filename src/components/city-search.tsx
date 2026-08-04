import { useEffect, useId, useRef, useState } from "react";

export type CityPlace = {
  latitude: number;
  longitude: number;
  label: string;
};

type Hit = {
  id: number;
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
};

function formatSecondary(hit: Hit) {
  return [hit.admin1, hit.country].filter(Boolean).join(", ");
}

export function cityLabel(hit: { name: string; country?: string }) {
  return hit.country ? `${hit.name}, ${hit.country}` : hit.name;
}

export function CitySearch({
  value,
  onChange,
  onSelect,
  placeholder = "Search for a city",
  autoFocus,
  inputClassName = "w-full rounded-2xl border border-black/10 bg-surface px-4 py-3 text-base text-ink",
}: {
  value: string;
  onChange: (v: string) => void;
  onSelect: (place: CityPlace) => void;
  placeholder?: string;
  autoFocus?: boolean;
  inputClassName?: string;
}) {
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<Hit[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "empty" | "error">("idle");
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState(value);
  const skipNext = useRef(false);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setStatus("idle");
      setOpen(false);
      return;
    }
    const controller = new AbortController();
    setStatus("loading");
    setOpen(true);
    const t = setTimeout(async () => {
      try {
        const r = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=5&language=en&format=json`,
          { signal: controller.signal },
        );
        if (!r.ok) throw new Error("lookup failed");
        const j = await r.json();
        const results: Hit[] = Array.isArray(j?.results) ? j.results : [];
        setHits(results);
        setActive(0);
        setStatus(results.length ? "idle" : "empty");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setHits([]);
        setStatus("error");
      }
    }, 250);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [query]);

  const pick = (hit: Hit) => {
    const label = cityLabel(hit);
    skipNext.current = true;
    setQuery(label);
    onChange(label);
    setHits([]);
    setOpen(false);
    setStatus("idle");
    onSelect({ latitude: hit.latitude, longitude: hit.longitude, label });
  };

  const retry = () => {
    const q = query;
    setQuery("");
    setTimeout(() => setQuery(q), 0);
  };

  return (
    <div className="relative">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && hits.length ? `${listId}-${active}` : undefined}
        autoComplete="off"
        enterKeyHint="search"
        value={query}
        placeholder={placeholder}
        onChange={(e) => {
          setQuery(e.target.value);
          onChange(e.target.value);
        }}
        onFocus={() => {
          if (hits.length) setOpen(true);
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (!open || !hits.length) return;
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive((a) => (a + 1) % hits.length);
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setActive((a) => (a - 1 + hits.length) % hits.length);
          } else if (e.key === "Enter") {
            e.preventDefault();
            pick(hits[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className={inputClassName}
      />
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border border-black/10 bg-surface shadow-lg">
          {status === "loading" && hits.length === 0 && (
            <p className="px-4 py-3 text-sm text-ink/50">Searching…</p>
          )}
          {status === "empty" && (
            <p className="px-4 py-3 text-sm text-ink/50">No places found for “{query.trim()}”.</p>
          )}
          {status === "error" && (
            <div className="flex items-center justify-between px-4 py-3">
              <p className="text-sm text-ink/50">Couldn’t search right now.</p>
              <button
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={retry}
                className="text-sm font-medium text-primary"
              >
                Retry
              </button>
            </div>
          )}
          {hits.length > 0 && (
            <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto">
              {hits.map((hit, i) => (
                <li key={`${hit.id}-${i}`}>
                  <button
                    type="button"
                    id={`${listId}-${i}`}
                    role="option"
                    aria-selected={i === active}
                    onMouseDown={(e) => e.preventDefault()}
                    onMouseEnter={() => setActive(i)}
                    onClick={() => pick(hit)}
                    className={`flex w-full flex-col items-start gap-0.5 px-4 py-3 text-left ${
                      i === active ? "bg-primary/10" : ""
                    }`}
                  >
                    <span className="text-sm font-medium text-ink">{hit.name}</span>
                    {formatSecondary(hit) && (
                      <span className="text-xs text-ink/50">{formatSecondary(hit)}</span>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

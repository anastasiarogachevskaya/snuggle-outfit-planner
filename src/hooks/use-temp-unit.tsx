import { useEffect, useState } from "react";
import { defaultUnitFromLocale, type TempUnit } from "@/lib/units";
import { logEvent } from "@/lib/analytics";

const KEY = "layerly:temp-unit";
const EVT = "layerly:temp-unit-change";

function read(): TempUnit {
  const stored = window.localStorage.getItem(KEY);
  if (stored === "C" || stored === "F") return stored;
  return defaultUnitFromLocale(navigator.language);
}

let syncedFromAccount = false;

async function syncFromAccount() {
  if (syncedFromAccount) return;
  syncedFromAccount = true;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id;
    if (!uid) return;
    const { data } = await supabase.from("profiles").select("temp_unit").eq("id", uid).maybeSingle();
    const saved = data?.temp_unit;
    if ((saved === "C" || saved === "F") && saved !== window.localStorage.getItem(KEY)) {
      window.localStorage.setItem(KEY, saved);
      window.dispatchEvent(new Event(EVT));
    }
  } catch {
    syncedFromAccount = false;
  }
}

async function saveToAccount(u: TempUnit) {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data: s } = await supabase.auth.getSession();
    const uid = s.session?.user.id;
    if (!uid) return;
    await supabase.from("profiles").update({ temp_unit: u }).eq("id", uid);
  } catch {
    /* stays saved on this device */
  }
}

export function useTempUnit(): [TempUnit, (u: TempUnit) => void] {
  const [unit, setUnitState] = useState<TempUnit>("C");
  useEffect(() => {
    setUnitState(read());
    void syncFromAccount();
    const sync = () => setUnitState(read());
    window.addEventListener(EVT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);
  const setUnit = (u: TempUnit) => {
    window.localStorage.setItem(KEY, u);
    window.dispatchEvent(new Event(EVT));
    void saveToAccount(u);
    void logEvent("units_changed", { unit: u });
  };
  return [unit, setUnit];
}

export function TempUnitToggle() {
  const [unit, setUnit] = useTempUnit();
  return (
    <div className="flex w-full items-center justify-between rounded-2xl border border-black/5 bg-surface px-5 py-4">
      <div>
        <p className="font-medium">Temperature units</p>
        <p className="mt-1 text-xs text-ink/50">Wind shows in mph with °F.</p>
      </div>
      <div className="flex rounded-xl bg-canvas p-1" role="group" aria-label="Temperature units">
        {(["C", "F"] as TempUnit[]).map((u) => (
          <button
            key={u}
            type="button"
            aria-pressed={unit === u}
            onClick={() => setUnit(u)}
            className={
              "min-h-9 min-w-11 rounded-lg px-3 text-sm " +
              (unit === u ? "bg-primary text-primary-foreground font-medium" : "text-ink/70")
            }
          >
            °{u}
          </button>
        ))}
      </div>
    </div>
  );
}

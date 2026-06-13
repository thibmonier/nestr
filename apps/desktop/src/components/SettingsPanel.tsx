import { useState } from "react";
import type { AvailabilityWindow, PlanningPreferences } from "@nestr/core";

const DAYS: { idx: number; label: string }[] = [
  { idx: 1, label: "Lundi" },
  { idx: 2, label: "Mardi" },
  { idx: 3, label: "Mercredi" },
  { idx: 4, label: "Jeudi" },
  { idx: 5, label: "Vendredi" },
  { idx: 6, label: "Samedi" },
  { idx: 0, label: "Dimanche" },
];

export function SettingsPanel({
  prefs,
  onChange,
  onClose,
}: {
  prefs: PlanningPreferences;
  onChange: (p: PlanningPreferences) => void;
  onClose: () => void;
}) {
  const [newContext, setNewContext] = useState("");

  function update(patch: Partial<PlanningPreferences>) {
    onChange({ ...prefs, ...patch });
  }

  function setDayWindows(day: number, windows: AvailabilityWindow[]) {
    const availability = prefs.availability.map((w, i) =>
      i === day ? windows : w,
    );
    update({ availability });
  }

  function addContext() {
    const c = newContext.trim().toLowerCase();
    if (!c || prefs.contexts.includes(c)) return;
    update({ contexts: [...prefs.contexts, c] });
    setNewContext("");
  }

  function removeContext(c: string) {
    update({
      contexts: prefs.contexts.filter((x) => x !== c),
      // retire ce contexte des fenêtres
      availability: prefs.availability.map((day) =>
        day.map((w) => ({
          ...w,
          contexts: w.contexts.filter((x) => x !== c),
        })),
      ),
    });
  }

  function copyWeekdayToAll(day: number) {
    const src = prefs.availability[day] ?? [];
    const availability = prefs.availability.map((w, i) =>
      i >= 1 && i <= 5 ? src.map((x) => ({ ...x })) : w,
    );
    update({ availability });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-6">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl dark:bg-slate-800">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Réglages des disponibilités</h2>
          <button
            onClick={onClose}
            className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            Fermer
          </button>
        </div>

        {/* Contextes */}
        <section className="mb-6">
          <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-400">
            Contextes
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {prefs.contexts.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-sm text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300"
              >
                {c}
                <button
                  onClick={() => removeContext(c)}
                  className="text-indigo-400 hover:text-red-500"
                  aria-label={`Supprimer ${c}`}
                >
                  ✕
                </button>
              </span>
            ))}
            <input
              value={newContext}
              onChange={(e) => setNewContext(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addContext()}
              placeholder="ajouter…"
              className="w-28 rounded-lg border border-slate-300 bg-transparent px-3 py-1 text-sm dark:border-slate-600"
            />
          </div>
        </section>

        {/* Plages par jour */}
        <section className="flex flex-col gap-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
            Plages de disponibilité
          </h3>
          {DAYS.map(({ idx, label }) => (
            <DayEditor
              key={idx}
              label={label}
              contexts={prefs.contexts}
              windows={prefs.availability[idx] ?? []}
              onChange={(w) => setDayWindows(idx, w)}
              onCopyToWeekdays={
                idx >= 1 && idx <= 5 ? () => copyWeekdayToAll(idx) : undefined
              }
            />
          ))}
        </section>
      </div>
    </div>
  );
}

function DayEditor({
  label,
  windows,
  contexts,
  onChange,
  onCopyToWeekdays,
}: {
  label: string;
  windows: AvailabilityWindow[];
  contexts: string[];
  onChange: (w: AvailabilityWindow[]) => void;
  onCopyToWeekdays?: () => void;
}) {
  function set(i: number, patch: Partial<AvailabilityWindow>) {
    onChange(windows.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  }
  function toggleCtx(i: number, c: string) {
    const w = windows[i]!;
    const has = w.contexts.includes(c);
    set(i, {
      contexts: has ? w.contexts.filter((x) => x !== c) : [...w.contexts, c],
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-semibold">{label}</span>
        <div className="flex gap-2 text-xs">
          {onCopyToWeekdays && windows.length > 0 && (
            <button
              onClick={onCopyToWeekdays}
              className="text-slate-400 hover:text-indigo-500"
            >
              Copier sur Lun–Ven
            </button>
          )}
          <button
            onClick={() =>
              onChange([
                ...windows,
                { start: "09:00", end: "12:00", contexts: [] },
              ])
            }
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            + Plage
          </button>
        </div>
      </div>

      {windows.length === 0 && (
        <p className="text-xs text-slate-400">Indisponible</p>
      )}

      <div className="flex flex-col gap-2">
        {windows.map((w, i) => (
          <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
            <input
              type="time"
              value={w.start}
              onChange={(e) => set(i, { start: e.target.value })}
              className="rounded border border-slate-300 bg-transparent px-2 py-1 dark:border-slate-600"
            />
            <span className="text-slate-400">→</span>
            <input
              type="time"
              value={w.end}
              onChange={(e) => set(i, { end: e.target.value })}
              className="rounded border border-slate-300 bg-transparent px-2 py-1 dark:border-slate-600"
            />
            <div className="flex flex-wrap gap-1">
              {contexts.map((c) => {
                const on = w.contexts.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCtx(i, c)}
                    className={`rounded-full px-2 py-0.5 text-xs font-medium transition ${
                      on
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {c}
                  </button>
                );
              })}
              {w.contexts.length === 0 && (
                <span className="self-center text-xs text-slate-400">
                  (tous)
                </span>
              )}
            </div>
            <button
              onClick={() => onChange(windows.filter((_, j) => j !== i))}
              className="text-slate-400 hover:text-red-500"
              aria-label="Supprimer la plage"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

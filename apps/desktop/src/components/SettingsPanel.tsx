import { useState, type CSSProperties } from "react";
import type { AvailabilityWindow, PlanningPreferences } from "@nestr/core";
import { Modal } from "../design/components/feedback/Modal.js";
import { Input } from "../design/components/forms/Input.js";
import { Select } from "../design/components/forms/Select.js";
import { Button } from "../design/components/forms/Button.js";
import type { AiProvider } from "../lib/auth.js";
import { IconButton } from "../design/components/forms/IconButton.js";
import { Icon } from "../design/components/foundation/Icon.js";

const DAYS: { idx: number; label: string }[] = [
  { idx: 1, label: "Lundi" },
  { idx: 2, label: "Mardi" },
  { idx: 3, label: "Mercredi" },
  { idx: 4, label: "Jeudi" },
  { idx: 5, label: "Vendredi" },
  { idx: 6, label: "Samedi" },
  { idx: 0, label: "Dimanche" },
];

/** Eyebrow de section (libellé majuscule). */
const eyebrow: CSSProperties = {
  margin: "0 0 var(--space-2)",
  fontSize: "var(--text-xs)",
  fontWeight: "var(--fw-semibold)",
  textTransform: "uppercase",
  letterSpacing: "var(--tracking-wide)",
  color: "var(--text-subtle)",
};

export function SettingsPanel({
  prefs,
  onChange,
  onClose,
  loggedIn,
  appleConnected,
  onConnectApple,
  onSignIn,
  onSignOut,
  onDeleteAccount,
  aiConfigured,
  aiProvider,
  onSaveAiKey,
}: {
  prefs: PlanningPreferences;
  onChange: (p: PlanningPreferences) => void;
  onClose: () => void;
  loggedIn: boolean;
  appleConnected: boolean;
  onConnectApple: (appleId: string, appPassword: string) => Promise<void>;
  onSignIn: () => void;
  onSignOut: () => void;
  onDeleteAccount: () => Promise<void>;
  aiConfigured: boolean;
  aiProvider: AiProvider | null;
  onSaveAiKey: (provider: AiProvider, apiKey: string) => Promise<void>;
}) {
  const [newContext, setNewContext] = useState("");
  const [aiProviderSel, setAiProviderSel] = useState<AiProvider>(aiProvider ?? "anthropic");
  const [aiKey, setAiKey] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMsg, setAiMsg] = useState<string | null>(null);

  async function submitAiKey() {
    setAiBusy(true);
    setAiMsg(null);
    try {
      await onSaveAiKey(aiProviderSel, aiKey.trim());
      setAiKey("");
      setAiMsg("Clé IA enregistrée.");
    } catch (e) {
      setAiMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setAiBusy(false);
    }
  }
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);

  async function submitDelete() {
    setDeleteBusy(true);
    try {
      await onDeleteAccount();
      onClose();
    } finally {
      setDeleteBusy(false);
    }
  }

  const [appleId, setAppleId] = useState("");
  const [applePassword, setApplePassword] = useState("");
  const [appleBusy, setAppleBusy] = useState(false);
  const [appleMsg, setAppleMsg] = useState<string | null>(null);

  async function submitApple() {
    setAppleBusy(true);
    setAppleMsg(null);
    try {
      await onConnectApple(appleId.trim(), applePassword.trim());
      setAppleId("");
      setApplePassword("");
      setAppleMsg("Calendrier Apple connecté.");
    } catch (e) {
      setAppleMsg(e instanceof Error ? e.message : String(e));
    } finally {
      setAppleBusy(false);
    }
  }

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
    <Modal title="Réglages des disponibilités" onClose={onClose} maxWidth="48rem">
      {/* Compte */}
      <section style={{ marginBottom: "var(--space-6)" }}>
        <h3 style={eyebrow}>Compte</h3>
        {loggedIn ? (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <span style={{ fontSize: "var(--text-sm)", color: "var(--text-body)" }}>Connecté à Google.</span>
            <Button variant="secondary" onClick={onSignOut}>Déconnexion</Button>
          </div>
        ) : (
          <Button variant="primary" onClick={onSignIn}>Se connecter (Google)</Button>
        )}
      </section>

      {/* Clé IA (par utilisateur) */}
      <section style={{ marginBottom: "var(--space-6)" }}>
        <h3 style={eyebrow}>Intelligence artificielle</h3>
        {!loggedIn ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>
            Connecte-toi d'abord pour enregistrer ta clé IA.
          </p>
        ) : (
          <>
            <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>
              {aiConfigured
                ? `Clé ${aiProvider === "openai" ? "OpenAI" : "Anthropic"} configurée. Saisis-en une nouvelle pour la remplacer.`
                : "Saisis ta clé API pour activer l'estimation, le découpage et les conseils."}
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "var(--space-2)" }}>
              <Select
                label="Fournisseur"
                value={aiProviderSel}
                onChange={(e) => setAiProviderSel(e.target.value as AiProvider)}
              >
                <option value="anthropic">Anthropic (Claude)</option>
                <option value="openai">OpenAI (GPT)</option>
              </Select>
              <Input
                type="password"
                value={aiKey}
                onChange={(e) => setAiKey(e.target.value)}
                placeholder={aiProviderSel === "openai" ? "sk-…" : "sk-ant-…"}
                wrapperStyle={{ flex: 1, minWidth: "14rem" }}
              />
              <Button variant="primary" onClick={submitAiKey} disabled={aiBusy || aiKey.trim().length < 8}>
                {aiBusy ? "…" : "Enregistrer"}
              </Button>
            </div>
            {aiMsg && (
              <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{aiMsg}</p>
            )}
          </>
        )}
      </section>

      {/* Contextes */}
      <section style={{ marginBottom: "var(--space-6)" }}>
        <h3 style={eyebrow}>Contextes</h3>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-2)" }}>
          {prefs.contexts.map((c) => (
            <span
              key={c}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.3rem",
                borderRadius: "var(--radius-pill)",
                padding: "0.25rem 0.6rem",
                background: "var(--accent-soft)",
                color: "var(--accent-text)",
                fontSize: "var(--text-sm)",
                fontWeight: "var(--fw-medium)",
              }}
            >
              {c}
              <button
                onClick={() => removeContext(c)}
                aria-label={`Supprimer ${c}`}
                style={{ display: "inline-flex", border: "none", background: "transparent", color: "var(--accent-text)", cursor: "pointer", padding: 0, opacity: 0.7 }}
              >
                <Icon name="x" size={12} />
              </button>
            </span>
          ))}
          <Input
            value={newContext}
            onChange={(e) => setNewContext(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addContext()}
            placeholder="ajouter…"
            wrapperStyle={{ width: "8rem" }}
          />
        </div>
      </section>

      {/* Déplacements */}
      <section style={{ marginBottom: "var(--space-6)" }}>
        <h3 style={eyebrow}>Déplacements</h3>
        <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>
          Adresses de référence pour estimer le temps de trajet vers un rendez-vous.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          <Input
            label="Domicile"
            value={prefs.locations?.home ?? ""}
            onChange={(e) => update({ locations: { ...prefs.locations, home: e.target.value } })}
            placeholder="12 rue… , Ville"
          />
          <Input
            label="Bureau"
            value={prefs.locations?.office ?? ""}
            onChange={(e) => update({ locations: { ...prefs.locations, office: e.target.value } })}
            placeholder="Adresse du bureau"
          />
          <Select
            label="App d'itinéraire"
            value={prefs.navApp?.desktop ?? "apple"}
            onChange={(e) =>
              update({
                navApp: {
                  mobile: prefs.navApp?.mobile ?? "apple",
                  desktop: e.target.value as "apple" | "google",
                },
              })
            }
          >
            <option value="apple">Apple Plans</option>
            <option value="google">Google Maps</option>
          </Select>
        </div>
      </section>

      {/* Calendrier Apple */}
      <section style={{ marginBottom: "var(--space-6)" }}>
        <h3 style={eyebrow}>Calendrier Apple (iCloud)</h3>
        {!loggedIn ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>
            Connecte-toi d'abord pour enregistrer tes identifiants.
          </p>
        ) : appleConnected ? (
          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--tag-days-fg)" }}>
            ✓ Connecté. Saisis de nouveaux identifiants pour les remplacer.
          </p>
        ) : (
          <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>
            Apple ID + un mot de passe pour application (appleid.apple.com).
          </p>
        )}
        <div style={{ marginTop: "var(--space-2)", display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "var(--space-2)" }}>
          <Input
            value={appleId}
            onChange={(e) => setAppleId(e.target.value)}
            placeholder="apple-id@email.com"
            wrapperStyle={{ flex: 1, minWidth: "12rem" }}
          />
          <Input
            type="password"
            value={applePassword}
            onChange={(e) => setApplePassword(e.target.value)}
            placeholder="xxxx-xxxx-xxxx-xxxx"
            wrapperStyle={{ flex: 1, minWidth: "12rem" }}
          />
          <Button
            variant="primary"
            onClick={submitApple}
            disabled={!loggedIn || appleBusy || !appleId || !applePassword}
          >
            {appleBusy ? "…" : "Enregistrer"}
          </Button>
        </div>
        {appleMsg && (
          <p style={{ marginTop: "var(--space-2)", fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            {appleMsg}
          </p>
        )}
      </section>

      {/* Zone danger — suppression compte */}
      {loggedIn && (
        <section style={{
          marginBottom: "var(--space-6)",
          border: "1px solid var(--tag-urgency-high-bg, #dc2626)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-3)",
        }}>
          <h3 style={{ ...eyebrow, color: "var(--tag-urgency-high-bg, #dc2626)" }}>Zone danger</h3>
          <p style={{ margin: "0 0 var(--space-2)", fontSize: "var(--text-sm)", color: "var(--text-body)" }}>
            Supprimer définitivement ton compte et toutes tes données (tâches, préférences, calendriers, clés IA).
            Cette action est irréversible.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-end", gap: "var(--space-2)" }}>
            <Input
              value={deleteConfirm}
              onChange={(e) => setDeleteConfirm(e.target.value)}
              placeholder='Tape SUPPRIMER pour confirmer'
              wrapperStyle={{ flex: 1, minWidth: "14rem" }}
            />
            <Button
              variant="secondary"
              onClick={submitDelete}
              disabled={deleteConfirm !== "SUPPRIMER" || deleteBusy}
              style={{ color: "var(--tag-urgency-high-bg, #dc2626)", borderColor: "var(--tag-urgency-high-bg, #dc2626)" }}
            >
              {deleteBusy ? "Suppression…" : "Supprimer mon compte"}
            </Button>
          </div>
        </section>
      )}

      {/* Plages par jour */}
      <section style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
        <h3 style={{ ...eyebrow, marginBottom: 0 }}>Plages de disponibilité</h3>
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
    </Modal>
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
    <div
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "var(--space-3)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-2)" }}>
        <span style={{ fontSize: "var(--text-sm)", fontWeight: "var(--fw-semibold)", color: "var(--text-body)" }}>{label}</span>
        <div style={{ display: "flex", gap: "var(--space-2)" }}>
          {onCopyToWeekdays && windows.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onCopyToWeekdays}>
              Copier sur Lun–Ven
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              onChange([...windows, { start: "09:00", end: "12:00", contexts: [] }])
            }
          >
            + Plage
          </Button>
        </div>
      </div>

      {windows.length === 0 && (
        <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}>Indisponible</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {windows.map((w, i) => (
          <div key={i} style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "var(--space-2)" }}>
            <Input type="time" value={w.start} onChange={(e) => set(i, { start: e.target.value })} />
            <span style={{ color: "var(--text-subtle)" }}>→</span>
            <Input type="time" value={w.end} onChange={(e) => set(i, { end: e.target.value })} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {contexts.map((c) => {
                const on = w.contexts.includes(c);
                return (
                  <button
                    key={c}
                    onClick={() => toggleCtx(i, c)}
                    style={{
                      border: "none",
                      borderRadius: "var(--radius-pill)",
                      padding: "0.15rem 0.55rem",
                      fontSize: "var(--text-xs)",
                      fontWeight: "var(--fw-medium)",
                      cursor: "pointer",
                      transition: "background var(--dur-base) var(--ease-standard)",
                      background: on ? "var(--accent)" : "var(--surface-sunken)",
                      color: on ? "var(--text-on-accent)" : "var(--text-muted)",
                    }}
                  >
                    {c}
                  </button>
                );
              })}
              {w.contexts.length === 0 && (
                <span style={{ alignSelf: "center", fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}>
                  (tous)
                </span>
              )}
            </div>
            <IconButton label="Supprimer la plage" onClick={() => onChange(windows.filter((_, j) => j !== i))}>
              <Icon name="x" size={14} />
            </IconButton>
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import type { Task } from "@nestr/core";
import type { SubtaskProposal } from "../lib/ai.js";
import { Modal } from "../design/components/feedback/Modal.js";
import { Input } from "../design/components/forms/Input.js";
import { IconButton } from "../design/components/forms/IconButton.js";
import { Icon } from "../design/components/foundation/Icon.js";
import { Button } from "../design/components/forms/Button.js";

export function BreakdownModal({
  task,
  proposals,
  onApply,
  onCancel,
}: {
  task: Task;
  proposals: SubtaskProposal[];
  onApply: (subtasks: SubtaskProposal[]) => void;
  onCancel: () => void;
}) {
  const [rows, setRows] = useState<SubtaskProposal[]>(proposals);

  function patch(i: number, p: Partial<SubtaskProposal>) {
    setRows((prev) => prev.map((r, j) => (j === i ? { ...r, ...p } : r)));
  }
  function remove(i: number) {
    setRows((prev) => prev.filter((_, j) => j !== i));
  }

  const total = rows.reduce((s, r) => s + (r.estimatedMinutes || 0), 0);

  const footer = (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <span style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        {rows.length} sous-tâches · {total} min au total
      </span>
      <Button variant="primary" size="lg" onClick={() => onApply(rows)} disabled={rows.length === 0}>
        Remplacer par ces sous-tâches
      </Button>
    </div>
  );

  return (
    <Modal title="Découper en sous-tâches" onClose={onCancel} footer={footer}>
      <p style={{ margin: "0 0 var(--space-4)", fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
        Proposition de l'IA pour «&nbsp;{task.title}&nbsp;». Ajuste, retire ce que
        tu ne veux pas, puis applique.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
        {rows.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <Input
              value={r.title}
              onChange={(e) => patch(i, { title: e.target.value })}
              wrapperStyle={{ flex: 1 }}
            />
            <Input
              type="number"
              min="5"
              step="5"
              value={r.estimatedMinutes}
              onChange={(e) => patch(i, { estimatedMinutes: Number(e.target.value) })}
              wrapperStyle={{ width: "5rem" }}
            />
            <span style={{ fontSize: "var(--text-xs)", color: "var(--text-subtle)" }}>min</span>
            <IconButton label="Retirer" onClick={() => remove(i)}>
              <Icon name="x" size={14} />
            </IconButton>
          </div>
        ))}
        {rows.length === 0 && (
          <p style={{ fontSize: "var(--text-sm)", color: "var(--text-subtle)" }}>Aucune sous-tâche.</p>
        )}
      </div>
    </Modal>
  );
}

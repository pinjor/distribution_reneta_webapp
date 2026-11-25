import { fireEvent, render, screen } from "@testing-library/react";
import { useMemo, useState } from "react";
import { RouterProvider, createMemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { useUnsavedDraftGuard } from "./useUnsavedDraftGuard";
import {
  SAMPLE_GIFT_LINE_FIELDS,
  captureDraftFormSnapshot,
  isDraftFormDirty,
} from "@/lib/draftFormSnapshot";
import { DraftUnsavedChangesDialog } from "@/pages/delivery/DraftUnsavedChangesDialog";

function DirtyForm() {
  const [name, setName] = useState("");
  const [left, setLeft] = useState(false);
  const [reloaded, setReloaded] = useState(false);
  const baseline = useMemo(
    () => captureDraftFormSnapshot({ recipientName: "" }, [], SAMPLE_GIFT_LINE_FIELDS),
    []
  );
  const current = captureDraftFormSnapshot({ recipientName: name }, [], SAMPLE_GIFT_LINE_FIELDS);
  const dirty = isDraftFormDirty(current, baseline);
  const guard = useUnsavedDraftGuard(dirty);

  if (left) return <p>away</p>;

  return (
    <div>
      <input aria-label="recipient" value={name} onChange={(e) => setName(e.target.value)} />
      <p>{dirty ? "dirty" : "clean"}</p>
      <button type="button" onClick={() => guard.confirmOrRun(() => setLeft(true))}>
        Leave
      </button>
      <button
        type="button"
        onClick={() => {
          guard.allowNextNavigation();
          setLeft(true);
        }}
      >
        Saved leave
      </button>
      <button type="button" onClick={() => guard.confirmOrRun(() => setReloaded(true))}>
        Reload
      </button>
      {reloaded ? <p>reloaded</p> : null}
      <DraftUnsavedChangesDialog open={guard.dialogOpen} onStay={guard.stay} onDiscard={guard.discard} />
    </div>
  );
}

function renderForm() {
  const router = createMemoryRouter([{ path: "/", element: <DirtyForm /> }]);
  render(<RouterProvider router={router} />);
}

describe("useUnsavedDraftGuard", () => {
  it("allows clean cancel without a dialog", () => {
    renderForm();
    expect(screen.getByText("clean")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Leave"));
    expect(screen.getByText("away")).toBeInTheDocument();
    expect(screen.queryByTestId("draft-unsaved-dialog")).not.toBeInTheDocument();
  });

  it("blocks leave while dirty and Stay keeps values", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("recipient"), { target: { value: "Dr Stay" } });
    expect(screen.getByText("dirty")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Leave"));
    expect(await screen.findByTestId("draft-unsaved-dialog")).toBeVisible();
    fireEvent.click(screen.getByTestId("draft-unsaved-stay"));
    expect(screen.getByLabelText("recipient")).toHaveValue("Dr Stay");
    expect(screen.queryByText("away")).not.toBeInTheDocument();
  });

  it("discards after confirmation", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("recipient"), { target: { value: "Dr Go" } });
    fireEvent.click(screen.getByText("Leave"));
    fireEvent.click(await screen.findByTestId("draft-unsaved-discard"));
    expect(await screen.findByText("away")).toBeInTheDocument();
  });

  it("does not prompt after a successful save navigation grant", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("recipient"), { target: { value: "Dr Saved" } });
    fireEvent.click(screen.getByText("Saved leave"));
    expect(screen.getByText("away")).toBeInTheDocument();
  });

  it("keeps dirty state after a failed save", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("recipient"), { target: { value: "Dr Fail" } });
    expect(screen.getByText("dirty")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Leave"));
    expect(await screen.findByTestId("draft-unsaved-dialog")).toBeVisible();
    fireEvent.click(screen.getByTestId("draft-unsaved-stay"));
    expect(screen.getByLabelText("recipient")).toHaveValue("Dr Fail");
  });

  it("asks before a local reload when dirty", async () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("recipient"), { target: { value: "Dr Reload" } });
    fireEvent.click(screen.getByText("Reload"));
    expect(await screen.findByTestId("draft-unsaved-dialog")).toBeVisible();
    expect(screen.queryByText("reloaded")).not.toBeInTheDocument();
    fireEvent.click(screen.getByTestId("draft-unsaved-discard"));
    expect(await screen.findByText("reloaded")).toBeInTheDocument();
  });
});

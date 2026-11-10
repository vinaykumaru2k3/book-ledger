// @vitest-environment jsdom
import React, { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import Button from "./Button";
import Dialog from "./Dialog";
import Field from "./Field";
import Tabs from "./Tabs";
import ProgressRibbon from "./ProgressRibbon";
import BookCover from "./BookCover";

afterEach(() => {
  cleanup();
  localStorage.clear();
});

describe("Button", () => {
  it("is disabled and busy while loading, and never fires onClick", () => {
    const onClick = vi.fn();
    render(<Button loading onClick={onClick}>Save</Button>);
    const button = screen.getByRole("button", { name: "Save" });
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("applies the variant and size classes", () => {
    render(<Button variant="primary" size="lg">Go</Button>);
    expect(screen.getByRole("button").className).toContain("pk-btn--primary");
    expect(screen.getByRole("button").className).toContain("pk-btn--lg");
  });
});

describe("Field", () => {
  it("links label, hint and error to the control", () => {
    render(<Field label="Title" hint="As on the cover" />);
    const input = screen.getByLabelText("Title");
    expect(input.getAttribute("aria-describedby")).toBeTruthy();
    cleanup();

    render(<Field label="Title" error="Required" />);
    const invalid = screen.getByLabelText("Title");
    expect(invalid.getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe("Required");
  });

  it("renders select options through children", () => {
    render(
      <Field label="Status" as="select" defaultValue="b">
        <option value="a">A</option>
        <option value="b">B</option>
      </Field>
    );
    expect(screen.getByLabelText("Status").value).toBe("b");
  });
});

describe("Tabs", () => {
  function Harness() {
    const [value, setValue] = useState("a");
    return (
      <Tabs
        label="Demo"
        value={value}
        onChange={setValue}
        tabs={[
          { id: "a", label: "Alpha" },
          { id: "b", label: "Beta" },
          { id: "c", label: "Gamma" },
        ]}
      />
    );
  }

  it("selects with the arrow keys, wraps around, and uses roving tabindex", () => {
    render(<Harness />);
    const [alpha, beta, gamma] = screen.getAllByRole("tab");
    expect(alpha.getAttribute("aria-selected")).toBe("true");
    expect(beta.tabIndex).toBe(-1);

    fireEvent.keyDown(alpha, { key: "ArrowRight" });
    expect(beta.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(beta, { key: "End" });
    expect(gamma.getAttribute("aria-selected")).toBe("true");
    fireEvent.keyDown(gamma, { key: "ArrowRight" });
    expect(alpha.getAttribute("aria-selected")).toBe("true");
  });
});

describe("Dialog", () => {
  it("moves focus in, traps Tab, closes on Escape, locks scroll and restores focus", () => {
    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>Open</button>
          {open && (
            <Dialog title="Confirm" onClose={() => setOpen(false)} footer={<button>Last</button>}>
              <button>First</button>
            </Dialog>
          )}
        </>
      );
    }
    render(<Harness />);
    const opener = screen.getByText("Open");
    opener.focus();
    fireEvent.click(opener);

    const dialog = screen.getByRole("dialog", { name: "Confirm" });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");

    // Tab from the last control wraps to the first one inside the dialog.
    screen.getByText("Last").focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(dialog.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(screen.getByText("Last"));

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.body.style.overflow).toBe("");
    expect(document.activeElement).toBe(opener);
  });

  it("closes when the backdrop is pressed but not when the panel is", () => {
    const onClose = vi.fn();
    render(<Dialog title="T" onClose={onClose}>Body</Dialog>);
    fireEvent.mouseDown(screen.getByRole("dialog"));
    expect(onClose).not.toHaveBeenCalled();
    fireEvent.mouseDown(screen.getByRole("dialog").parentElement);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});

describe("ProgressRibbon", () => {
  it("exposes a clamped value to assistive tech", () => {
    render(<ProgressRibbon value={140} />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");
    cleanup();
    render(<ProgressRibbon value="abc" />);
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("0");
  });
});

describe("BookCover", () => {
  it("falls back to initials when there is no image or it fails", () => {
    const { container } = render(<BookCover book={{ title: "Dune Messiah", author: "Frank Herbert" }} />);
    expect(container.querySelector(".pk-cover__initials").textContent).toBe("DM");
    cleanup();

    const { container: withImage } = render(<BookCover book={{ title: "Dune", coverUrl: "https://example.test/x.jpg" }} />);
    const img = withImage.querySelector("img");
    expect(img.alt).toBe("Cover of Dune");
    fireEvent.error(img);
    expect(withImage.querySelector("img")).toBeNull();
  });
});

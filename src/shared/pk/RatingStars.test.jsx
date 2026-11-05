// @vitest-environment jsdom
import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RatingStars from "./RatingStars";

afterEach(cleanup);

describe("RatingStars", () => {
  it("is a radio group where the current value is checked", () => {
    render(<RatingStars value={2} label="Your rating" onChange={() => {}} starLabel={(n) => `${n} stars`} />);
    expect(screen.getByRole("radiogroup", { name: "Your rating" })).toBeTruthy();
    expect(screen.getAllByRole("radio").map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true", "false", "false", "false"]);
  });

  it("sets a rating and clears it when the current star is clicked again", () => {
    const onChange = vi.fn();
    render(<RatingStars value={4} label="r" onChange={onChange} starLabel={(n) => `${n} stars`} />);
    fireEvent.click(screen.getByRole("radio", { name: "2 stars" }));
    expect(onChange).toHaveBeenLastCalledWith(2);
    fireEvent.click(screen.getByRole("radio", { name: "4 stars" }));
    expect(onChange).toHaveBeenLastCalledWith(0);
  });

  it("clamps odd values and has a read-only mode that exposes the value as text", () => {
    render(<RatingStars readOnly value={9} label="Rating" starLabel={(n) => `${n} stars`} />);
    expect(screen.getByRole("img").getAttribute("aria-label")).toBe("Rating: 5 stars");
    expect(screen.queryByRole("radio")).toBeNull();
  });
});

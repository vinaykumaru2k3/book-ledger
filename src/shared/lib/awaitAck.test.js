import { afterEach, describe, expect, it, vi } from "vitest";
import { awaitAck } from "./awaitAck";

afterEach(() => vi.useRealTimers());

describe("awaitAck", () => {
  it("resolves ok when the write is confirmed in time", async () => {
    await expect(awaitAck(Promise.resolve())).resolves.toBe("ok");
  });

  it("rejects when the write fails before the timeout", async () => {
    await expect(awaitAck(Promise.reject(new Error("denied")))).rejects.toThrow("denied");
  });

  it("reports 'queued' instead of hanging when the server never answers (offline)", async () => {
    vi.useFakeTimers();
    const pending = awaitAck(new Promise(() => {}), undefined, 3000);
    vi.advanceTimersByTime(3000);
    await expect(pending).resolves.toBe("queued");
  });

  it("still surfaces a failure that arrives after the timeout", async () => {
    vi.useFakeTimers();
    let fail;
    const write = new Promise((_, reject) => (fail = reject));
    const onLateFailure = vi.fn();
    const pending = awaitAck(write, onLateFailure, 1000);
    vi.advanceTimersByTime(1000);
    await expect(pending).resolves.toBe("queued");
    fail(new Error("rules rejected it"));
    await Promise.resolve();
    await Promise.resolve();
    expect(onLateFailure).toHaveBeenCalledWith(expect.objectContaining({ message: "rules rejected it" }));
  });

  it("does not report queued when the write is confirmed after the timer is cleared", async () => {
    vi.useFakeTimers();
    let ok;
    const pending = awaitAck(new Promise((resolve) => (ok = resolve)), undefined, 1000);
    ok();
    await expect(pending).resolves.toBe("ok");
    vi.advanceTimersByTime(5000); // the cleared timer must not fire
  });
});

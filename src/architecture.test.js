/**
 * Enforces the layering described in docs/ARCHITECTURE.md. If this fails, a
 * file imports something it should not: move the code, don't relax the rule.
 *
 *   domain    pure rules              may use: domain
 *   services  API / Firebase clients  may use: domain, services
 *   shared    reusable UI             may use: domain, shared
 *   features  one per product area    may use: itself, shared, domain, services, app/AppContext
 *   app       shell and wiring        may use: everything
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

const isTest = (file) => /\.test\.jsx?$/.test(file) || file.endsWith("architecture.test.js");
const sources = walk(SRC).filter((f) => /\.jsx?$/.test(f) && !isTest(f));

/** "domain", "services", "shared", "app", "features/<name>" or "root". */
function layerOf(file) {
  const [top, second] = path.relative(SRC, file).split(path.sep);
  if (top === "features") return `features/${second}`;
  return ["domain", "services", "shared", "app"].includes(top) ? top : "root";
}

function importsOf(file) {
  const text = fs.readFileSync(file, "utf8");
  const specs = [...text.matchAll(/(?:from\s+|import\s*\(\s*|import\s+)["']([^"']+)["']/g)].map((m) => m[1]);
  return specs.map((spec) => {
    if (!spec.startsWith(".")) return { spec, external: true };
    const base = path.resolve(path.dirname(file), spec);
    const target = [base, `${base}.js`, `${base}.jsx`].find((p) => fs.existsSync(p) && fs.statSync(p).isFile()) || base;
    return { spec, target, layer: layerOf(target) };
  });
}

// Cross-feature dependencies we accept, with the reason.
const ALLOWED_FEATURE_LINKS = {
  "features/shelves": ["features/library"], // a shelf shows its books as library cards
};

function violations() {
  const found = [];
  sources.forEach((file) => {
    const from = layerOf(file);
    importsOf(file).forEach((imp) => {
      const rel = path.relative(SRC, file);
      if (imp.external) {
        const react = /^react(-dom)?$/.test(imp.spec);
        const firebase = imp.spec.startsWith("firebase");
        if ((from === "domain" || from === "services") && react) found.push(`${rel} must not import React`);
        // Firebase is reachable from services, the shell, and feature *controller hooks* only.
        const isController = /use\w+Controller\.js$/.test(file);
        if (firebase && !["services", "app", "root"].includes(from) && !(from.startsWith("features") && isController)) {
          found.push(`${rel}: Firebase belongs in services or a controller hook`);
        }
        return;
      }
      const to = imp.layer;
      if (to === from || to === "root" || from === "root") return; // main.jsx is the entry point
      const allowedByLayer = {
        domain: ["domain"],
        services: ["domain", "services"],
        shared: ["domain", "shared"],
        app: ["domain", "services", "shared", "app"],
      };
      if (from === "app") {
        return; // the shell may use anything
      }
      if (from.startsWith("features")) {
        const ok =
          ["shared", "domain", "services"].includes(to) ||
          imp.target.endsWith(`${path.sep}app${path.sep}AppContext.jsx`) ||
          (ALLOWED_FEATURE_LINKS[from] || []).includes(to);
        if (!ok) found.push(`${rel} imports ${path.relative(SRC, imp.target)} (${from} -> ${to})`);
        return;
      }
      if (!allowedByLayer[from]?.includes(to)) found.push(`${rel} imports ${path.relative(SRC, imp.target)} (${from} -> ${to})`);
    });
  });
  return found;
}

describe("architecture", () => {
  it("respects the layer rules", () => {
    expect(violations()).toEqual([]);
  });

  it("has no unknown top-level folders", () => {
    const folders = fs.readdirSync(SRC, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
    expect(folders.sort()).toEqual(["app", "domain", "features", "services", "shared", "styles"]);
  });

  it("keeps feature folders free of circular feature links", () => {
    const edges = new Set();
    sources.forEach((file) => {
      const from = layerOf(file);
      if (!from.startsWith("features")) return;
      importsOf(file).forEach((imp) => imp.layer?.startsWith("features") && imp.layer !== from && edges.add(`${from}>${imp.layer}`));
    });
    edges.forEach((edge) => {
      const [a, b] = edge.split(">");
      expect(edges.has(`${b}>${a}`)).toBe(false);
    });
  });
});

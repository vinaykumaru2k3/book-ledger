/**
 * Security rules for literary maps, checked against the Firestore emulator.
 * Run with `npm run test:rules` (starts the emulator, runs this, stops it).
 */
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import { deleteDoc, doc, getDoc, getDocs, collection, query, where, setDoc, setLogLevel, updateDoc, writeBatch } from "firebase/firestore";

setLogLevel("silent"); // every refused write would otherwise print a stack of PERMISSION_DENIED noise

let env;

const meta = (ownerId, extra = {}) => ({
  ownerId,
  ownerName: "Owner",
  title: "Kannada",
  description: "",
  scope: { kind: "language", qid: "Q33673", label: "Kannada", langCode: "kn" },
  visibility: "private",
  featured: false,
  forkedFrom: null,
  counts: { authors: 1, works: 0, movements: 0, links: 0 },
  ...extra,
});
const graph = { nodes: [{ id: "Q1", kind: "author", name: { en: "Kuvempu" } }], links: [] };
const suggestion = (byUid, extra = {}) => ({ byUid, byName: "Reader", kind: "add-link", payload: { from: "Q1", to: "Q2", type: "influenced" }, note: "Source below.", status: "open", ...extra });

const as = (uid) => (uid ? env.authenticatedContext(uid) : env.unauthenticatedContext()).firestore();

async function seed(id, data, g = graph) {
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "maps", id), data);
    await setDoc(doc(db, "maps", id, "content", "graph"), g);
  });
}

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "pustaka-rules-test",
    firestore: { rules: fs.readFileSync(path.resolve(__dirname, "../../firestore.rules"), "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(() => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), "admins", "admin"), { note: "test" }));
});

describe("creating a map", () => {
  it("lets a reader create their own map, meta and graph in one batch", async () => {
    const db = as("alice");
    const batch = writeBatch(db);
    batch.set(doc(db, "maps", "m1"), meta("alice"));
    batch.set(doc(db, "maps", "m1", "content", "graph"), graph);
    await assertSucceeds(batch.commit());
  });

  it("refuses a map in someone else's name, a featured map, or unknown fields", async () => {
    await assertFails(setDoc(doc(as("alice"), "maps", "m1"), meta("bob")));
    await assertFails(setDoc(doc(as("alice"), "maps", "m1"), meta("alice", { featured: true })));
    await assertFails(setDoc(doc(as("alice"), "maps", "m1"), meta("alice", { secret: 1 })));
    await assertFails(setDoc(doc(as(null), "maps", "m1"), meta("alice")));
  });

  it("refuses a graph over the size limits", async () => {
    await seed("m1", meta("alice"));
    const nodes = Array.from({ length: 601 }, (_, i) => ({ id: `Q${i}` }));
    await assertFails(setDoc(doc(as("alice"), "maps", "m1", "content", "graph"), { nodes, links: [] }));
    await assertSucceeds(setDoc(doc(as("alice"), "maps", "m1", "content", "graph"), { nodes: nodes.slice(0, 600), links: [] }));
  });
});

describe("reading", () => {
  it("keeps a private map to its owner", async () => {
    await seed("m1", meta("alice"));
    await assertSucceeds(getDoc(doc(as("alice"), "maps", "m1")));
    await assertSucceeds(getDoc(doc(as("alice"), "maps", "m1", "content", "graph")));
    await assertFails(getDoc(doc(as("bob"), "maps", "m1")));
    await assertFails(getDoc(doc(as("bob"), "maps", "m1", "content", "graph")));
  });

  it("lets anyone, signed in or not, read a public map and list the gallery", async () => {
    await seed("m1", meta("alice", { visibility: "public" }));
    await assertSucceeds(getDoc(doc(as(null), "maps", "m1")));
    await assertSucceeds(getDoc(doc(as(null), "maps", "m1", "content", "graph")));
    await assertSucceeds(getDocs(query(collection(as(null), "maps"), where("visibility", "==", "public"))));
    await assertFails(getDocs(collection(as(null), "maps")));
    await assertSucceeds(getDocs(query(collection(as("bob"), "maps"), where("ownerId", "==", "bob"))));
  });
});

describe("changing a map", () => {
  it("lets only the owner edit or delete, and never change the owner or feature it", async () => {
    await seed("m1", meta("alice", { visibility: "public" }));
    await assertFails(updateDoc(doc(as("bob"), "maps", "m1"), { title: "Mine now" }));
    await assertFails(setDoc(doc(as("bob"), "maps", "m1", "content", "graph"), graph));
    await assertFails(updateDoc(doc(as("alice"), "maps", "m1"), { ownerId: "bob" }));
    await assertFails(updateDoc(doc(as("alice"), "maps", "m1"), { featured: true }));
    await assertSucceeds(updateDoc(doc(as("alice"), "maps", "m1"), { title: "Kannada literature", visibility: "private" }));
    await assertFails(deleteDoc(doc(as("bob"), "maps", "m1")));
    await assertSucceeds(deleteDoc(doc(as("alice"), "maps", "m1", "content", "graph")));
    await assertSucceeds(deleteDoc(doc(as("alice"), "maps", "m1")));
  });

  it("lets an admin feature or unpublish a map, and nothing else", async () => {
    await seed("m1", meta("alice", { visibility: "public" }));
    await assertSucceeds(updateDoc(doc(as("admin"), "maps", "m1"), { featured: true }));
    await assertSucceeds(updateDoc(doc(as("admin"), "maps", "m1"), { visibility: "private" }));
    await assertFails(updateDoc(doc(as("admin"), "maps", "m1"), { title: "Renamed" }));
    await assertFails(setDoc(doc(as("admin"), "admins", "bob"), {}));
  });
});

describe("suggestions and reports", () => {
  it("lets a reader suggest a change to a public map, as themselves", async () => {
    await seed("pub", meta("alice", { visibility: "public" }));
    await seed("priv", meta("alice"));
    await assertSucceeds(setDoc(doc(as("bob"), "maps", "pub", "suggestions", "s1"), suggestion("bob")));
    await assertFails(setDoc(doc(as("bob"), "maps", "pub", "suggestions", "s2"), suggestion("carol")));
    await assertFails(setDoc(doc(as("bob"), "maps", "pub", "suggestions", "s3"), suggestion("bob", { status: "accepted" })));
    await assertFails(setDoc(doc(as("bob"), "maps", "priv", "suggestions", "s4"), suggestion("bob")));
    await assertFails(setDoc(doc(as(null), "maps", "pub", "suggestions", "s5"), suggestion("bob")));
  });

  it("shows a suggestion to its author and the owner, and lets only the owner decide it", async () => {
    await seed("pub", meta("alice", { visibility: "public" }));
    await setDoc(doc(as("bob"), "maps", "pub", "suggestions", "s1"), suggestion("bob"));
    await assertSucceeds(getDoc(doc(as("bob"), "maps", "pub", "suggestions", "s1")));
    await assertSucceeds(getDoc(doc(as("alice"), "maps", "pub", "suggestions", "s1")));
    await assertFails(getDoc(doc(as("carol"), "maps", "pub", "suggestions", "s1")));
    await assertFails(updateDoc(doc(as("bob"), "maps", "pub", "suggestions", "s1"), { status: "accepted" }));
    await assertFails(updateDoc(doc(as("alice"), "maps", "pub", "suggestions", "s1"), { note: "edited" }));
    await assertSucceeds(updateDoc(doc(as("alice"), "maps", "pub", "suggestions", "s1"), { status: "accepted" }));
  });

  it("takes reports from signed-in readers, readable by admins only", async () => {
    const report = { mapId: "pub", byUid: "bob", reason: "Spam" };
    await assertSucceeds(setDoc(doc(as("bob"), "reports", "r1"), report));
    await assertFails(setDoc(doc(as("bob"), "reports", "r2"), { ...report, byUid: "carol" }));
    await assertFails(getDoc(doc(as("bob"), "reports", "r1")));
    await assertSucceeds(getDoc(doc(as("admin"), "reports", "r1")));
  });
});

describe("the existing library rules", () => {
  it("still keep each reader's books to themselves", async () => {
    const book = { title: "Kanuru Heggaditi", status: "want", rating: 0 };
    await assertSucceeds(setDoc(doc(as("alice"), "users", "alice", "books", "b1"), book));
    await assertFails(getDoc(doc(as("bob"), "users", "alice", "books", "b1")));
  });
});

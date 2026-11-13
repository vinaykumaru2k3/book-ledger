/**
 * Literary maps in Firestore. The only maps file that talks to Firebase.
 *
 *   maps/{id}                meta: title, scope, owner, visibility, counts
 *   maps/{id}/content/graph  { nodes, links }: one read opens a whole map
 *
 * Who may read and write what is enforced by firestore.rules (see tests/rules).
 */
import { useCallback, useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../../services/firebase";
import { countsOf, normalizeGraph, normalizeMeta, validateGraph } from "../../domain/literaryMap";

const GALLERY_SIZE = 48;

const toMillis = (value) => (value?.toMillis ? value.toMillis() : typeof value === "number" ? value : 0);

/** A map's meta document as the UI uses it (timestamps as milliseconds). */
function readMeta(snapshot) {
  const data = snapshot.data();
  return {
    id: snapshot.id,
    ...normalizeMeta(data),
    counts: data.counts || { authors: 0, works: 0, movements: 0, links: 0 },
    createdAt: toMillis(data.createdAt),
    updatedAt: toMillis(data.updatedAt),
    generatedAt: toMillis(data.generatedAt),
  };
}

// Firestore refuses `undefined` anywhere in a document; a JSON round trip drops those keys.
const plain = (value) => JSON.parse(JSON.stringify(value));

/** Meta fields a client may write (the rules refuse anything else). */
function metaForWrite(meta) {
  const m = normalizeMeta(meta);
  return {
    ownerId: m.ownerId,
    ownerName: m.ownerName,
    title: m.title,
    description: m.description,
    scope: m.scope,
    visibility: m.visibility,
    featured: m.featured,
    forkedFrom: m.forkedFrom,
  };
}

/**
 * The three gallery shelves. "Mine" is live; featured and community maps are
 * read once (and again on `refresh`), since other people's maps change rarely.
 */
export function useMapsGallery(user) {
  const [mine, setMine] = useState({ maps: [], loading: Boolean(user) });
  const [shared, setShared] = useState({ featured: [], community: [], loading: true, error: "" });
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (!user) {
      setMine({ maps: [], loading: false });
      return undefined;
    }
    setMine((m) => ({ ...m, loading: true }));
    return onSnapshot(
      query(collection(db, "maps"), where("ownerId", "==", user.uid)),
      (snap) => setMine({ maps: snap.docs.map(readMeta).sort((a, b) => b.updatedAt - a.updatedAt), loading: false }),
      () => setMine({ maps: [], loading: false })
    );
  }, [user]);

  useEffect(() => {
    let live = true;
    const maps = collection(db, "maps");
    setShared((s) => ({ ...s, loading: true, error: "" }));
    Promise.all([
      getDocs(query(maps, where("visibility", "==", "public"), where("featured", "==", true), limit(GALLERY_SIZE))),
      getDocs(query(maps, where("visibility", "==", "public"), orderBy("updatedAt", "desc"), limit(GALLERY_SIZE))),
    ])
      .then(([featured, community]) => {
        if (!live) return;
        setShared({
          featured: featured.docs.map(readMeta).sort((a, b) => b.updatedAt - a.updatedAt),
          community: community.docs.map(readMeta).filter((m) => !m.featured),
          loading: false,
          error: "",
        });
      })
      .catch(() => live && setShared({ featured: [], community: [], loading: false, error: "Could not load the community maps." }));
    return () => {
      live = false;
    };
  }, [tick]);

  const refresh = useCallback(() => setTick((n) => n + 1), []);
  return { mine: mine.maps, mineLoading: mine.loading, ...shared, refresh };
}

/**
 * One map, live: its meta and its graph. `status` is "loading", "ready",
 * "missing" (no such map, or a private map that is not yours) or "error".
 */
export function useMapDocument(mapId, user) {
  const [state, setState] = useState({ status: "loading", meta: null, graph: null });

  useEffect(() => {
    if (!mapId) return undefined;
    setState({ status: "loading", meta: null, graph: null });
    let meta = null;
    let graph = null;
    const publish = () => meta && graph && setState({ status: "ready", meta, graph });
    const fail = (error) => setState({ status: error?.code === "permission-denied" ? "missing" : "error", meta: null, graph: null });

    const stopMeta = onSnapshot(
      doc(db, "maps", mapId),
      (snap) => {
        if (!snap.exists()) return setState({ status: "missing", meta: null, graph: null });
        meta = readMeta(snap);
        publish();
      },
      fail
    );
    const stopGraph = onSnapshot(
      doc(db, "maps", mapId, "content", "graph"),
      (snap) => {
        graph = normalizeGraph(snap.exists() ? snap.data() : {});
        publish();
      },
      fail
    );
    return () => {
      stopMeta();
      stopGraph();
    };
    // The user matters: signing in may make a private map readable.
  }, [mapId, user?.uid]);

  return state;
}

/** Creates a map (meta and graph in one batch). Resolves to the new map's id. */
export async function createMap(user, meta, graph) {
  const clean = normalizeGraph(graph);
  const problems = validateGraph(clean);
  if (problems.length) throw new Error(problems[0]);
  const ref = doc(collection(db, "maps"));
  const batch = writeBatch(db);
  batch.set(ref, {
    ...metaForWrite({ ...meta, ownerId: user.uid, ownerName: meta.ownerName ?? user.displayName ?? "", featured: false }),
    counts: countsOf(clean),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    generatedAt: serverTimestamp(),
  });
  batch.set(doc(db, "maps", ref.id, "content", "graph"), plain({ nodes: clean.nodes, links: clean.links }));
  await batch.commit();
  return ref.id;
}

/** Saves an edited graph and keeps the meta's counts in step, in one batch. */
export async function saveGraph(mapId, graph, { regenerated = false } = {}) {
  const clean = normalizeGraph(graph);
  const problems = validateGraph(clean);
  if (problems.length) throw new Error(problems[0]);
  const batch = writeBatch(db);
  batch.set(doc(db, "maps", mapId, "content", "graph"), plain({ nodes: clean.nodes, links: clean.links }));
  batch.update(doc(db, "maps", mapId), {
    counts: countsOf(clean),
    updatedAt: serverTimestamp(),
    ...(regenerated ? { generatedAt: serverTimestamp() } : {}),
  });
  await batch.commit();
}

/** Changes the title, description or visibility. */
export async function updateMapMeta(mapId, patch) {
  const allowed = {};
  if ("title" in patch) allowed.title = normalizeMeta({ title: patch.title }).title;
  if ("description" in patch) allowed.description = normalizeMeta({ description: patch.description }).description;
  if ("visibility" in patch) allowed.visibility = patch.visibility === "public" ? "public" : "private";
  await updateDoc(doc(db, "maps", mapId), { ...allowed, updatedAt: serverTimestamp() });
}

/** Deletes a map: its graph first (the rules check the meta's owner), then the meta. */
export async function deleteMap(mapId) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "maps", mapId, "content", "graph"));
  batch.delete(doc(db, "maps", mapId));
  await batch.commit();
}

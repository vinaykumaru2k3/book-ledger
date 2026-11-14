import React, { useEffect, useMemo, useRef, useState } from "react";
import { Check, EyeOff, Link2, Loader2, Plus, RefreshCw, Sprout, Trash2, Undo2 } from "lucide-react";
import Button from "../../shared/pk/Button";
import Dialog from "../../shared/pk/Dialog";
import Field from "../../shared/pk/Field";
import SearchBox from "../../shared/pk/SearchBox";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import {
  LINK_TYPES,
  addLink,
  addToMap,
  hiddenItems,
  linkProblem,
  mergeGenerated,
  removeLink,
  removeNode,
  searchNodes,
  setHidden,
  updateNode,
  userNodeId,
} from "../../domain/literaryMap";
import { SIZES, authorDetails, generateMap, growFrom, movementDetails } from "../../services/literaryMapSource";
import { getEntities, searchItems } from "../../services/wikidataBooks";
import { NodeName } from "./MapListView";
import { Progress } from "./MapProgress";
import { linkPhrase } from "./mapText";

const KINDS = ["author", "work", "movement"];
/** Links the owner can draw; "mentioned together" only ever comes from Wikipedia. */
const DRAWABLE = Object.keys(LINK_TYPES).filter((type) => type !== "mentioned");

const nameOf = (node) => node?.name.native || node?.name.en || "";
const yearOrBlank = (value) => (value === undefined ? "" : String(value));
const parseYear = (text) => {
  const n = Number(String(text).trim());
  return String(text).trim() && Number.isInteger(n) ? n : undefined;
};

/** The size of map to ask Wikidata for again: the one closest to what the map has now. */
function sizeFor(graph) {
  const authors = graph.nodes.filter((n) => n.kind === "author" && n.source === "wikidata").length;
  return Object.keys(SIZES).find((key) => authors <= SIZES[key] * 1.25) || "deep";
}

/* ------------------------------ the bar above the views ------------------------------ */

/** The owner's tools while editing: add, draw a link, see what is hidden, refresh, undo. */
export function EditBar({ graph, editor, onAdd, onLink, onHidden, onRefresh }) {
  const { t } = useLanguage();
  const hidden = useMemo(() => hiddenItems(graph), [graph]);
  const hiddenCount = hidden.nodes.length + hidden.links.length;
  return (
    <div className="pk-map-editbar" role="toolbar" aria-label={t("maps.edit.tools")}>
      <Button size="sm" icon={Plus} onClick={onAdd}>
        {t("maps.edit.add")}
      </Button>
      <Button size="sm" icon={Link2} onClick={() => onLink(null)}>
        {t("maps.edit.link")}
      </Button>
      <Button size="sm" variant="ghost" icon={EyeOff} onClick={onHidden}>
        {t("maps.edit.hidden", { count: hiddenCount })}
      </Button>
      <Button size="sm" variant="ghost" icon={RefreshCw} onClick={onRefresh}>
        {t("maps.edit.refresh")}
      </Button>
      <span className="pk-map-editbar__end">
        {editor.busy && (
          <span className="pk-map-editbar__saving" role="status">
            <Loader2 size={14} className="pk-spin" aria-hidden="true" /> {t("maps.edit.saving")}
          </span>
        )}
        <Button size="sm" variant="ghost" icon={Undo2} onClick={editor.undo} disabled={!editor.canUndo || editor.busy}>
          {t("maps.edit.undo")}
        </Button>
      </span>
    </div>
  );
}

/* ------------------------------ choosing a node on the map ------------------------------ */

/** Finds a node on this map by name; shows the chosen one with a way to change it. */
function NodePicker({ graph, label, value, onChange, lang, kinds }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const chosen = value ? graph.nodes.find((n) => n.id === value) : null;
  const matches = useMemo(
    () => (query.trim() ? searchNodes(graph, query, 30).filter((n) => !kinds || kinds.includes(n.kind)).slice(0, 6) : []),
    [graph, query, kinds]
  );
  if (chosen) {
    return (
      <div className="pk-map-pick">
        <span className="pk-field__label">{label}</span>
        <p className="pk-map-pick__chosen">
          <Check size={14} aria-hidden="true" />
          <NodeName node={chosen} lang={lang} />
          <span className="pk-map-pick__kind">{t(`maps.inspector.kind.${chosen.kind}`)}</span>
          <Button size="sm" variant="ghost" onClick={() => onChange(null)}>
            {t("maps.edit.change")}
          </Button>
        </p>
      </div>
    );
  }
  return (
    <div className="pk-map-pick">
      <SearchBox value={query} onChange={setQuery} label={label} placeholder={t("maps.edit.findOnMap")} />
      {matches.length > 0 && (
        <ul className="pk-map-picks">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  onChange(m.id);
                }}
              >
                <NodeName node={m} lang={lang} />
                <span className="pk-map-picks__kind">{t(`maps.inspector.kind.${m.kind}`)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------ drawing a link ------------------------------ */

/** Draws a link between two nodes, with a required note and an optional source. */
export function LinkDialog({ graph, lang, fromId = null, editor, onClose }) {
  const { t } = useLanguage();
  const [from, setFrom] = useState(fromId);
  const [to, setTo] = useState(null);
  const [type, setType] = useState("influenced");
  const [note, setNote] = useState("");
  const [citation, setCitation] = useState("");
  const [tried, setTried] = useState(false);
  const draft = { from, to, type, note, citation: citation.trim() };
  const problem = linkProblem(draft);
  const badCitation = draft.citation && !/^https?:\/\/\S+$/.test(draft.citation);
  const byId = (id) => graph.nodes.find((n) => n.id === id);

  async function save() {
    setTried(true);
    if (problem || badCitation) return;
    const ok = await editor.apply(addLink(graph, draft), t("maps.edit.linkAdded"));
    if (ok) onClose();
  }

  return (
    <Dialog
      title={t("maps.edit.linkTitle")}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("action.cancel")}
          </Button>
          <Button variant="primary" onClick={save} loading={editor.busy}>
            {t("maps.edit.linkSave")}
          </Button>
        </>
      }
    >
      <div className="pk-map-form">
        <NodePicker graph={graph} label={t("maps.edit.from")} value={from} onChange={setFrom} lang={lang} />
        <Field as="select" label={t("maps.edit.type")} value={type} onChange={(e) => setType(e.target.value)}>
          {DRAWABLE.map((key) => (
            <option key={key} value={key}>
              {linkPhrase(key, true)}
            </option>
          ))}
        </Field>
        <NodePicker graph={graph} label={t("maps.edit.to")} value={to} onChange={setTo} lang={lang} />
        {tried && problem === "ends" && (
          <p className="pk-field__error" role="alert">
            {t("maps.edit.errorEnds")}
          </p>
        )}
        {from && to && from !== to && (
          <p className="pk-map-form__preview">
            {nameOf(byId(from))} {linkPhrase(type, true)} {nameOf(byId(to))}
          </p>
        )}
        <Field
          as="textarea"
          rows={3}
          label={t("maps.edit.why")}
          hint={t("maps.edit.whyHint")}
          error={tried && problem === "note" ? t("maps.edit.errorNote") : ""}
          value={note}
          maxLength={600}
          onChange={(e) => setNote(e.target.value)}
        />
        <Field
          type="url"
          label={t("maps.edit.citation")}
          hint={t("maps.edit.citationHint")}
          error={tried && badCitation ? t("maps.edit.errorCitation") : ""}
          value={citation}
          onChange={(e) => setCitation(e.target.value)}
        />
      </div>
    </Dialog>
  );
}

/* ------------------------------ adding a node ------------------------------ */

/** What Wikidata knows about a picked item, as nodes and links to add to the map. */
async function fromWikidata(item, kind, graph, langCode) {
  if (kind === "author") {
    const [[author], around] = await Promise.all([authorDetails([item.id], langCode), growFrom(item.id, { langCode, limit: 40 }).catch(() => ({ links: [] }))]);
    // Only the links to what is on the map already; "grow from here" brings in the rest.
    return { nodes: author ? [author] : [], links: around.links };
  }
  if (kind === "movement") {
    const movements = await movementDetails([item.id], langCode);
    return { nodes: movements, links: [] };
  }
  const entities = await getEntities([item.id], "labels|claims", { languages: langCode && langCode !== "en" ? `${langCode}|en` : "en" });
  const entity = entities[item.id];
  const date = entity?.claims?.P577?.[0]?.mainsnak?.datavalue?.value?.time;
  const authorIds = (entity?.claims?.P50 || []).map((c) => c.mainsnak?.datavalue?.value?.id).filter(Boolean);
  const work = {
    id: item.id,
    qid: item.id,
    kind: "work",
    name: { native: (langCode && entity?.labels?.[langCode]?.value) || "", en: entity?.labels?.en?.value || item.label || "" },
    years: { from: date ? Number.parseInt(date.replace(/^\+/, ""), 10) : undefined },
    authorIds,
    source: "wikidata",
  };
  return { nodes: [work], links: authorIds.map((a) => ({ from: a, to: item.id, type: "wrote", source: "wikidata" })) };
}

/** Searches Wikidata as you type and lists what it finds, marking what is on the map. */
function WikidataSearch({ graph, onPick, busyId }) {
  const { t } = useLanguage();
  const [text, setText] = useState("");
  const [results, setResults] = useState([]);
  const [state, setState] = useState("idle"); // idle | searching | done | failed

  useEffect(() => {
    const q = text.trim();
    if (q.length < 2) {
      setResults([]);
      setState("idle");
      return undefined;
    }
    let live = true;
    const timer = window.setTimeout(() => {
      setState("searching");
      searchItems(q, 8)
        .then((items) => {
          if (!live) return;
          setResults(items);
          setState("done");
        })
        .catch(() => live && setState("failed"));
    }, 350);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [text]);

  const onMap = new Map(graph.nodes.map((n) => [n.id, n]));
  return (
    <div className="pk-map-picker">
      <SearchBox value={text} onChange={setText} label={t("maps.edit.searchWikidata")} placeholder={t("maps.edit.searchPlaceholder")} />
      {state === "searching" && <p className="pk-map-picker__note">{t("maps.wizard.searching")}</p>}
      {state === "failed" && <p className="pk-map-picker__note">{t("maps.edit.searchFailed")}</p>}
      {state === "done" && !results.length && <p className="pk-map-picker__note">{t("maps.edit.noResults")}</p>}
      {results.length > 0 && (
        <ul className="pk-map-picker__results" aria-label={t("maps.edit.results")}>
          {results.map((item) => {
            const there = onMap.get(item.id);
            return (
              <li key={item.id}>
                <button type="button" onClick={() => onPick(item)} disabled={Boolean(busyId) || (there && !there.hidden)}>
                  <span className="pk-map-picker__label">
                    {item.label}
                    {busyId === item.id && <Loader2 size={14} className="pk-spin" aria-hidden="true" />}
                  </span>
                  {item.description && <span className="pk-map-picker__desc">{item.description}</span>}
                  {there && <span className="pk-map-picker__desc">{t(there.hidden ? "maps.edit.onMapHidden" : "maps.edit.onMap")}</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Pick one of a few words, drawn as chips: a labelled radio group. */
function ChoiceChips({ label, value, onChange, options }) {
  return (
    <div className="pk-map-chipgroup">
      <span className="pk-field__label" aria-hidden="true">
        {label}
      </span>
      <div className="pk-chips" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? "pk-chip pk-chip--on" : "pk-chip"} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Adds an author, work or movement: found on Wikidata, or typed in by hand. */
export function AddNodeDialog({ graph, scope, lang, editor, onClose, onAdded }) {
  const { t } = useLanguage();
  const [kind, setKind] = useState("author");
  const [how, setHow] = useState("wikidata");
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ en: "", native: "", from: "", to: "", authorId: null, movementId: "", note: "" });
  const [tried, setTried] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const movements = graph.nodes.filter((n) => n.kind === "movement" && !n.hidden);
  const live = useRef(true);
  useEffect(() => {
    // Set on every mount: StrictMode mounts twice, and the first cleanup clears it.
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  async function pick(item) {
    setBusyId(item.id);
    setError("");
    try {
      const found = await fromWikidata(item, kind, graph, scope?.langCode);
      if (!live.current) return;
      if (!found.nodes.length) {
        setError(t("maps.edit.addFailed"));
        return;
      }
      const { graph: next, added } = addToMap(graph, found, { unhide: true });
      const name = nameOf(found.nodes[0]);
      const message = added.links ? t("maps.edit.addedWithLinks", { name, count: added.links }) : t("maps.edit.added", { name });
      if (await editor.apply(next, message)) {
        onAdded(found.nodes[0].id);
        onClose();
      }
    } catch {
      if (live.current) setError(t("maps.edit.addFailed"));
    } finally {
      if (live.current) setBusyId(null);
    }
  }

  const fromYear = parseYear(form.from);
  const toYear = parseYear(form.to);
  const badYears = (form.from.trim() && fromYear === undefined) || (form.to.trim() && toYear === undefined) || (fromYear !== undefined && toYear !== undefined && toYear < fromYear);
  const noName = !form.en.trim() && !form.native.trim();

  async function addByHand() {
    setTried(true);
    if (noName || badYears) return;
    const id = userNodeId();
    const node = {
      id,
      kind,
      name: { en: form.en.trim(), native: form.native.trim() },
      years: { from: fromYear, to: kind === "work" ? undefined : toYear },
      note: form.note.trim(),
      source: "user",
      ...(kind === "work" && form.authorId ? { authorIds: [form.authorId] } : {}),
    };
    const links = [];
    if (kind === "work" && form.authorId) links.push({ from: form.authorId, to: id, type: "wrote", source: "user" });
    if (kind === "author" && form.movementId) links.push({ from: id, to: form.movementId, type: "member_of", source: "user" });
    const { graph: next } = addToMap(graph, { nodes: [node], links });
    if (await editor.apply(next, t("maps.edit.added", { name: nameOf(node) }))) {
      onAdded(id);
      onClose();
    }
  }

  const yearLabels = { author: ["maps.edit.born", "maps.edit.died"], work: ["maps.edit.published"], movement: ["maps.edit.began", "maps.edit.ended"] }[kind];

  return (
    <Dialog
      title={t("maps.edit.addTitle")}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("action.cancel")}
          </Button>
          {how === "hand" && (
            <Button variant="primary" onClick={addByHand} loading={editor.busy}>
              {t("maps.edit.addSave")}
            </Button>
          )}
        </>
      }
    >
      <div className="pk-map-form">
        <ChoiceChips label={t("maps.edit.kind")} value={kind} onChange={setKind} options={KINDS.map((k) => ({ value: k, label: t(`maps.inspector.kind.${k}`) }))} />
        <ChoiceChips
          label={t("maps.edit.how")}
          value={how}
          onChange={setHow}
          options={[
            { value: "wikidata", label: t("maps.edit.findTab") },
            { value: "hand", label: t("maps.edit.handTab") },
          ]}
        />
        {how === "wikidata" ? (
          <>
            <WikidataSearch graph={graph} onPick={pick} busyId={busyId} />
            {error && (
              <p className="pk-field__error" role="alert">
                {error}
              </p>
            )}
          </>
        ) : (
          <>
            <Field label={t("maps.edit.nameEn")} value={form.en} onChange={set("en")} maxLength={200} error={tried && noName ? t("maps.edit.errorName") : ""} />
            <Field label={t("maps.edit.nameNative")} hint={t("maps.edit.nameNativeHint")} value={form.native} onChange={set("native")} maxLength={200} lang={lang || undefined} />
            <div className="pk-map-form__row">
              {yearLabels.map((key, i) => (
                <Field
                  key={key}
                  label={t(key)}
                  inputMode="numeric"
                  value={i === 0 ? form.from : form.to}
                  onChange={set(i === 0 ? "from" : "to")}
                  error={i === 0 && tried && badYears ? t("maps.edit.errorYears") : ""}
                />
              ))}
            </div>
            {kind === "work" && (
              <NodePicker graph={graph} label={t("maps.edit.workAuthor")} value={form.authorId} onChange={(id) => setForm((f) => ({ ...f, authorId: id }))} lang={lang} kinds={["author"]} />
            )}
            {kind === "author" && movements.length > 0 && (
              <Field as="select" label={t("maps.edit.movement")} value={form.movementId} onChange={set("movementId")}>
                <option value="">{t("maps.edit.noMovement")}</option>
                {movements.map((m) => (
                  <option key={m.id} value={m.id}>
                    {nameOf(m)}
                  </option>
                ))}
              </Field>
            )}
            <Field as="textarea" rows={2} label={t("maps.edit.note")} hint={t("maps.edit.noteHint")} value={form.note} onChange={set("note")} maxLength={600} />
          </>
        )}
      </div>
    </Dialog>
  );
}

/* ------------------------------ editing one node ------------------------------ */

/**
 * Everything the owner can do to one node: correct its names and years, write
 * a note, hide its links, draw a new link from it, grow the map around it, or
 * take it off the map.
 */
export function NodeEditDialog({ graph, nodeId, scope, lang, editor, onClose, onLink }) {
  const { t } = useLanguage();
  const node = graph.nodes.find((n) => n.id === nodeId);
  const [form, setForm] = useState({
    en: node.name.en,
    native: node.name.native,
    from: yearOrBlank(node.years.from),
    to: yearOrBlank(node.years.to),
    note: node.note || "",
  });
  const [growing, setGrowing] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const links = graph.links.filter((l) => !l.hidden && (l.from === node.id || l.to === node.id) && !byId.get(l.from === node.id ? l.to : l.from)?.hidden);
  const live = useRef(true);
  useEffect(() => {
    // Set on every mount: StrictMode mounts twice, and the first cleanup clears it.
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);

  const fromYear = parseYear(form.from);
  const toYear = parseYear(form.to);
  const badYears = (form.from.trim() && fromYear === undefined) || (form.to.trim() && toYear === undefined) || (fromYear !== undefined && toYear !== undefined && toYear < fromYear);
  const noName = !form.en.trim() && !form.native.trim();
  const yearLabels = { author: ["maps.edit.born", "maps.edit.died"], work: ["maps.edit.published"], movement: ["maps.edit.began", "maps.edit.ended"] }[node.kind];

  async function save() {
    if (noName || badYears) return;
    const nameChanged = form.en.trim() !== node.name.en || form.native.trim() !== node.name.native;
    const years = { from: fromYear, to: node.kind === "work" ? undefined : toYear };
    const yearsChanged = years.from !== node.years.from || years.to !== node.years.to;
    const patch = { note: form.note.trim() };
    if (nameChanged) patch.name = { en: form.en.trim(), native: form.native.trim() };
    if (yearsChanged) patch.years = years;
    if (await editor.apply(updateNode(graph, node.id, patch), t("maps.edit.saved"))) onClose();
  }

  async function grow() {
    setGrowing(true);
    try {
      const around = await growFrom(node.qid, { langCode: scope?.langCode });
      if (!live.current) return;
      const { graph: next, added } = addToMap(graph, around);
      if (!added.nodes && !added.links) {
        editor.notify(t("maps.edit.growNothing", { name: nameOf(node) }));
        return;
      }
      if (await editor.apply(next, t("maps.edit.grown", { nodes: added.nodes, links: added.links }))) onClose();
    } catch {
      editor.notify(t("maps.edit.growFailed"), "error");
    } finally {
      if (live.current) setGrowing(false);
    }
  }

  async function remove() {
    if (await editor.apply(removeNode(graph, node.id), t("maps.edit.removed", { name: nameOf(node) }))) onClose();
  }

  const generated = node.source === "wikidata";

  return (
    <Dialog
      title={t("maps.edit.nodeTitle", { name: nameOf(node) })}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("action.cancel")}
          </Button>
          <Button variant="primary" onClick={save} loading={editor.busy && !growing}>
            {t("maps.edit.save")}
          </Button>
        </>
      }
    >
      <div className="pk-map-form">
        <Field label={t("maps.edit.nameEn")} value={form.en} onChange={set("en")} maxLength={200} error={noName ? t("maps.edit.errorName") : ""} />
        <Field label={t("maps.edit.nameNative")} hint={t("maps.edit.nameNativeHint")} value={form.native} onChange={set("native")} maxLength={200} lang={lang || undefined} />
        <div className="pk-map-form__row">
          {yearLabels.map((key, i) => (
            <Field
              key={key}
              label={t(key)}
              inputMode="numeric"
              value={i === 0 ? form.from : form.to}
              onChange={set(i === 0 ? "from" : "to")}
              error={i === 0 && badYears ? t("maps.edit.errorYears") : ""}
            />
          ))}
        </div>
        {generated && <p className="pk-map-form__hint">{t("maps.edit.correctionHint")}</p>}
        <Field as="textarea" rows={2} label={t("maps.edit.note")} hint={t("maps.edit.noteHint")} value={form.note} onChange={set("note")} maxLength={600} />

        <section className="pk-map-form__section">
          <h4>{t("maps.edit.linksHead", { count: links.length })}</h4>
          {links.length ? (
            <ul className="pk-map-editlinks">
              {links.map((l) => {
                const outgoing = l.from === node.id;
                const other = byId.get(outgoing ? l.to : l.from);
                const mine = l.source === "user" || l.source === "suggestion";
                return (
                  <li key={l.id}>
                    <span>
                      {linkPhrase(l.type, outgoing)} <NodeName node={other} lang={lang} />
                      {l.note && <small> · {l.note}</small>}
                    </span>
                    <Button
                      size="sm"
                      variant="ghost"
                      icon={mine ? Trash2 : EyeOff}
                      onClick={() => editor.apply(removeLink(graph, l.id), t(mine ? "maps.edit.linkRemoved" : "maps.edit.linkHidden"))}
                      disabled={editor.busy}
                    >
                      {t(mine ? "maps.edit.removeLink" : "maps.edit.hideLink")}
                    </Button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="pk-map-form__hint">{t("maps.edit.noLinks")}</p>
          )}
          <div className="pk-map-form__actions">
            <Button size="sm" icon={Link2} onClick={() => onLink(node.id)}>
              {t("maps.edit.linkFrom")}
            </Button>
            {node.kind === "author" && node.qid && (
              <Button size="sm" icon={Sprout} onClick={grow} loading={growing} disabled={editor.busy && !growing}>
                {t("maps.edit.grow")}
              </Button>
            )}
          </div>
          {node.kind === "author" && node.qid && <p className="pk-map-form__hint">{t("maps.edit.growHint")}</p>}
        </section>

        <section className="pk-map-form__section">
          {confirmRemove ? (
            <div className="pk-map-form__confirm" role="group" aria-label={t("maps.edit.remove")}>
              <p>{t(generated ? "maps.edit.removeHidden" : "maps.edit.removeDeleted")}</p>
              <div className="pk-map-form__actions">
                <Button size="sm" variant="ghost" onClick={() => setConfirmRemove(false)}>
                  {t("action.cancel")}
                </Button>
                <Button size="sm" variant="danger" icon={generated ? EyeOff : Trash2} onClick={remove} loading={editor.busy}>
                  {t("maps.edit.remove")}
                </Button>
              </div>
            </div>
          ) : (
            <Button size="sm" variant="ghost" icon={generated ? EyeOff : Trash2} onClick={() => setConfirmRemove(true)}>
              {t("maps.edit.remove")}
            </Button>
          )}
        </section>
      </div>
    </Dialog>
  );
}

/* ------------------------------ what is hidden ------------------------------ */

/** Lists what the owner hid, with a way to show each again. */
export function HiddenDialog({ graph, lang, editor, onClose }) {
  const { t } = useLanguage();
  const { nodes, links } = useMemo(() => hiddenItems(graph), [graph]);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const show = (target, name) => editor.apply(setHidden(graph, target, false), t("maps.edit.shownAgain", { name }));

  return (
    <Dialog title={t("maps.edit.hiddenTitle")} onClose={onClose} footer={<Button onClick={onClose}>{t("maps.edit.done")}</Button>}>
      {!nodes.length && !links.length ? (
        <p className="pk-map-form__hint">{t("maps.edit.hiddenEmpty")}</p>
      ) : (
        <div className="pk-map-form">
          {nodes.length > 0 && (
            <section className="pk-map-form__section">
              <h4>{t("maps.edit.hiddenNodes", { count: nodes.length })}</h4>
              <ul className="pk-map-editlinks">
                {nodes.map((n) => (
                  <li key={n.id}>
                    <span>
                      <NodeName node={n} lang={lang} /> <small>· {t(`maps.inspector.kind.${n.kind}`)}</small>
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => show({ nodeId: n.id }, nameOf(n))} disabled={editor.busy}>
                      {t("maps.edit.showAgain")}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {links.length > 0 && (
            <section className="pk-map-form__section">
              <h4>{t("maps.edit.hiddenLinks", { count: links.length })}</h4>
              <ul className="pk-map-editlinks">
                {links.map((l) => (
                  <li key={l.id}>
                    <span>
                      <NodeName node={byId.get(l.from)} lang={lang} /> {linkPhrase(l.type, true)} <NodeName node={byId.get(l.to)} lang={lang} />
                    </span>
                    <Button size="sm" variant="ghost" onClick={() => show({ linkId: l.id }, `${nameOf(byId.get(l.from))} – ${nameOf(byId.get(l.to))}`)} disabled={editor.busy}>
                      {t("maps.edit.showAgain")}
                    </Button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </Dialog>
  );
}

/* ------------------------------ refreshing from Wikidata ------------------------------ */

const PREVIEW_NAMES = 12;

/** Reads Wikidata again, shows what would change, and applies it on the owner's word. */
export function RefreshDialog({ graph, scope, books, editor, onClose }) {
  const { t } = useLanguage();
  const [phase, setPhase] = useState("start"); // start | reading | review | failed
  const [progress, setProgress] = useState(null);
  const [result, setResult] = useState(null);
  const abortRef = useRef(null);
  useEffect(() => () => abortRef.current?.abort(), []);

  async function read() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setPhase("reading");
    setProgress({ stage: scope.kind === "library" ? "library" : "authors" });
    try {
      const fresh = await generateMap({ scope, size: sizeFor(graph), books, onProgress: setProgress, signal: controller.signal });
      if (controller.signal.aborted) return;
      const merged = mergeGenerated(graph, fresh);
      const before = new Map(graph.nodes.map((n) => [n.id, n]));
      const after = new Map(merged.graph.nodes.map((n) => [n.id, n]));
      setResult({
        ...merged,
        addedNames: merged.changes.addedNodes.map((id) => nameOf(after.get(id))).filter(Boolean),
        removedNames: merged.changes.removedNodes.map((id) => nameOf(before.get(id))).filter(Boolean),
      });
      setPhase("review");
    } catch (e) {
      if (controller.signal.aborted || e?.name === "AbortError") return;
      setPhase("failed");
    }
  }

  async function applyChanges() {
    if (await editor.apply(result.graph, t("maps.edit.refreshed"), { regenerated: true })) onClose();
  }

  const nothing = result && !result.changes.addedNodes.length && !result.changes.removedNodes.length && !result.changes.addedLinks.length && !result.changes.removedLinks.length;
  const names = (list) => (list.length > PREVIEW_NAMES ? `${list.slice(0, PREVIEW_NAMES).join(", ")} ${t("maps.edit.andMore", { count: list.length - PREVIEW_NAMES })}` : list.join(", "));

  return (
    <Dialog
      title={t("maps.edit.refreshTitle")}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            {t("action.cancel")}
          </Button>
          {(phase === "start" || phase === "failed") && (
            <Button variant="primary" icon={RefreshCw} onClick={read}>
              {t(phase === "failed" ? "maps.edit.tryAgain" : "maps.edit.refreshRead")}
            </Button>
          )}
          {phase === "review" && !nothing && (
            <Button variant="primary" onClick={applyChanges} loading={editor.busy}>
              {t("maps.edit.refreshApply")}
            </Button>
          )}
        </>
      }
    >
      <div className="pk-map-form">
        {phase === "start" && <p>{t("maps.edit.refreshBody")}</p>}
        {phase === "reading" && <Progress progress={progress} kind={scope.kind} />}
        {phase === "failed" && (
          <p className="pk-field__error" role="alert">
            {t("maps.wizard.failed")}
          </p>
        )}
        {phase === "review" &&
          (nothing ? (
            <p>{t("maps.edit.refreshNothing")}</p>
          ) : (
            <dl className="pk-map-diff">
              <dt>{t("maps.edit.diffAdded", { count: result.addedNames.length })}</dt>
              <dd>{result.addedNames.length ? names(result.addedNames) : "—"}</dd>
              <dt>{t("maps.edit.diffRemoved", { count: result.removedNames.length })}</dt>
              <dd>{result.removedNames.length ? names(result.removedNames) : "—"}</dd>
              <dt>{t("maps.edit.diffLinks")}</dt>
              <dd>{t("maps.edit.diffLinksBody", { added: result.changes.addedLinks.length, removed: result.changes.removedLinks.length })}</dd>
            </dl>
          ))}
        {phase === "review" && !nothing && <p className="pk-map-form__hint">{t("maps.edit.refreshKeeps")}</p>}
      </div>
    </Dialog>
  );
}

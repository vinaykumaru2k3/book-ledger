import React, { useEffect, useMemo, useState } from "react";
import { BookCheck, ChevronDown, ExternalLink, Pencil, Plus } from "lucide-react";
import Badge from "../../shared/pk/Badge";
import Button from "../../shared/pk/Button";
import SearchBox from "../../shared/pk/SearchBox";
import SelectBox from "../../shared/pk/SelectBox";
import Tabs from "../../shared/pk/Tabs";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { degree, inLibrary, neighbours, searchNodes } from "../../domain/literaryMap";
import { SOURCE_KEYS, linkPhrase, yearsText } from "./mapText";

const PAGE = 60;
const KINDS = ["author", "work", "movement"];

/** A name in both scripts: the native one marked with its language, the English one after it. */
export function NodeName({ node, lang }) {
  const { native, en } = node.name;
  if (native && en && native !== en) {
    return (
      <>
        <span lang={lang || undefined}>{native}</span> <span className="pk-map-name__en">{en}</span>
      </>
    );
  }
  return <span lang={native && !en ? lang || undefined : undefined}>{native || en}</span>;
}

/** A node's links in plain sentences, grouped by what they say ("influenced: A, B"). */
export function NodeLinks({ graph, node, lang, onJump }) {
  const { t } = useLanguage();
  const groups = useMemo(() => {
    const map = new Map();
    neighbours(graph, node.id).forEach((n) => {
      const phrase = linkPhrase(n.link.type, n.outgoing);
      if (!map.has(phrase)) map.set(phrase, []);
      map.get(phrase).push(n);
    });
    // Strong statements first, "mentioned with" last.
    return [...map.entries()].sort((a, b) => (a[1][0].link.type === "mentioned") - (b[1][0].link.type === "mentioned"));
  }, [graph, node.id]);

  if (!groups.length) return <p className="pk-map-row__none">{t("maps.list.noLinks")}</p>;
  return (
    <dl className="pk-map-links">
      {groups.map(([phrase, items]) => {
        // When the whole group comes from one place, say so once, on its heading.
        const sources = new Set(items.map((i) => i.link.source));
        const shared = sources.size === 1 ? [...sources][0] : null;
        return (
        <div key={phrase} className="pk-map-links__group">
          <dt>
            {phrase}
            {shared && shared !== "wikidata" && <span className="pk-map-source">{t(SOURCE_KEYS[shared])}</span>}
          </dt>
          <dd>
            <ul>
              {items.map(({ node: other, link }) => (
                <li key={link.id}>
                  <button type="button" className="pk-map-links__name" onClick={() => onJump(other)}>
                    <NodeName node={other} lang={lang} />
                  </button>
                  {!shared && link.source !== "wikidata" && <span className="pk-map-source">{t(SOURCE_KEYS[link.source])}</span>}
                  {link.note && <p className="pk-map-links__note">{link.note}</p>}
                  {link.citation && (
                    <a className="pk-map-links__cite" href={link.citation} target="_blank" rel="noopener noreferrer">
                      {t("maps.list.citation")}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </dd>
        </div>
        );
      })}
    </dl>
  );
}

/**
 * The map as searchable, sortable lists of authors, works and movements, each
 * row opening to its links in plain sentences. Also the keyboard and
 * screen-reader way through a map.
 */
function MapListView({ graph, scope, books, canAdd, onAddBook, focusId, onEdit }) {
  const { t } = useLanguage();
  const lang = scope?.langCode;
  const focusNode = focusId ? graph.nodes.find((n) => n.id === focusId) : null;
  const [kind, setKind] = useState(focusNode?.kind || "author");
  const [queryText, setQueryText] = useState("");
  const [sort, setSort] = useState("connections");
  const [shown, setShown] = useState(PAGE);
  const [open, setOpen] = useState(() => new Set(focusNode ? [focusNode.id] : []));

  const scores = useMemo(() => degree(graph), [graph]);
  const owned = useMemo(() => inLibrary(graph, books), [graph, books]);
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);
  const counts = useMemo(() => Object.fromEntries(KINDS.map((k) => [k, graph.nodes.filter((n) => n.kind === k).length])), [graph]);

  const rows = useMemo(() => {
    if (queryText.trim()) return searchNodes(graph, queryText, 300).filter((n) => n.kind === kind);
    const list = graph.nodes.filter((n) => n.kind === kind);
    const name = (n) => (n.name.en || n.name.native).toLowerCase();
    const sorters = {
      connections: (a, b) => (scores.get(b.id) || 0) - (scores.get(a.id) || 0) || name(a).localeCompare(name(b)),
      name: (a, b) => name(a).localeCompare(name(b)),
      year: (a, b) => (a.years.from ?? 9999) - (b.years.from ?? 9999) || name(a).localeCompare(name(b)),
    };
    return [...list].sort(sorters[sort]);
  }, [graph, kind, queryText, sort, scores]);

  useEffect(() => setShown(PAGE), [kind, queryText, sort]);

  // Opening a linked node: switch to its list, open its row and bring it into view.
  const jump = (node) => {
    setKind(node.kind);
    setQueryText("");
    setOpen((s) => new Set(s).add(node.id));
    window.requestAnimationFrame(() => {
      const row = document.getElementById(`pk-map-row-${node.id}`);
      row?.scrollIntoView({ block: "center", behavior: "smooth" });
      row?.querySelector("button")?.focus({ preventScroll: true });
    });
  };
  useEffect(() => {
    if (focusNode) jump(focusNode);
    // Only when the URL names a node.
  }, [focusId]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id) =>
    setOpen((s) => {
      const next = new Set(s);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const detail = (node) => {
    if (node.kind === "work") {
      const authors = (node.authorIds || []).map((id) => byId.get(id)).filter(Boolean);
      return authors.map((a) => a.name.en || a.name.native).join(", ");
    }
    if (node.kind === "author") {
      const movements = neighbours(graph, node.id, { types: ["member_of"] }).map((n) => n.node.name.en || n.node.name.native);
      return movements.join(", ");
    }
    return t("maps.list.members", { count: neighbours(graph, node.id, { types: ["member_of"] }).length });
  };

  const tabs = KINDS.map((k) => ({ id: k, label: t(`maps.list.kind.${k}`, { count: counts[k] }) }));

  return (
    <div className="pk-map-list">
      <div className="pk-map-list__bar">
        <Tabs tabs={tabs} value={kind} onChange={setKind} label={t("maps.list.kinds")} />
        <div className="pk-map-list__tools">
          <SearchBox value={queryText} onChange={setQueryText} label={t("maps.list.search")} placeholder={t("maps.list.searchPlaceholder")} />
          <SelectBox
            label={t("maps.list.sort")}
            prefix={t("library.sort.prefix")}
            value={sort}
            onChange={setSort}
            options={[
              { value: "connections", label: t("maps.list.sortConnections") },
              { value: "name", label: t("maps.list.sortName") },
              { value: "year", label: t("maps.list.sortYear") },
            ]}
          />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="pk-map-row__none">{queryText ? t("maps.list.noMatch", { query: queryText }) : t("maps.list.emptyKind")}</p>
      ) : (
        <ul className="pk-map-rows" aria-label={t(`maps.list.kind.${kind}`, { count: rows.length })}>
          {rows.slice(0, shown).map((node) => {
            const isOpen = open.has(node.id);
            const bookId = owned.get(node.id);
            const years = yearsText(node.years, node.kind);
            const sub = detail(node);
            return (
              <li key={node.id} id={`pk-map-row-${node.id}`} className={isOpen ? "pk-map-row pk-map-row--open" : "pk-map-row"}>
                <button type="button" className="pk-map-row__head" aria-expanded={isOpen} onClick={() => toggle(node.id)}>
                  <span className="pk-map-row__name">
                    <NodeName node={node} lang={lang} />
                  </span>
                  <span className="pk-map-row__meta">
                    {[years, sub].filter(Boolean).join(" · ")}
                  </span>
                  {bookId && (
                    <Badge tone="success" icon={BookCheck} className="pk-map-row__badge">
                      {t("maps.list.inLibrary")}
                    </Badge>
                  )}
                  <ChevronDown size={16} aria-hidden="true" className="pk-map-row__chev" />
                </button>
                {isOpen && (
                  <div className="pk-map-row__body">
                    <NodeLinks graph={graph} node={node} lang={lang} onJump={jump} />
                    {node.note && <p className="pk-map-links__note">{node.note}</p>}
                    <div className="pk-map-row__actions">
                      {node.kind === "work" && !bookId && canAdd && (
                        <Button size="sm" icon={Plus} onClick={() => onAddBook(node)}>
                          {t("maps.list.addToLibrary")}
                        </Button>
                      )}
                      {node.qid && (
                        <a className="pk-map-row__ext" href={`https://www.wikidata.org/wiki/${node.qid}`} target="_blank" rel="noopener noreferrer">
                          {t("maps.list.onWikidata")} <ExternalLink size={12} aria-hidden="true" />
                        </a>
                      )}
                      {node.source === "user" && <span className="pk-map-source">{t(SOURCE_KEYS.user)}</span>}
                      {onEdit && (
                        <Button size="sm" variant="ghost" icon={Pencil} onClick={() => onEdit(node)}>
                          {t("maps.edit.edit")}
                        </Button>
                      )}
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {rows.length > shown && (
        <div className="pk-map-list__more">
          <Button variant="ghost" onClick={() => setShown((n) => n + PAGE)}>
            {t("maps.list.showMore", { count: Math.min(PAGE, rows.length - shown) })}
          </Button>
        </div>
      )}
    </div>
  );
}

export default MapListView;

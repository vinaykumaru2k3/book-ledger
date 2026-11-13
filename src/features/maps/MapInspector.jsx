import React, { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookCheck, ExternalLink, List, Plus, Route, X } from "lucide-react";
import Badge from "../../shared/pk/Badge";
import Button from "../../shared/pk/Button";
import SearchBox from "../../shared/pk/SearchBox";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { searchNodes } from "../../domain/literaryMap";
import { itemIntro } from "../../services/wikidataBooks";
import { NodeLinks, NodeName } from "./MapListView";
import { SOURCE_KEYS, yearsText } from "./mapText";

const INTRO_CHARS = 520;

/** The Wikipedia introduction of a node, read live and credited; nothing while it loads or when there is none. */
function Intro({ qid, lang }) {
  const { t } = useLanguage();
  const [state, setState] = useState({ qid: null, intro: null });

  useEffect(() => {
    if (!qid) return undefined;
    let live = true;
    setState({ qid: null, intro: null });
    itemIntro(qid, lang && lang !== "en" ? [lang, "en"] : ["en"])
      .then((intro) => live && setState({ qid, intro }))
      .catch(() => live && setState({ qid, intro: null }));
    return () => {
      live = false;
    };
  }, [qid, lang]);

  if (!qid) return null;
  if (state.qid !== qid) return <p className="pk-map-intro pk-map-intro--loading">{t("maps.inspector.introLoading")}</p>;
  const { intro } = state;
  if (!intro) return null;
  const text = intro.text.length > INTRO_CHARS ? `${intro.text.slice(0, INTRO_CHARS).replace(/\s+\S*$/, "")}…` : intro.text;
  return (
    <figure className="pk-map-intro">
      <blockquote lang={intro.lang}>{text}</blockquote>
      <figcaption>
        {t("maps.inspector.fromWikipedia")} ·{" "}
        <a href={intro.url} target="_blank" rel="noopener noreferrer">
          {t("maps.inspector.readMore")} <ExternalLink size={12} aria-hidden="true" />
        </a>
      </figcaption>
    </figure>
  );
}

/** "Trace to another author": pick an author, see the chain of influence between them. */
function PathFinder({ graph, node, lang, path, onPath, onJump }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const matches = useMemo(
    () => (query.trim() ? searchNodes(graph, query, 30).filter((n) => n.kind === "author" && n.id !== node.id).slice(0, 6) : []),
    [graph, query, node.id]
  );
  const byId = useMemo(() => new Map(graph.nodes.map((n) => [n.id, n])), [graph]);

  if (path) {
    const steps = path.ids.map((id) => byId.get(id)).filter(Boolean);
    return (
      <div className="pk-map-path" aria-live="polite">
        {steps.length ? (
          <>
            <p className="pk-map-path__head">
              {path.weak ? t("maps.inspector.pathWeak") : t("maps.inspector.pathFound", { count: steps.length - 1 })}
            </p>
            <ol className="pk-map-path__chain">
              {steps.map((s, i) => (
                <li key={s.id}>
                  {i > 0 && <ArrowRight size={12} aria-hidden="true" />}
                  <button type="button" className="pk-map-links__name" onClick={() => onJump(s)}>
                    <NodeName node={s} lang={lang} />
                  </button>
                </li>
              ))}
            </ol>
          </>
        ) : (
          <p className="pk-map-path__head">{t("maps.inspector.pathNone")}</p>
        )}
        <Button size="sm" variant="ghost" onClick={() => onPath(null)}>
          {t("maps.inspector.clearPath")}
        </Button>
      </div>
    );
  }

  return (
    <div className="pk-map-path">
      <SearchBox value={query} onChange={setQuery} label={t("maps.inspector.pathTo")} placeholder={t("maps.inspector.pathPlaceholder")} />
      {matches.length > 0 && (
        <ul className="pk-map-picks">
          {matches.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  onPath(m.id);
                }}
              >
                <NodeName node={m} lang={lang} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * Everything about one node of the map: its names in both scripts, years,
 * a live Wikipedia introduction, its links in sentences, and (for works)
 * whether it is in the reader's library.
 */
function MapInspector({ graph, node, lang, bookId, canAdd, onAddBook, onJump, onClose, onShowInList, path, onPath }) {
  const { t } = useLanguage();
  const years = yearsText(node.years, node.kind);

  return (
    <aside className="pk-map-inspector" aria-labelledby="pk-map-inspector-title">
      <header className="pk-map-inspector__head">
        <p className="pk-map-inspector__kind">
          {t(`maps.inspector.kind.${node.kind}`)}
          {years && ` · ${years}`}
        </p>
        <button type="button" className="pk-map-inspector__close" onClick={onClose} aria-label={t("maps.inspector.close")}>
          <X size={18} aria-hidden="true" />
        </button>
        <h3 id="pk-map-inspector-title" className="pk-map-inspector__title">
          <NodeName node={node} lang={lang} />
        </h3>
        {node.source === "user" && <span className="pk-map-source">{t(SOURCE_KEYS.user)}</span>}
      </header>

      {node.kind === "work" && (bookId || canAdd) && (
        <div className="pk-map-inspector__library">
          {bookId ? (
            <Badge tone="success" icon={BookCheck}>
              {t("maps.list.inLibrary")}
            </Badge>
          ) : (
            <Button size="sm" icon={Plus} onClick={() => onAddBook(node)}>
              {t("maps.list.addToLibrary")}
            </Button>
          )}
        </div>
      )}

      {node.note && <p className="pk-map-links__note">{node.note}</p>}
      <Intro qid={node.qid} lang={lang} />

      <NodeLinks graph={graph} node={node} lang={lang} onJump={onJump} />

      {node.kind === "author" && (
        <section className="pk-map-inspector__section">
          <h4>
            <Route size={14} aria-hidden="true" /> {t("maps.inspector.path")}
          </h4>
          <PathFinder graph={graph} node={node} lang={lang} path={path} onPath={onPath} onJump={onJump} />
        </section>
      )}

      <div className="pk-map-row__actions">
        <Button size="sm" variant="ghost" icon={List} onClick={() => onShowInList(node)}>
          {t("maps.inspector.showInList")}
        </Button>
        {node.qid && (
          <a className="pk-map-row__ext" href={`https://www.wikidata.org/wiki/${node.qid}`} target="_blank" rel="noopener noreferrer">
            {t("maps.list.onWikidata")} <ExternalLink size={12} aria-hidden="true" />
          </a>
        )}
      </div>
    </aside>
  );
}

export default MapInspector;

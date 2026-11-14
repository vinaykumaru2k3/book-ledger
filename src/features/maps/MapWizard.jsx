import React, { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, BookOpen, Check, Languages, Sparkles } from "lucide-react";
import { useBooks } from "../../app/AppContext";
import Button from "../../shared/pk/Button";
import EmptyState from "../../shared/pk/EmptyState";
import Field from "../../shared/pk/Field";
import SearchBox from "../../shared/pk/SearchBox";
import { MapIcon } from "../../shared/pk/NavIcons";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { countsOf, degree, normalizeMeta } from "../../domain/literaryMap";
import { LANGUAGES, SIZES, generateMap } from "../../services/literaryMapSource";
import { searchItems } from "../../services/wikidataBooks";
import { createMap } from "./useMapsController";
import { Progress } from "./MapProgress";

const KANNADA_SCRIPT = /[ಀ-೿]/;
const SORTED_LANGUAGES = [...LANGUAGES].sort((a, b) => a.label.localeCompare(b.label));

/** A big radio button: a choice with a line of explanation. */
function Choice({ name, value, checked, onChange, icon: Icon, title, body }) {
  return (
    <label className={checked ? "pk-map-choice pk-map-choice--on" : "pk-map-choice"}>
      <input type="radio" name={name} value={value} checked={checked} onChange={() => onChange(value)} />
      {Icon && <Icon size={20} aria-hidden="true" className="pk-map-choice__icon" />}
      <span className="pk-map-choice__text">
        <span className="pk-map-choice__title">{title}</span>
        {body && <span className="pk-map-choice__body">{body}</span>}
      </span>
    </label>
  );
}

/** Finds a movement or genre on Wikidata as you type. */
function MovementPicker({ value, onChange }) {
  const { t } = useLanguage();
  const [text, setText] = useState(value?.label || "");
  const [results, setResults] = useState([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const q = text.trim();
    if (q.length < 3 || q === value?.label) {
      setResults([]);
      return undefined;
    }
    let live = true;
    const timer = window.setTimeout(() => {
      setBusy(true);
      searchItems(q, 8)
        .then((items) => live && setResults(items))
        .catch(() => live && setResults([]))
        .finally(() => live && setBusy(false));
    }, 350);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [text, value?.label]);

  return (
    <div className="pk-map-picker">
      <SearchBox value={text} onChange={setText} label={t("maps.wizard.movementSearch")} placeholder={t("maps.wizard.movementPlaceholder")} />
      {busy && <p className="pk-map-picker__note">{t("maps.wizard.searching")}</p>}
      {results.length > 0 && (
        <ul className="pk-map-picker__results" aria-label={t("maps.wizard.movementResults")}>
          {results.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => {
                  onChange({ qid: item.id, label: item.label });
                  setText(item.label);
                  setResults([]);
                }}
              >
                <span className="pk-map-picker__label">{item.label}</span>
                {item.description && <span className="pk-map-picker__desc">{item.description}</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
      {value && (
        <p className="pk-map-picker__chosen">
          <Check size={14} aria-hidden="true" /> {t("maps.wizard.chosen", { name: value.label })}
        </p>
      )}
    </div>
  );
}

function LanguageSelect({ label, value, onChange, hint }) {
  return (
    <Field as="select" label={label} hint={hint} value={value} onChange={(e) => onChange(e.target.value)}>
      {SORTED_LANGUAGES.map((l) => (
        <option key={l.qid} value={l.code}>
          {l.label}
        </option>
      ))}
    </Field>
  );
}


/**
 * Make a map in four steps: what it covers, how big, generate (from Wikidata
 * and Wikipedia, with live progress), then name it and save.
 */
function MapWizard({ user, onDone, onCancel, onSignIn }) {
  const { t } = useLanguage();
  const { books } = useBooks();
  const kannadaShelf = useMemo(() => books.some((b) => KANNADA_SCRIPT.test(`${b.title}${b.author}`)), [books]);

  const [kind, setKind] = useState("language");
  const [langCode, setLangCode] = useState("kn");
  const [movement, setMovement] = useState(null);
  const [namesIn, setNamesIn] = useState(kannadaShelf ? "kn" : "en");
  const [size, setSize] = useState("focused");
  const [phase, setPhase] = useState("setup"); // setup | generating | review | saving
  const [progress, setProgress] = useState(null);
  const [graph, setGraph] = useState(null);
  const [error, setError] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState("private");
  const abortRef = useRef(null);

  useEffect(() => () => abortRef.current?.abort(), []);
  useEffect(() => setNamesIn(kannadaShelf ? "kn" : "en"), [kannadaShelf]);

  if (!user) {
    return (
      <EmptyState icon={MapIcon} title={t("maps.wizard.signInTitle")} action={onSignIn && <Button variant="primary" onClick={onSignIn}>{t("action.signIn")}</Button>}>
        {t("maps.wizard.signInBody")}
      </EmptyState>
    );
  }

  const language = LANGUAGES.find((l) => l.code === langCode);
  const scope =
    kind === "language"
      ? { kind, qid: language?.qid, label: language?.label, langCode }
      : kind === "movement"
        ? { kind, qid: movement?.qid, label: movement?.label, langCode: namesIn }
        : { kind, label: "", langCode: namesIn };
  const ready = kind === "language" ? Boolean(language) : kind === "movement" ? Boolean(movement) : books.length > 0;

  const defaultTitle = () =>
    kind === "language" ? t("maps.wizard.titleLanguage", { name: language.label }) : kind === "movement" ? movement.label : t("maps.wizard.titleLibrary");

  async function generate() {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setError("");
    setGraph(null);
    setProgress({ stage: "authors" });
    setPhase("generating");
    try {
      const result = await generateMap({ scope, size, books, onProgress: setProgress, signal: controller.signal });
      if (controller.signal.aborted) return;
      if (!result.nodes.some((n) => n.kind === "author")) {
        setError(t("maps.wizard.nothingFound"));
        setPhase("setup");
        return;
      }
      setGraph(result);
      setTitle((current) => current || defaultTitle());
      setPhase("review");
    } catch (e) {
      if (controller.signal.aborted || e?.name === "AbortError") return;
      setError(e?.code === "timeout" ? t("maps.wizard.timeout") : t("maps.wizard.failed"));
      setPhase("setup");
    }
  }

  function stop() {
    abortRef.current?.abort();
    setPhase("setup");
  }

  async function save(event) {
    event.preventDefault();
    setPhase("saving");
    setError("");
    try {
      const meta = normalizeMeta({ title: title || defaultTitle(), description, scope, visibility, ownerName: user.displayName || "" });
      const id = await createMap(user, meta, graph);
      onDone(id);
    } catch (e) {
      setError(e?.message?.startsWith("A map holds") ? e.message : t("maps.wizard.saveFailed"));
      setPhase("review");
    }
  }

  const topAuthors = graph
    ? (() => {
        const d = degree(graph);
        return graph.nodes
          .filter((n) => n.kind === "author")
          .sort((a, b) => (d.get(b.id) || 0) - (d.get(a.id) || 0))
          .slice(0, 12);
      })()
    : [];

  return (
    <section className="pk-map-wizard" aria-labelledby="pk-map-wizard-heading">
      <button type="button" className="pk-map-back" onClick={onCancel}>
        <ArrowLeft size={16} aria-hidden="true" /> {t("maps.backToGallery")}
      </button>
      <h2 id="pk-map-wizard-heading" className="pk-maps__heading">
        {t("maps.wizard.title")}
      </h2>

      {phase === "setup" && (
        <div className="pk-map-wizard__steps">
          <fieldset className="pk-map-step">
            <legend className="pk-map-step__legend">{t("maps.wizard.scopeStep")}</legend>
            <div className="pk-map-choices">
              <Choice name="scope" value="language" checked={kind === "language"} onChange={setKind} icon={Languages} title={t("maps.scope.language")} body={t("maps.scope.languageBody")} />
              <Choice name="scope" value="movement" checked={kind === "movement"} onChange={setKind} icon={Sparkles} title={t("maps.scope.movement")} body={t("maps.scope.movementBody")} />
              <Choice name="scope" value="library" checked={kind === "library"} onChange={setKind} icon={BookOpen} title={t("maps.scope.library")} body={t("maps.scope.libraryBody", { count: books.length })} />
            </div>

            {kind === "language" && <LanguageSelect label={t("maps.wizard.language")} value={langCode} onChange={setLangCode} />}
            {kind === "movement" && <MovementPicker value={movement} onChange={setMovement} />}
            {kind !== "language" && <LanguageSelect label={t("maps.wizard.namesIn")} hint={t("maps.wizard.namesInHint")} value={namesIn} onChange={setNamesIn} />}
            {kind === "library" && books.length === 0 && <p className="pk-maps__error">{t("maps.wizard.noBooks")}</p>}
          </fieldset>

          {kind !== "library" && (
            <fieldset className="pk-map-step">
              <legend className="pk-map-step__legend">{t("maps.wizard.sizeStep")}</legend>
              <div className="pk-map-choices pk-map-choices--row">
                {Object.entries(SIZES).map(([key, count]) => (
                  <Choice key={key} name="size" value={key} checked={size === key} onChange={setSize} title={t(`maps.size.${key}`)} body={t("maps.size.authors", { count })} />
                ))}
              </div>
            </fieldset>
          )}

          {error && (
            <p className="pk-maps__error" role="alert">
              {error}
            </p>
          )}
          <div className="pk-map-wizard__actions">
            <Button variant="ghost" onClick={onCancel}>
              {t("action.cancel")}
            </Button>
            <Button variant="primary" icon={Sparkles} disabled={!ready} onClick={generate}>
              {t("maps.wizard.generate")}
            </Button>
          </div>
          <p className="pk-map-wizard__note">{t("maps.wizard.sourcesNote")}</p>
        </div>
      )}

      {phase === "generating" && (
        <div className="pk-map-step">
          <p className="pk-map-step__legend">{t("maps.wizard.generating", { name: scope.label || t("maps.scope.library") })}</p>
          <Progress progress={progress} kind={kind} />
          <div className="pk-map-wizard__actions">
            <Button variant="ghost" onClick={stop}>
              {t("maps.wizard.stop")}
            </Button>
          </div>
        </div>
      )}

      {(phase === "review" || phase === "saving") && graph && (
        <form className="pk-map-wizard__steps" onSubmit={save}>
          <div className="pk-map-step">
            <p className="pk-map-step__legend">{t("maps.wizard.found")}</p>
            <p className="pk-map-progress__counts">
              {t("maps.countsWithLinks", countsOf(graph))}
            </p>
            <ul className="pk-map-preview" aria-label={t("maps.wizard.mostConnected")}>
              {topAuthors.map((a) => (
                <li key={a.id}>
                  {a.name.native && a.name.native !== a.name.en ? (
                    <>
                      <span lang={scope.langCode || undefined}>{a.name.native}</span>
                      {a.name.en && <span className="pk-map-preview__en"> {a.name.en}</span>}
                    </>
                  ) : (
                    a.name.en
                  )}
                </li>
              ))}
            </ul>
            {!graph.links.some((l) => l.type === "influenced" || l.type === "student_of") && <p className="pk-map-wizard__note">{t("maps.wizard.fewInfluences")}</p>}
          </div>

          <div className="pk-map-step">
            <p className="pk-map-step__legend">{t("maps.wizard.finishStep")}</p>
            <Field label={t("maps.field.title")} value={title} maxLength={120} required onChange={(e) => setTitle(e.target.value)} />
            <Field as="textarea" label={t("maps.field.description")} hint={t("maps.field.descriptionHint")} value={description} maxLength={1000} rows={3} onChange={(e) => setDescription(e.target.value)} />
            <div className="pk-map-choices pk-map-choices--row" role="radiogroup" aria-label={t("maps.field.visibility")}>
              <Choice name="visibility" value="private" checked={visibility === "private"} onChange={setVisibility} title={t("maps.private")} body={t("maps.privateBody")} />
              <Choice name="visibility" value="public" checked={visibility === "public"} onChange={setVisibility} title={t("maps.public")} body={t("maps.publicBody")} />
            </div>
          </div>

          {error && (
            <p className="pk-maps__error" role="alert">
              {error}
            </p>
          )}
          <div className="pk-map-wizard__actions">
            <Button variant="ghost" onClick={() => setPhase("setup")} disabled={phase === "saving"}>
              {t("maps.wizard.startOver")}
            </Button>
            <Button variant="primary" type="submit" loading={phase === "saving"}>
              {t("maps.wizard.save")}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}

export default MapWizard;

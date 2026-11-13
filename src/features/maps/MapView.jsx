import React, { useMemo, useState } from "react";
import { ArrowLeft, Globe2, Lock, Trash2 } from "lucide-react";
import { useBooks, useModal, useUi } from "../../app/AppContext";
import Badge from "../../shared/pk/Badge";
import Button from "../../shared/pk/Button";
import Dialog from "../../shared/pk/Dialog";
import EmptyState from "../../shared/pk/EmptyState";
import Skeleton from "../../shared/pk/Skeleton";
import { MapIcon } from "../../shared/pk/NavIcons";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { visibleGraph } from "../../domain/literaryMap";
import { deleteMap, updateMapMeta, useMapDocument } from "./useMapsController";
import MapListView from "./MapListView";
import { scopeLabel } from "./mapText";

/** One literary map: its header (what, whose, how big) and its views. */
function MapView({ mapId, section, sub, user, navigate }) {
  const { t } = useLanguage();
  const { status, meta, graph } = useMapDocument(mapId, user);
  const { books } = useBooks();
  const { quickAdd } = useModal();
  const { notify } = useUi();
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const shown = useMemo(() => (graph ? visibleGraph(graph) : null), [graph]);

  const back = (
    <button type="button" className="pk-map-back" onClick={() => navigate("/maps")}>
      <ArrowLeft size={16} aria-hidden="true" /> {t("maps.backToGallery")}
    </button>
  );

  if (status === "loading") {
    return (
      <section className="pk-map" aria-busy="true">
        {back}
        <Skeleton width="40%" height={28} />
        <Skeleton shape="block" height={320} />
      </section>
    );
  }
  if (status !== "ready") {
    return (
      <section className="pk-map">
        {back}
        <EmptyState icon={MapIcon} title={t(status === "missing" ? "maps.missing" : "maps.loadFailed")}>
          {t(status === "missing" ? "maps.missingBody" : "maps.loadFailedBody")}
        </EmptyState>
      </section>
    );
  }

  const mine = user?.uid === meta.ownerId;
  const isPublic = meta.visibility === "public";
  const { authors, works, movements, links } = meta.counts;

  async function toggleVisibility() {
    setBusy(true);
    try {
      await updateMapMeta(mapId, { visibility: isPublic ? "private" : "public" });
      notify(t(isPublic ? "maps.madePrivate" : "maps.madePublic"));
    } catch {
      notify(t("maps.saveFailed"), "error");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await deleteMap(mapId);
      notify(t("maps.deleted", { title: meta.title }));
      navigate("/maps");
    } catch {
      notify(t("maps.saveFailed"), "error");
      setBusy(false);
    }
  }

  // A work from the map goes into the library as a book linked to its Wikidata item.
  function addBook(work) {
    const author = (work.authorIds || []).map((id) => graph.nodes.find((n) => n.id === id)).find(Boolean);
    quickAdd({
      title: work.name.native || work.name.en,
      author: author ? author.name.native || author.name.en : "",
      publishedYear: work.years.from ? String(work.years.from) : "",
      sourceKey: work.qid ? `wd:${work.qid}` : "",
      status: "want",
    });
  }

  return (
    <section className="pk-map" aria-labelledby="pk-map-title">
      {back}
      <header className="pk-map__head">
        <div className="pk-map__heading">
          <p className="pk-map-card__scope">{scopeLabel(meta.scope, t)}</p>
          <h2 id="pk-map-title" className="pk-maps__heading">
            {meta.title}
          </h2>
          {meta.description && <p className="pk-maps__lede">{meta.description}</p>}
          <p className="pk-map__facts">
            {t("maps.countsWithLinks", { authors, works, movements, links })}
            {" · "}
            {mine ? t("maps.yours") : meta.ownerName ? t("maps.by", { name: meta.ownerName }) : t("maps.byReader")}
          </p>
        </div>
        <div className="pk-map__actions">
          <Badge tone={isPublic ? "accent" : "neutral"} icon={isPublic ? Globe2 : Lock}>
            {t(isPublic ? "maps.public" : "maps.private")}
          </Badge>
          {mine && (
            <>
              <Button size="sm" onClick={toggleVisibility} loading={busy}>
                {t(isPublic ? "maps.makePrivate" : "maps.makePublic")}
              </Button>
              <Button size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirmDelete(true)} disabled={busy}>
                {t("maps.delete")}
              </Button>
            </>
          )}
        </div>
      </header>

      <MapListView
        graph={shown}
        scope={meta.scope}
        books={user ? books : []}
        canAdd={Boolean(user)}
        onAddBook={addBook}
        focusId={section === "node" ? sub : undefined}
      />

      {confirmDelete && (
        <Dialog
          title={t("maps.deleteTitle")}
          size="sm"
          onClose={() => setConfirmDelete(false)}
          footer={
            <>
              <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
                {t("action.cancel")}
              </Button>
              <Button variant="danger" onClick={remove} loading={busy}>
                {t("maps.delete")}
              </Button>
            </>
          }
        >
          <p>{t("maps.deleteBody", { title: meta.title })}</p>
        </Dialog>
      )}
    </section>
  );
}

export default MapView;

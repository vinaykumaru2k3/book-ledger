import React, { useEffect, useId, useRef, useState } from "react";
import { Loader2, Plus, X } from "lucide-react";
import BookCover from "../../shared/pk/BookCover";
import Button from "../../shared/pk/Button";
import Dialog from "../../shared/pk/Dialog";
import RatingStars from "../../shared/pk/RatingStars";
import { formFromBook } from "../../domain/book";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useApp, useBooks, useModal, useUi } from "../../app/AppContext";
import StatusChip from "./StatusChip";
import BookControls from "./details/BookControls";
import FinishedBurst from "./details/FinishedBurst";
import NotesEditor from "./details/NotesEditor";
import { useCoverTint } from "./details/useCoverTint";
import { useBookDescription } from "./useBookDescription";

function ChipList({ label, items }) {
  if (!items?.length) return null;
  return (
    <div className="pk-details__chips">
      <span className="pk-details__label">{label}</span>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

/** Watches a book's status and reports the moment it becomes "done". */
function useJustFinished(status) {
  const previous = useRef(status);
  const [just, setJust] = useState(false);

  useEffect(() => {
    let timer;
    if (previous.current !== "done" && status === "done") {
      setJust(true);
      timer = setTimeout(() => setJust(false), 2600);
    }
    previous.current = status;
    return () => clearTimeout(timer);
  }, [status]);

  return just;
}

function BookDetails({ book, onClose }) {
  const { t } = useLanguage();
  const { books } = useBooks();
  const { quickAdd } = useModal();
  const { openEditBook } = useUi();

  // Always show the library's current copy so edits appear immediately.
  const live = books.find((item) => item.id === book.id) || book;
  const inLibrary = books.some((item) => item.id === book.id);
  const tint = useCoverTint(live);
  const { description, loading } = useBookDescription(live);
  const finished = useJustFinished(live.status);
  const titleId = useId();

  return (
    <Dialog bare size="lg" className="pk-dialog--details" title={live.title} labelledBy={titleId} closeLabel={t("details.close")} onClose={onClose}>
      <article className="pk-details" style={{ "--tint": tint }}>
        <button type="button" className="pk-icon-btn pk-details__close" onClick={onClose} aria-label={t("details.close")}>
          <X size={20} aria-hidden="true" />
        </button>

        <header className="pk-details__hero">
          <div className="pk-details__cover">
            <BookCover book={live} size="lg" />
          </div>
          <div className="pk-details__head">
            <div className="pk-details__badges">
              <StatusChip status={live.status} />
              {finished && <FinishedBurst />}
            </div>
            <h2 id={titleId} className="pk-details__title">
              {live.title}
            </h2>
            <p className="pk-details__author">{live.author || t("book.unknownAuthor")}</p>
            <p className="pk-details__meta">
              {[
                live.publishedYear && t("details.published", { year: live.publishedYear }),
                live.pages ? t("book.pages", { count: live.pages }) : null,
                live.isbn && t("details.isbn", { isbn: live.isbn }),
              ]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {!inLibrary && (
              <RatingStars readOnly value={live.rating} label={t("details.rating")} starLabel={(n) => String(n)} />
            )}
          </div>
        </header>

        <div className="pk-details__body">
          {inLibrary ? (
            <BookControls
              book={live}
              onEditAll={() => {
                onClose();
                openEditBook(live);
              }}
            />
          ) : (
            <div className="pk-details__add">
              <p>{t("details.notInLibrary")}</p>
              <Button
                variant="primary"
                icon={Plus}
                onClick={async () => {
                  await quickAdd(formFromBook(live));
                }}
              >
                {t("details.addToLibrary")}
              </Button>
            </div>
          )}

          <ChipList label={t("details.genres")} items={live.genres} />
          <ChipList label={t("details.tags")} items={live.tags} />

          <section className="pk-details__section" aria-label={t("details.about")}>
            <h3 className="pk-details__label">{t("details.about")}</h3>
            {loading ? (
              <p className="pk-details__loading">
                <Loader2 size={16} className="pk-spin" aria-hidden="true" /> {t("details.loadingDescription")}
              </p>
            ) : description ? (
              <p className="pk-details__text">{description}</p>
            ) : (
              <p className="pk-details__muted">{t("details.noDescription")}</p>
            )}
          </section>

          {inLibrary && <NotesEditor book={live} />}
        </div>
      </article>
    </Dialog>
  );
}

/** The details dialog for the book chosen with `openDetails` (nothing when none is open). */
function BookDetailsModal() {
  const { detailsBook } = useApp();
  const { closeDetails } = useUi();
  if (!detailsBook) return null;
  return <BookDetails book={detailsBook} onClose={closeDetails} />;
}

export default BookDetailsModal;

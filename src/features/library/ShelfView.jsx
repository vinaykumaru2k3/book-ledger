import React from "react";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useUi } from "../../app/AppContext";
import BookSpine from "../../shared/pk/BookSpine";

/** Books standing spine-out on wooden shelves. Click a spine to open the book. */
function ShelfView({ books }) {
  const { t } = useLanguage();
  const { openDetails } = useUi();

  return (
    <div className="pk-shelfview" role="list">
      {books.map((book) => (
        <div className="pk-shelfslot" role="listitem" key={book.id}>
          <BookSpine book={book} onOpen={openDetails} label={t("book.open", { title: book.title })} />
        </div>
      ))}
    </div>
  );
}

export default ShelfView;

import React, { useEffect, useRef, useState } from "react";
import { Import, Loader2, Plus } from "lucide-react";
import Cover from "../../../shared/ui/Cover";
import Button from "../../../shared/ui/Button";
import SearchField from "../../../shared/ui/SearchField";
import SelectField from "../../../shared/ui/SelectField";
import { findDuplicate } from "../../../domain/library";
import { useBookSearch } from "./useBookSearch";

const SEARCH_TYPES = [
  { value: "all", label: "General Search" },
  { value: "title", label: "By Title" },
  { value: "author", label: "By Author" },
  { value: "genre", label: "By Genre/Subject" },
];

function ResultRow({ volume, alreadyAdded, onFill, onQuickAdd }) {
  const info = volume.volumeInfo || {};
  const authors = info.authors?.join(", ") || "";
  const description = info.description ? info.description.replace(/<[^>]*>/g, "").slice(0, 100) : "";
  const thumbnail = info.imageLinks?.smallThumbnail || info.imageLinks?.thumbnail || "";
  const preview = {
    title: info.title || "Untitled",
    author: authors || "Unknown Author",
    coverUrl: thumbnail.replace(/^http:\/\//, "https://"),
  };

  return (
    <div className="dropdown-result-row">
      <Cover book={preview} className="tiny" />
      <div className="result-details">
        <strong>{info.title}</strong>
        <span>
          {authors || "Unknown Author"}
          {info.publishedDate ? ` • ${info.publishedDate.split("-")[0]}` : ""}
          {info.pageCount ? ` • ${info.pageCount}p` : ""}
        </span>
        {description && <span className="result-desc">{description}…</span>}
        {info.categories?.length > 0 && (
          <div className="result-genres">
            {info.categories.slice(0, 3).map((category) => (
              <span key={category} className="genre-chip">
                {category}
              </span>
            ))}
          </div>
        )}
      </div>
      <div className="result-actions">
        <Button compact icon={Import} iconSize={14} className="use-result-btn" onClick={() => onFill(volume)}>
          Fill Form
        </Button>
        <Button
          compact
          variant="primary"
          icon={Plus}
          iconSize={14}
          className="quick-add-btn"
          disabled={alreadyAdded}
          onClick={() => onQuickAdd(volume)}
        >
          {alreadyAdded ? "Added" : "Quick Add"}
        </Button>
      </div>
    </div>
  );
}

/**
 * Search box with a results dropdown. Picking "Fill Form" or "Quick Add" is
 * delegated to the parent, which knows what to do with the chosen volume.
 */
function BookLookup({ books, onFill, onQuickAdd }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const { results, searching, error } = useBookSearch(query, type);

  // Open the dropdown whenever a search finishes with something to show.
  useEffect(() => {
    if (!searching && (results.length > 0 || error)) setOpen(true);
    if (!query.trim()) setOpen(false);
  }, [results, error, searching, query]);

  // Close when clicking anywhere outside the search box.
  useEffect(() => {
    const onPointerDown = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const choose = (action) => async (volume) => {
    await action(volume);
    setOpen(false);
  };

  return (
    <div className="lookup-section">
      <div className="lookup-controls">
        <div className="search-field-container" ref={containerRef}>
          <SearchField
            value={query}
            onChange={setQuery}
            label="Search for a book"
            placeholder="Search title, author, transliterated names..."
            onFocus={() => (results.length > 0 || error) && setOpen(true)}
          >
            {searching && <Loader2 className="spin search-spinner" size={18} />}
          </SearchField>

          {open && (results.length > 0 || error) && (
            <div className="search-dropdown-menu">
              {error ? (
                <div className="dropdown-message error">{error}</div>
              ) : (
                results.map((volume) => {
                  const info = volume.volumeInfo || {};
                  const alreadyAdded = Boolean(
                    findDuplicate(books, {
                      sourceKey: volume.id,
                      title: info.title,
                      author: info.authors?.join(", "),
                    })
                  );
                  return (
                    <ResultRow
                      key={volume.id}
                      volume={volume}
                      alreadyAdded={alreadyAdded}
                      onFill={choose(onFill)}
                      onQuickAdd={choose(onQuickAdd)}
                    />
                  );
                })
              )}
            </div>
          )}
        </div>

        <SelectField
          className="search-type-select"
          label="Search by"
          value={type}
          onChange={setType}
          options={SEARCH_TYPES}
          chevron={false}
        />
      </div>
    </div>
  );
}

export default BookLookup;

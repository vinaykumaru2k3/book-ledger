import React, { useState, useEffect, useMemo, useCallback } from "react";
import { X, Search, Loader2, Plus, Import, Sparkles, BookOpen, Tags, AlertTriangle } from "lucide-react";
import Cover from "./Cover";
import Rating from "./Rating";
import { STATUSES } from "./constants";
import { useBooks, useModal } from "../context/AppContext";

function formFromGoogleVolume(volume) {
  const info = volume.volumeInfo || {};
  const title = info.title || "";
  const author = info.authors?.join(", ") || "";
  const pages = info.pageCount ? String(info.pageCount) : "";
  const publishedYear = info.publishedDate ? info.publishedDate.split("-")[0] : "";
  
  // Clean up ISBN
  const isbn = info.industryIdentifiers?.find(
    (id) => id.type === "ISBN_13" || id.type === "ISBN_10"
  )?.identifier || "";

  // Upgrade image links to https and request hi-res (zoom=2)
  let coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || "";
  if (coverUrl && coverUrl.startsWith("http://")) {
    coverUrl = coverUrl.replace("http://", "https://");
  }
  if (coverUrl) {
    coverUrl = coverUrl.replace(/&zoom=\d/, "&zoom=2");
    if (!coverUrl.includes("zoom=")) {
      coverUrl += (coverUrl.includes("?") ? "&" : "?") + "zoom=2";
    }
  }

  // Categories as tags (comma-separated for the form)
  const tags = info.categories?.join(", ") || "";
  
  // Genres extracted from categories (stored as separate field)
  const genres = info.categories?.join(", ") || "";

  // Description from API (separate from user notes)
  const description = info.description ? info.description.slice(0, 2000) : "";

  return {
    title,
    author,
    pages,
    currentPage: "0",
    status: "want",
    rating: 0,
    tags,
    notes: "",
    description,
    genres,
    publishedYear,
    isbn,
    coverId: null,
    coverUrl,
    sourceKey: volume.id || "",
  };
}

function BookModal() {
  const { books } = useBooks();
  const { editing, form, onFormChange, onSubmit, onClose, quickAdd } = useModal();
  const [newShelfName, setNewShelfName] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("all"); // all, title, author, genre
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null); // { title, author } of matched book

  const uniqueShelves = useMemo(() => {
    const list = new Set();
    books.forEach((book) => {
      if (Array.isArray(book.shelves)) {
        book.shelves.forEach((s) => list.add(s));
      }
    });
    return Array.from(list).sort();
  }, [books]);

  const displayedShelves = useMemo(() => {
    const set = new Set(uniqueShelves);
    if (form && Array.isArray(form.shelves)) {
      form.shelves.forEach((s) => set.add(s));
    }
    return Array.from(set).sort();
  }, [uniqueShelves, form?.shelves]);

  const existingKeys = useMemo(
    () => new Set(books.map((book) => book.sourceKey).filter(Boolean)),
    [books]
  );

  // Build a lookup map of normalized "title|author" -> book for title+author duplicate detection
  const existingTitleAuthors = useMemo(() => {
    const map = new Map();
    books.forEach((book) => {
      const key = `${(book.title || "").trim().toLowerCase()}|${(book.author || "").trim().toLowerCase()}`;
      if (key !== "|") map.set(key, book);
    });
    return map;
  }, [books]);

  // Find a duplicate book by sourceKey or title+author
  const findDuplicate = useCallback((sourceKey, title, author) => {
    if (sourceKey && existingKeys.has(sourceKey)) {
      return books.find((b) => b.sourceKey === sourceKey) || null;
    }
    const key = `${(title || "").trim().toLowerCase()}|${(author || "").trim().toLowerCase()}`;
    if (key !== "|" && existingTitleAuthors.has(key)) {
      return existingTitleAuthors.get(key);
    }
    return null;
  }, [books, existingKeys, existingTitleAuthors]);

  // Check for duplicates when form title or author changes
  useEffect(() => {
    if (!form || editing) { setDuplicateWarning(null); return; }
    const dup = findDuplicate(form.sourceKey, form.title, form.author);
    setDuplicateWarning(dup ? { title: dup.title, author: dup.author, status: dup.status } : null);
  }, [form?.title, form?.author, form?.sourceKey, editing, findDuplicate]);

  // Auto-suggest autocomplete logic with debounce
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 3) {
      setSearchResults([]);
      setSearchError("");
      setShowDropdown(false);
      return;
    }

    console.log("Starting search query for:", searchQuery, "with type:", searchType);

    // Debounce to 750ms to prevent rapid query rate limits (HTTP 429) on Google Books
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      try {
        let q = searchQuery.trim();
        if (searchType === "title") {
          q = `intitle:${q}`;
        } else if (searchType === "author") {
          q = `inauthor:${q}`;
        } else if (searchType === "genre") {
          q = `subject:${q}`;
        }

        const googleUrl = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q)}&maxResults=8`;
        console.log("Fetching Google Books URL:", googleUrl);

        let response = await fetch(googleUrl);
        console.log("Google Books response status:", response.status);
        
        // Handle Google Books Rate Limit (HTTP 429) by silently falling back to Open Library
        if (response.status === 429) {
          console.warn("Google Books API rate limited (429). Falling back to Open Library...");
          const fieldsParam = "&fields=key,title,author_name,number_of_pages_median,first_publish_year,subject,cover_i,isbn";
          let olUrl = `https://openlibrary.org/search.json?limit=8&q=${encodeURIComponent(searchQuery.trim())}${fieldsParam}`;
          if (searchType === "title") {
            olUrl = `https://openlibrary.org/search.json?limit=8&title=${encodeURIComponent(searchQuery.trim())}${fieldsParam}`;
          } else if (searchType === "author") {
            olUrl = `https://openlibrary.org/search.json?limit=8&author=${encodeURIComponent(searchQuery.trim())}${fieldsParam}`;
          } else if (searchType === "genre") {
            olUrl = `https://openlibrary.org/search.json?limit=8&subject=${encodeURIComponent(searchQuery.trim())}${fieldsParam}`;
          }
          console.log("Fetching Open Library fallback URL:", olUrl);
          
          response = await fetch(olUrl);
          console.log("Open Library response status:", response.status);
          
          if (!response.ok) throw new Error(`Open Library API returned status ${response.status}`);
          
          const olData = await response.json();
          console.log("Open Library payload received:", olData);
          
          if (olData.docs && olData.docs.length > 0) {
            const mappedResults = olData.docs.map((doc) => ({
              id: doc.key,
              volumeInfo: {
                title: doc.title || "Untitled",
                authors: doc.author_name || [],
                pageCount: doc.number_of_pages_median || "",
                publishedDate: doc.first_publish_year ? String(doc.first_publish_year) : "",
                categories: doc.subject ? doc.subject.slice(0, 3) : [],
                imageLinks: doc.cover_i ? {
                  thumbnail: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`
                } : null,
                industryIdentifiers: doc.isbn ? [{ type: "ISBN_13", identifier: doc.isbn[0] }] : []
              }
            }));
            setSearchResults(mappedResults);
            setShowDropdown(true);
            setSearchError("");
          } else {
            setSearchResults([]);
            setSearchError("No matching books found (Open Library fallback).");
            setShowDropdown(true);
          }
          return;
        }
        
        if (!response.ok) throw new Error(`Google Books API returned status ${response.status}`);
        
        const data = await response.json();
        console.log("Google Books payload received:", data);

        if (data.items && data.items.length > 0) {
          setSearchResults(data.items);
          setShowDropdown(true);
          setSearchError("");
        } else {
          setSearchResults([]);
          setSearchError("No matching books found.");
          setShowDropdown(true);
        }
      } catch (err) {
        console.error("Search failed:", err);
        setSearchResults([]);
        if (!navigator.onLine) {
          setSearchError("Search failed: You are offline. Check your internet connection.");
        } else {
          setSearchError(`Search failed: ${err.message || "Network issue"}`);
        }
        setShowDropdown(true);
      } finally {
        setSearching(false);
      }
    }, 750);

    return () => clearTimeout(timer);
  }, [searchQuery, searchType]);

  function patchForm(patch) {
    onFormChange((current) => ({ ...current, ...patch }));
  }

  async function fetchOpenLibraryDescription(workKey) {
    try {
      const response = await fetch(`https://openlibrary.org${workKey}.json`);
      if (response.ok) {
        const workData = await response.json();
        let desc = "";
        if (typeof workData.description === "string") {
          desc = workData.description;
        } else if (workData.description && typeof workData.description.value === "string") {
          desc = workData.description.value;
        }
        return desc;
      }
    } catch (e) {
      console.error("Failed to fetch Open Library work description:", e);
    }
    return "";
  }

  async function fetchFullGoogleVolume(volumeId) {
    try {
      const res = await fetch(`https://www.googleapis.com/books/v1/volumes/${volumeId}`);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.error("Failed to fetch full Google Books volume info:", e);
    }
    return null;
  }

  // Enrich a form with OpenLibrary data when Google Books is missing pages/description/genres
  async function enrichWithOpenLibrary(matchedForm) {
    try {
      const q = encodeURIComponent(`${matchedForm.title} ${matchedForm.author}`.trim());
      const fieldsParam = "&fields=key,title,author_name,number_of_pages_median,first_publish_year,subject,cover_i,isbn";
      const res = await fetch(`https://openlibrary.org/search.json?limit=1&q=${q}${fieldsParam}`);
      if (!res.ok) return matchedForm;
      const data = await res.json();
      const doc = data.docs?.[0];
      if (!doc) return matchedForm;

      // Fill pages if missing
      if (!matchedForm.pages && doc.number_of_pages_median) {
        matchedForm.pages = String(doc.number_of_pages_median);
      }

      // Fill genres if missing
      if (!matchedForm.genres && doc.subject?.length) {
        matchedForm.genres = doc.subject.slice(0, 5).join(", ");
        if (!matchedForm.tags) matchedForm.tags = doc.subject.slice(0, 3).join(", ");
      }

      // Fill description if missing, from the work endpoint
      if (!matchedForm.description && doc.key) {
        const desc = await fetchOpenLibraryDescription(doc.key);
        if (desc) matchedForm.description = desc.slice(0, 2000);
      }

      // Fill cover if missing
      if (!matchedForm.coverUrl && doc.cover_i) {
        matchedForm.coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
      }
    } catch (e) {
      console.error("OpenLibrary enrichment failed:", e);
    }
    return matchedForm;
  }

  async function handleSelectResult(volume) {
    let finalVolume = volume;
    if (!volume.id.startsWith("/works/")) {
      const full = await fetchFullGoogleVolume(volume.id);
      if (full) finalVolume = full;
    }

    let matchedForm = formFromGoogleVolume(finalVolume);
    
    // If it came from Open Library fallback, fetch full description
    if (volume.id.startsWith("/works/")) {
      const desc = await fetchOpenLibraryDescription(volume.id);
      if (desc) {
        matchedForm.description = desc.slice(0, 2000);
      }
    }

    // Enrich with OpenLibrary if Google Books data is incomplete
    if (!matchedForm.pages || !matchedForm.description || !matchedForm.genres) {
      matchedForm = await enrichWithOpenLibrary(matchedForm);
    }
    
    onFormChange((current) => ({
      ...matchedForm,
      // Retain existing user fields
      status: current.status || matchedForm.status,
      currentPage: current.currentPage || matchedForm.currentPage,
      rating: current.rating || matchedForm.rating,
      notes: current.notes || matchedForm.notes,
      shelves: current.shelves && current.shelves.length > 0 ? current.shelves : (matchedForm.shelves || []),
      // Retain manual title/author overrides if present
      title: current.title && current.title.trim() ? current.title : matchedForm.title,
      author: current.author && current.author.trim() ? current.author : matchedForm.author,
    }));
    
    setShowDropdown(false);
  }

  async function handleQuickAdd(volume) {
    let finalVolume = volume;
    if (!volume.id.startsWith("/works/")) {
      const full = await fetchFullGoogleVolume(volume.id);
      if (full) finalVolume = full;
    }

    let matchedForm = formFromGoogleVolume(finalVolume);
    
    if (volume.id.startsWith("/works/")) {
      const desc = await fetchOpenLibraryDescription(volume.id);
      if (desc) {
        matchedForm.description = desc.slice(0, 2000);
      }
    }

    // Enrich with OpenLibrary if Google Books data is incomplete
    if (!matchedForm.pages || !matchedForm.description || !matchedForm.genres) {
      matchedForm = await enrichWithOpenLibrary(matchedForm);
    }
    
    await quickAdd(matchedForm);
    setShowDropdown(false);
  }

  if (!form) return null;

  return (
    <div className="modal-backdrop" onClick={() => setShowDropdown(false)}>
      <section 
        className="modal" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="book-modal-title"
        onClick={(e) => e.stopPropagation()} // Prevent close on clicking inside modal
      >
        <div className="modal-header">
          <div>
            <p className="section-kicker">{editing ? "Update Ledger" : "New Addition"}</p>
            <h2 id="book-modal-title">{editing ? "Modify Book Details" : "Add to Library"}</h2>
          </div>
          <button className="icon-button close-btn" onClick={onClose} aria-label="Close" title="Close" type="button">
            <X size={19} />
          </button>
        </div>

        {!editing && (
          <div className="lookup-section">
            <div className="lookup-controls">
              <div className="search-field-container">
                <div className="search-field">
                  <Search size={18} />
                  <input
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Search title, author, transliterated names..."
                    onFocus={() => {
                      if (searchResults.length > 0 || searchError) setShowDropdown(true);
                    }}
                  />
                  {searching && <Loader2 className="spin search-spinner" size={18} />}
                </div>

                {showDropdown && (searchResults.length > 0 || searchError) && (
                  <div className="search-dropdown-menu">
                    {searchError ? (
                      <div className="dropdown-message error">{searchError}</div>
                    ) : (
                      searchResults.map((volume) => {
                        const volumeInfo = volume.volumeInfo || {};
                        const isAddedByKey = existingKeys.has(volume.id);
                        const volTitle = volumeInfo.title || "";
                        const volAuthor = volumeInfo.authors?.join(", ") || "";
                        const isAddedByTitle = !!findDuplicate(null, volTitle, volAuthor);
                        const isAdded = isAddedByKey || isAddedByTitle;
                        const coverUrl = volumeInfo.imageLinks?.smallThumbnail || volumeInfo.imageLinks?.thumbnail || "";
                        let hiResCover = coverUrl.startsWith("http://") ? coverUrl.replace("http://", "https://") : coverUrl;
                        const tempBook = {
                          title: volumeInfo.title || "Untitled",
                          author: volumeInfo.authors?.join(", ") || "Unknown Author",
                          coverUrl: hiResCover,
                        };
                        const descSnippet = volumeInfo.description
                          ? volumeInfo.description.replace(/<[^>]*>/g, "").slice(0, 100)
                          : "";
                        const categories = volumeInfo.categories || [];
                        const pageCount = volumeInfo.pageCount;

                        return (
                          <div key={volume.id} className="dropdown-result-row">
                            <Cover book={tempBook} className="tiny" />
                            <div className="result-details">
                              <strong>{volumeInfo.title}</strong>
                              <span>
                                {volumeInfo.authors?.join(", ") || "Unknown Author"} 
                                {volumeInfo.publishedDate ? ` • ${volumeInfo.publishedDate.split("-")[0]}` : ""}
                                {pageCount ? ` • ${pageCount}p` : ""}
                              </span>
                              {descSnippet && (
                                <span className="result-desc">{descSnippet}…</span>
                              )}
                              {categories.length > 0 && (
                                <div className="result-genres">
                                  {categories.slice(0, 3).map((cat) => (
                                    <span key={cat} className="genre-chip">{cat}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="result-actions">
                              <button 
                                className="button ghost compact use-result-btn" 
                                onClick={() => handleSelectResult(volume)} 
                                type="button"
                              >
                                <Import size={14} />
                                <span>Fill Form</span>
                              </button>
                              <button
                                className="button primary compact quick-add-btn"
                                disabled={isAdded}
                                onClick={() => handleQuickAdd(volume)}
                                type="button"
                              >
                                <Plus size={14} />
                                <span>{isAdded ? "Added" : "Quick Add"}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              <div className="select-wrap search-type-select">
                <select value={searchType} onChange={(event) => setSearchType(event.target.value)}>
                  <option value="all">General Search</option>
                  <option value="title">By Title</option>
                  <option value="author">By Author</option>
                  <option value="genre">By Genre/Subject</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {duplicateWarning && (
          <div className="duplicate-warning">
            <AlertTriangle size={16} />
            <span>
              <strong>{duplicateWarning.title}</strong>{duplicateWarning.author ? ` by ${duplicateWarning.author}` : ""} is already in your library
              {duplicateWarning.status ? ` (${STATUSES[duplicateWarning.status]?.longLabel || duplicateWarning.status})` : ""}.
              You can still save if this is a different edition.
            </span>
          </div>
        )}

        <form className="book-form" onSubmit={onSubmit}>
          <div className="form-cover-preview">
            <Cover
              book={{
                title: form.title || "Preview",
                author: form.author || "",
                coverUrl: form.coverUrl || "",
              }}
            />
          </div>

          <div className="form-grid">
            <label className="field span-2">
              <span>Title</span>
              <input
                required
                value={form.title}
                onChange={(event) => patchForm({ title: event.target.value })}
                placeholder="e.g. Karvalo"
              />
            </label>
            
            <label className="field">
              <span>Author</span>
              <input 
                value={form.author} 
                onChange={(event) => patchForm({ author: event.target.value })} 
                placeholder="e.g. K. P. Poornachandra Tejaswi"
              />
            </label>
            
            <label className="field">
              <span>Published Year</span>
              <input
                inputMode="numeric"
                value={form.publishedYear}
                onChange={(event) => patchForm({ publishedYear: event.target.value })}
                placeholder="e.g. 1980"
              />
            </label>
            
            <label className="field">
              <span>Total Pages</span>
              <input
                min="0"
                type="number"
                value={form.pages}
                onChange={(event) => patchForm({ pages: event.target.value })}
                placeholder="e.g. 350"
              />
            </label>
            
            <label className="field">
              <span>Current Page</span>
              <input
                min="0"
                type="number"
                value={form.currentPage}
                onChange={(event) => patchForm({ currentPage: event.target.value })}
                placeholder="e.g. 45"
              />
            </label>
            
            <label className="field">
              <span>Status</span>
              <select value={form.status} onChange={(event) => patchForm({ status: event.target.value })}>
                {Object.entries(STATUSES).map(([key, status]) => (
                  <option key={key} value={key}>
                    {status.longLabel}
                  </option>
                ))}
              </select>
            </label>
            
            <label className="field">
              <span>Rating</span>
              <div className="rating-input">
                <Rating value={form.rating} onChange={(rating) => patchForm({ rating })} />
              </div>
            </label>
            
            <label className="field span-2">
              <span>Tags / Genres</span>
              <div className="field-with-icon">
                <Tags size={17} />
                <input
                  value={form.tags}
                  onChange={(event) => patchForm({ tags: event.target.value })}
                  placeholder="e.g. Fiction, Kannada Literature, Mystery"
                />
              </div>
            </label>

            <div className="field span-2 shelves-input-container">
              <span>Custom Shelves / Collections</span>
              
              {displayedShelves.length > 0 && (
                <div className="shelves-checklist">
                  {displayedShelves.map((shelf) => {
                    const isChecked = (form.shelves || []).includes(shelf);
                    return (
                      <button
                        type="button"
                        key={shelf}
                        className={`shelf-pill-label ${isChecked ? "active" : ""}`}
                        onClick={() => {
                          const current = form.shelves || [];
                          if (current.includes(shelf)) {
                            patchForm({ shelves: current.filter((s) => s !== shelf) });
                          } else {
                            patchForm({ shelves: [...current, shelf] });
                          }
                        }}
                      >
                        <span>{shelf}</span>
                      </button>
                    );
                  })}
                </div>
              )}

              <div className="add-shelf-row">
                <input
                  value={newShelfName}
                  onChange={(e) => setNewShelfName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const name = newShelfName.trim();
                      if (name) {
                        const current = form.shelves || [];
                        if (!current.includes(name)) {
                          patchForm({ shelves: [...current, name] });
                        }
                        setNewShelfName("");
                      }
                    }
                  }}
                  placeholder="Create new shelf (e.g. Summer Reads)"
                />
                <button
                  type="button"
                  className="button ghost compact"
                  onClick={() => {
                    const name = newShelfName.trim();
                    if (name) {
                      const current = form.shelves || [];
                      if (!current.includes(name)) {
                        patchForm({ shelves: [...current, name] });
                      }
                      setNewShelfName("");
                    }
                  }}
                >
                  <Plus size={14} />
                  <span>Add Shelf</span>
                </button>
              </div>
            </div>
            
            <label className="field span-2">
              <span>Book Description (Synopsis)</span>
              <textarea
                value={form.description || ""}
                onChange={(event) => patchForm({ description: event.target.value })}
                rows={4}
                placeholder="Synopsis of the book from API search..."
              />
            </label>

            <label className="field span-2">
              <span>Notes & Thoughts</span>
              <textarea
                value={form.notes}
                onChange={(event) => patchForm({ notes: event.target.value })}
                rows={3}
                placeholder="Write your review, quotes or key thoughts here..."
              />
            </label>
            
            {/* Optional cover URL input so they can edit cover links manually if desired */}
            <label className="field span-2">
              <span>Cover Image URL</span>
              <input
                value={form.coverUrl}
                onChange={(event) => patchForm({ coverUrl: event.target.value })}
                placeholder="https://example.com/cover.jpg"
              />
            </label>
          </div>

          <div className="modal-footer">
            <button className="button ghost on-light" onClick={onClose} type="button">
              <span>Cancel</span>
            </button>
            <button className="button primary" type="submit">
              <Sparkles size={16} />
              <span>{editing ? "Save Changes" : "Save Book"}</span>
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default BookModal;

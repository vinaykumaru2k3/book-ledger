import React, { useState, useEffect, useMemo } from "react";
import { X, Search, Loader2, Plus, Import, Sparkles, BookOpen, Tags } from "lucide-react";
import Cover from "./Cover";
import Rating from "./Rating";
import { STATUSES } from "./constants";

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

  // Upgrade image links to https
  let coverUrl = info.imageLinks?.thumbnail || info.imageLinks?.smallThumbnail || "";
  if (coverUrl && coverUrl.startsWith("http://")) {
    coverUrl = coverUrl.replace("http://", "https://");
  }

  // Categories as tags
  const tags = info.categories?.join(", ") || "";

  return {
    title,
    author,
    pages,
    currentPage: "0",
    status: "want",
    rating: 0,
    tags,
    notes: info.description ? info.description.slice(0, 1000) : "",
    publishedYear,
    isbn,
    coverId: null,
    coverUrl,
    sourceKey: volume.id || "",
  };
}

function BookModal({
  books,
  editing,
  form,
  onClose,
  onFormChange,
  onSubmit,
  quickAdd,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState("all"); // all, title, author, genre
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const existingKeys = useMemo(
    () => new Set(books.map((book) => book.sourceKey).filter(Boolean)),
    [books]
  );

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
          let olUrl = `https://openlibrary.org/search.json?limit=8&q=${encodeURIComponent(searchQuery.trim())}`;
          if (searchType === "title") {
            olUrl = `https://openlibrary.org/search.json?limit=8&title=${encodeURIComponent(searchQuery.trim())}`;
          } else if (searchType === "author") {
            olUrl = `https://openlibrary.org/search.json?limit=8&author=${encodeURIComponent(searchQuery.trim())}`;
          } else if (searchType === "genre") {
            olUrl = `https://openlibrary.org/search.json?limit=8&subject=${encodeURIComponent(searchQuery.trim())}`;
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

  async function handleSelectResult(volume) {
    let finalVolume = volume;
    if (!volume.id.startsWith("/works/")) {
      const full = await fetchFullGoogleVolume(volume.id);
      if (full) finalVolume = full;
    }

    const matchedForm = formFromGoogleVolume(finalVolume);
    
    // If it came from Open Library fallback, fetch full description in background
    if (volume.id.startsWith("/works/")) {
      const desc = await fetchOpenLibraryDescription(volume.id);
      if (desc) {
        matchedForm.notes = desc.slice(0, 1000);
      }
    }
    
    onFormChange(matchedForm);
    setShowDropdown(false);
  }

  async function handleQuickAdd(volume) {
    let finalVolume = volume;
    if (!volume.id.startsWith("/works/")) {
      const full = await fetchFullGoogleVolume(volume.id);
      if (full) finalVolume = full;
    }

    const matchedForm = formFromGoogleVolume(finalVolume);
    
    if (volume.id.startsWith("/works/")) {
      const desc = await fetchOpenLibraryDescription(volume.id);
      if (desc) {
        matchedForm.notes = desc.slice(0, 1000);
      }
    }
    
    await quickAdd(matchedForm);
    setShowDropdown(false);
  }

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
                        const isAdded = existingKeys.has(volume.id);
                        const volumeInfo = volume.volumeInfo || {};
                        const coverUrl = volumeInfo.imageLinks?.smallThumbnail || volumeInfo.imageLinks?.thumbnail || "";
                        const tempBook = {
                          title: volumeInfo.title || "Untitled",
                          author: volumeInfo.authors?.join(", ") || "Unknown Author",
                          coverUrl: coverUrl.startsWith("http://") ? coverUrl.replace("http://", "https://") : coverUrl,
                        };

                        return (
                          <div key={volume.id} className="dropdown-result-row">
                            <Cover book={tempBook} className="tiny" />
                            <div className="result-details">
                              <strong>{volumeInfo.title}</strong>
                              <span>
                                {volumeInfo.authors?.join(", ") || "Unknown Author"} 
                                {volumeInfo.publishedDate ? ` • ${volumeInfo.publishedDate.split("-")[0]}` : ""}
                              </span>
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

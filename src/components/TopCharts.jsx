import React, { useState, useEffect, useCallback } from "react";
import { Plus, Loader2, Trophy, Check } from "lucide-react";
import Cover from "./Cover";

const GENRES = [
  { id: "fantasy", label: "Fantasy", subjectKey: "fantasy" },
  { id: "science_fiction", label: "Sci-Fi", subjectKey: "science_fiction" },
  { id: "mystery", label: "Mystery", subjectKey: "detective_and_mystery_stories" },
  { id: "classics", label: "Classics", subjectKey: "classics" },
  { id: "self_help", label: "Self-Help", subjectKey: "self-help" },
  { id: "business", label: "Business", subjectKey: "business" },
  { id: "history", label: "History", subjectKey: "history" },
  { id: "biography", label: "Biography", subjectKey: "biography" },
  { id: "romance", label: "Romance", subjectKey: "romance" },
];

function isProbablyEnglish(title, language = []) {
  if (language.length > 0 && !language.includes("eng")) {
    return false;
  }
  
  const lower = title.toLowerCase();
  
  const foreignPrefixes = [
    "el ", "la ", "los ", "las ", "un ", "una ", "uno ", "del ", "al ", 
    "le ", "les ", "des ", "une ", "du ", "et ", "dans ", "avec ",
    "das ", "der ", "die ", "ein ", "eine ", "und ", "mit ",
    "o ", "os ", "um ", "uma ", "com ", "para "
  ];
  
  if (foreignPrefixes.some(pref => lower.startsWith(pref))) {
    return false;
  }
  
  const foreignStopWords = [" y ", " de ", " con ", " par ", " pour ", " und ", " sur ", " del "];
  for (const word of foreignStopWords) {
    if (lower.includes(word)) {
      if (word === " y " && !lower.includes(" and ")) return false;
      if (word === " de " && !lower.includes(" of ") && !lower.includes(" the ")) return false;
      if (word === " con " && !lower.includes(" with ")) return false;
      if (word === " und " && !lower.includes(" and ")) return false;
      if (![" y ", " de ", " con ", " und "].includes(word)) return false;
    }
  }

  return true;
}

function validateGenre(book, genreId) {
  const subjects = (book.subject || []).map(s => s.toLowerCase());
  const title = (book.title || "").toLowerCase();
  const matchWord = (arr, word) => arr.some(s => new RegExp(`\\b${word}\\b`, 'i').test(s));

  switch (genreId) {
    case "fantasy":
      return matchWord(subjects, "fantasy") || matchWord(subjects, "magic") || matchWord(subjects, "wizards") || 
             matchWord(subjects, "witches") || matchWord(subjects, "monsters") || matchWord(subjects, "dragons") || 
             matchWord(subjects, "fairy") || matchWord(subjects, "mythology");

    case "science_fiction":
      return matchWord(subjects, "science fiction") || matchWord(subjects, "sci-fi") || matchWord(subjects, "space") || 
             matchWord(subjects, "dystopian") || matchWord(subjects, "future") || matchWord(subjects, "aliens") || 
             matchWord(subjects, "robots") || matchWord(subjects, "time travel") || matchWord(subjects, "futurology") || 
             title.includes("space") || title.includes("star");

    case "mystery":
      return matchWord(subjects, "mystery") || matchWord(subjects, "detective") || matchWord(subjects, "crime") || 
             matchWord(subjects, "thriller") || matchWord(subjects, "suspense") || matchWord(subjects, "murder") ||
             matchWord(subjects, "espionage") || matchWord(subjects, "spy");

    case "classics":
      const pubYear = Number(book.first_publish_year);
      if (pubYear && pubYear > 1975) return false;
      return matchWord(subjects, "classics") || matchWord(subjects, "classic") || matchWord(subjects, "fiction") || 
             matchWord(subjects, "novels") || matchWord(subjects, "poetry") || matchWord(subjects, "drama");

    case "self_help":
      const isSelfHelp = matchWord(subjects, "self-help") || matchWord(subjects, "personal growth") || 
                         matchWord(subjects, "motivation") || matchWord(subjects, "success") || 
                         matchWord(subjects, "happiness") || matchWord(subjects, "habits") || 
                         matchWord(subjects, "self-actualization") ||
                         title.includes("habits") || title.includes("success") || title.includes("power of");
      if (!isSelfHelp) return false;
      if (matchWord(subjects, "fiction") || matchWord(subjects, "fantasy") || matchWord(subjects, "magic")) return false;
      return true;

    case "business":
      const isBusiness = matchWord(subjects, "business") || matchWord(subjects, "finance") || 
                         matchWord(subjects, "economics") || matchWord(subjects, "management") || 
                         matchWord(subjects, "marketing") || matchWord(subjects, "investing") || 
                         matchWord(subjects, "money") || matchWord(subjects, "entrepreneurship") ||
                         title.includes("think and grow");
      if (!isBusiness) return false;
      if (matchWord(subjects, "fiction") || matchWord(subjects, "fantasy") || matchWord(subjects, "magic")) return false;
      return true;

    case "history":
      const isHistory = matchWord(subjects, "history") || matchWord(subjects, "historical") || 
                        matchWord(subjects, "war") || matchWord(subjects, "revolution") || 
                        matchWord(subjects, "ancient") || matchWord(subjects, "politics") || 
                        matchWord(subjects, "civilization") || matchWord(subjects, "empire");
      if (!isHistory) return false;
      
      const hasFantasy = matchWord(subjects, "magic") || matchWord(subjects, "wizards") || 
                         matchWord(subjects, "ghosts") || matchWord(subjects, "monsters") || 
                         matchWord(subjects, "dragons") || matchWord(subjects, "elves") || 
                         matchWord(subjects, "vampires");
      if (hasFantasy) return false;
      
      if (matchWord(subjects, "fiction") && !matchWord(subjects, "historical fiction")) return false;
      if (matchWord(subjects, "investing") || matchWord(subjects, "securities") || matchWord(subjects, "personal finance")) return false;
      return true;

    case "biography":
      const isBio = matchWord(subjects, "biography") || matchWord(subjects, "memoir") || 
                    matchWord(subjects, "autobiography") || matchWord(subjects, "diaries") || 
                    matchWord(subjects, "letters") || matchWord(subjects, "biographies");
      if (!isBio) return false;
      if (matchWord(subjects, "fiction") || matchWord(subjects, "magic") || matchWord(subjects, "fantasy")) return false;
      return true;

    case "romance":
      return matchWord(subjects, "romance") || matchWord(subjects, "love stories") || matchWord(subjects, "romantic");

    default:
      return true;
  }
}

function TopCharts({ books, quickAdd, onViewDetails }) {
  const [selectedGenre, setSelectedGenre] = useState(GENRES[0]);
  const [booksList, setBooksList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const alreadyInLibrary = useCallback((title, author) => {
    const normalizedKey = `${title.trim().toLowerCase()}|${author.trim().toLowerCase()}`;
    return books.some((b) => {
      const key = `${(b.title || "").trim().toLowerCase()}|${(b.author || "").trim().toLowerCase()}`;
      return key === normalizedKey;
    });
  }, [books]);

  const fetchTopBooks = useCallback(async (genre) => {
    setLoading(true);
    setError("");
    try {
      const fields = "key,title,author_name,cover_i,first_publish_year,number_of_pages_median,subject,isbn,language";
      // Fetch 100 docs with sort=readinglog so we have enough high-interest candidates after filtering
      const url = `https://openlibrary.org/search.json?subject=${encodeURIComponent(genre.subjectKey)}&limit=100&sort=readinglog&fields=${fields}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("API response error");
      const data = await res.json();
      
      const seenKeys = new Set();
      const formatted = [];
      let rank = 1;

      for (const doc of (data.docs || [])) {
        if (!doc.key || seenKeys.has(doc.key)) continue;

        // 1. Strict genre taxonomy validation
        if (!validateGenre(doc, genre.id)) {
          continue;
        }

        // 2. Filter out non-English editions/translations
        if (!isProbablyEnglish(doc.title, doc.language)) {
          continue;
        }

        // 2. Filter out textbooks and manual documents
        const lowerTitle = doc.title.toLowerCase();
        if (
          lowerTitle.includes("manual") ||
          lowerTitle.includes("handbook") ||
          lowerTitle.includes("study guide") ||
          lowerTitle.includes("textbook") ||
          lowerTitle.includes("coursebook") ||
          lowerTitle.includes("workbook") ||
          lowerTitle.includes("colloquium") ||
          lowerTitle.includes("proceedings")
        ) {
          continue;
        }

        // 3. Filter out books with missing cover art or extremely small page counts (pamphlets)
        if (!doc.cover_i) continue;
        if (doc.number_of_pages_median && doc.number_of_pages_median < 25) continue;

        seenKeys.add(doc.key);
        const author = doc.author_name?.join(", ") || "Unknown Author";

        formatted.push({
          id: doc.key,
          rank: rank++,
          title: doc.title,
          author,
          pages: doc.number_of_pages_median ? String(doc.number_of_pages_median) : "",
          publishedYear: doc.first_publish_year ? String(doc.first_publish_year) : "",
          genres: doc.subject ? doc.subject.slice(0, 3) : [],
          coverUrl: `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg`,
          inLibrary: alreadyInLibrary(doc.title, author),
          rawDoc: doc
        });

        if (formatted.length >= 50) break;
      }
        
      setBooksList(formatted);
    } catch (e) {
      console.error("Failed to fetch top books:", e);
      setError("Failed to fetch top books list. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [alreadyInLibrary]);

  useEffect(() => {
    fetchTopBooks(selectedGenre);
  }, [selectedGenre, fetchTopBooks]);

  const handleQuickAdd = async (book) => {
    const form = {
      title: book.title,
      author: book.author,
      pages: book.pages,
      currentPage: "0",
      status: "want",
      rating: 0,
      tags: book.genres.join(", "),
      notes: "",
      description: "",
      genres: book.genres.join(", "),
      publishedYear: book.publishedYear,
      isbn: book.rawDoc.isbn?.[0] || "",
      coverId: null,
      coverUrl: book.coverUrl ? book.coverUrl.replace("-M.jpg", "-L.jpg") : "",
      sourceKey: book.id,
    };
    await quickAdd(form);
    
    // Update local state inLibrary so the checkmark reflects instantly
    setBooksList((curr) =>
      curr.map((item) => (item.id === book.id ? { ...item, inLibrary: true } : item))
    );
  };

  const handleViewDetails = (rec) => {
    const bookObj = {
      id: rec.id,
      title: rec.title,
      author: rec.author,
      pages: rec.pages ? Number(rec.pages) : 0,
      currentPage: 0,
      status: "want",
      rating: 0,
      tags: rec.genres,
      notes: "",
      description: "Fetching full description from Open Library...",
      genres: rec.genres,
      publishedYear: rec.publishedYear,
      isbn: rec.rawDoc.isbn?.[0] || "",
      coverUrl: rec.coverUrl ? rec.coverUrl.replace("-M.jpg", "-L.jpg") : "",
      sourceKey: rec.id
    };
    onViewDetails(bookObj);
  };

  return (
    <div className="top-charts-container">
      {/* Genre selection tabs */}
      <div className="genre-selection-strip">
        {GENRES.map((g) => (
          <button
            key={g.id}
            className={`genre-select-tab ${selectedGenre.id === g.id ? "active" : ""}`}
            onClick={() => setSelectedGenre(g)}
            type="button"
          >
            <span>{g.label}</span>
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rec-loading-panel">
          <Loader2 className="spin" size={32} />
          <span>Fetching the Top 50 books in {selectedGenre.label}...</span>
        </div>
      ) : error ? (
        <div className="rec-error-panel">
          <p>{error}</p>
          <button className="button primary compact" onClick={() => fetchTopBooks(selectedGenre)}>
            Try Again
          </button>
        </div>
      ) : (
        <div className="rec-grid">
          {booksList.map((book) => {
            const displayBook = {
              title: book.title,
              author: book.author,
              coverUrl: book.coverUrl
            };

            return (
              <div key={book.id} className="book-card rec-card top-chart-card">
                {/* Ranking badge */}
                <div className="chart-rank-badge">
                  <Trophy size={11} />
                  <span>#{book.rank}</span>
                </div>

                <div 
                  className="cover-wrapper clickable-cover" 
                  onClick={() => handleViewDetails(book)}
                  title="Click to view details"
                >
                  <Cover book={displayBook} />
                </div>
                
                <div className="book-main">
                  <div className="book-heading">
                    <h3 
                      className="book-title clickable-title" 
                      onClick={() => handleViewDetails(book)}
                    >
                      {book.title}
                    </h3>
                    <p className="book-author-meta">
                      by {book.author}
                      {book.publishedYear ? ` • ${book.publishedYear}` : ""}
                      {book.pages ? ` • ${book.pages} pages` : ""}
                    </p>
                  </div>

                  {book.genres.length > 0 && (
                    <div className="tag-row">
                      {book.genres.map(g => (
                        <span key={g} className="tag-badge">{g}</span>
                      ))}
                    </div>
                  )}

                  <div className="rec-actions">
                    <button 
                      className="button ghost compact" 
                      onClick={() => handleViewDetails(book)}
                      type="button"
                    >
                      <span>Details</span>
                    </button>
                    {book.inLibrary ? (
                      <button className="button success compact" disabled type="button">
                        <Check size={13} style={{ marginRight: 4 }} />
                        <span>In Library</span>
                      </button>
                    ) : (
                      <button 
                        className="button primary compact" 
                        onClick={() => handleQuickAdd(book)}
                        type="button"
                      >
                        <Plus size={13} />
                        <span>Quick Add</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default TopCharts;

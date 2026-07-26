import React, { useState, useEffect, useMemo, useCallback } from "react";
import { Sparkles, RefreshCw, Plus, Loader2, BookOpen, ThumbsUp, Compass } from "lucide-react";
import Cover from "./Cover";
import { useBooks, useModal, useUi } from "../context/AppContext";

function Recommendations({ books: propBooks, quickAdd: propQuickAdd, onViewDetails: propOnViewDetails }) {
  const { books: contextBooks } = useBooks();
  const modal = useModal();
  const ui = useUi();
  const books = propBooks || contextBooks || [];
  const quickAdd = propQuickAdd || modal?.quickAdd;
  const onViewDetails = propOnViewDetails || ui?.openDetails;

  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // 1. Analyze the user's library to extract authors and genres from all books
  const profile = useMemo(() => {
    const sourceBooks = books;

    const authorCounts = {};
    const genreCounts = {};

    sourceBooks.forEach((book) => {
      // Authors
      if (book.author) {
        const auth = book.author.trim();
        authorCounts[auth] = (authorCounts[auth] || 0) + 1;
      }
      
      // Genres (combine explicit genres and tags)
      const list = [
        ...(book.genres || []),
        ...(book.tags || [])
      ].map(g => g.trim().toLowerCase()).filter(Boolean);

      list.forEach((g) => {
        // Exclude generic tags
        if (["want to read", "reading", "finished", "fav", "favorites", "general"].includes(g)) return;
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
    });

    // Get all authors and genres, sorted by frequency
    const topAuthors = Object.entries(authorCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    const topGenres = Object.entries(genreCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name);

    // Find the actual book details to show the "Because you read" reference
    const getInspiringBook = (type, key) => {
      if (type === "author") {
        return books.find(b => b.author?.trim() === key);
      }
      if (type === "genre") {
        return books.find(b => {
          const list = [...(b.genres || []), ...(b.tags || [])].map(g => g.toLowerCase());
          return list.includes(key.toLowerCase());
        });
      }
      return null;
    };

    return {
      topAuthors,
      topGenres,
      getInspiringBook,
      totalSourceCount: sourceBooks.length
    };
  }, [books]);

  // 2. Fetch recommendations from Open Library API
  const fetchRecommendations = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const recs = [];
      const alreadyInLibrary = (title, author) => {
        const normalizedKey = `${title.trim().toLowerCase()}|${author.trim().toLowerCase()}`;
        return books.some((b) => {
          const key = `${(b.title || "").trim().toLowerCase()}|${(b.author || "").trim().toLowerCase()}`;
          return key === normalizedKey;
        });
      };

      // Helper to query OpenLibrary with fields
      const queryOL = async (paramName, value) => {
        const fields = "key,title,author_name,cover_i,first_publish_year,number_of_pages_median,subject";
        const url = `https://openlibrary.org/search.json?limit=6&${paramName}=${encodeURIComponent(value)}&fields=${fields}`;
        const res = await fetch(url);
        if (!res.ok) return [];
        const data = await res.json();
        return data.docs || [];
      };

      // Determine what to query based on profile, diversifying choices
      const queries = [];
      
      if (profile.topAuthors.length > 0) {
        // Pick a randomized diverse set of up to 3 authors from the library
        const shuffledAuthors = [...profile.topAuthors].sort(() => 0.5 - Math.random());
        shuffledAuthors.slice(0, 3).forEach((author) => {
          queries.push({
            type: "author",
            value: author,
            reason: `Written by ${author}`,
            inspiringBook: profile.getInspiringBook("author", author)
          });
        });
      }

      if (profile.topGenres.length > 0) {
        // Pick a randomized diverse set of up to 3 genres from the library
        const shuffledGenres = [...profile.topGenres].sort(() => 0.5 - Math.random());
        shuffledGenres.slice(0, 3).forEach((genre) => {
          queries.push({
            type: "subject",
            value: genre,
            reason: `In the genre "${genre}"`,
            inspiringBook: profile.getInspiringBook("genre", genre)
          });
        });
      }

      // If no queries (empty library/no metadata), fall back to curated popular subjects
      if (queries.length === 0) {
        const fallbacks = ["Fantasy", "Science Fiction", "Self-Help", "History", "Mystery"];
        // Pick 3 random fallback subjects
        const shuffled = fallbacks.sort(() => 0.5 - Math.random()).slice(0, 3);
        shuffled.forEach((subject) => {
          queries.push({
            type: "subject",
            value: subject,
            reason: `Popular in ${subject}`,
            inspiringBook: null
          });
        });
      }

      // Execute queries in parallel
      const results = await Promise.all(
        queries.map(async (q) => {
          try {
            const docs = await queryOL(q.type, q.value);
            return docs.map((doc) => ({
              ...doc,
              reason: q.reason,
              inspiringBook: q.inspiringBook
            }));
          } catch (e) {
            console.error(`Failed to fetch recommendations for ${q.value}:`, e);
            return [];
          }
        })
      );

      // Flatten and filter duplicates
      const seenKeys = new Set();
      const seenTitles = new Set();
      const authorCounts = {};
      
      results.flat().forEach((doc) => {
        if (!doc.key || seenKeys.has(doc.key)) return;
        const author = doc.author_name?.join(", ") || "Unknown Author";
        if (alreadyInLibrary(doc.title, author)) return;

        // 1. Deduplicate by normalized title to filter duplicate/regional editions
        const normalizedTitle = doc.title.toLowerCase().trim().replace(/[^\w\s]/g, "");
        if (seenTitles.has(normalizedTitle)) return;

        // 2. Limit the number of books from the same author to 2 to prevent series saturation
        const primaryAuthor = doc.author_name?.[0] || "Unknown Author";
        if (authorCounts[primaryAuthor] >= 2) return;

        // 3. Filter out textbooks and manual documents
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
        ) return;

        // 4. Require cover art for recommendations
        if (!doc.cover_i) return;
        
        seenKeys.add(doc.key);
        seenTitles.add(normalizedTitle);
        authorCounts[primaryAuthor] = (authorCounts[primaryAuthor] || 0) + 1;
        recs.push({
          id: doc.key,
          title: doc.title,
          author,
          pages: doc.number_of_pages_median ? String(doc.number_of_pages_median) : "",
          publishedYear: doc.first_publish_year ? String(doc.first_publish_year) : "",
          genres: doc.subject ? doc.subject.slice(0, 3) : [],
          coverUrl: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : "",
          reason: doc.reason,
          inspiringBook: doc.inspiringBook,
          rawDoc: doc // Keep for View Details / form construction
        });
      });

      // Shuffle recommendations list to make it dynamic
      setRecommendations(recs.sort(() => 0.5 - Math.random()).slice(0, 8));
    } catch (e) {
      console.error("Recommendations engine error:", e);
      setError("Failed to generate recommendations. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [books, profile, refreshTrigger]);

  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  const handleQuickAdd = async (rec) => {
    // Map OpenLibrary doc layout to book form
    const form = {
      title: rec.title,
      author: rec.author,
      pages: rec.pages,
      currentPage: "0",
      status: "want",
      rating: 0,
      tags: rec.genres.join(", "),
      notes: "",
      description: "",
      genres: rec.genres.join(", "),
      publishedYear: rec.publishedYear,
      isbn: rec.rawDoc.isbn?.[0] || "",
      coverId: null,
      coverUrl: rec.coverUrl ? rec.coverUrl.replace("-M.jpg", "-L.jpg") : "",
      sourceKey: rec.id,
    };
    
    // Quick Add book
    await quickAdd(form);
  };

  const handleViewDetails = (rec) => {
    // Construct dummy book object for Details modal
    const book = {
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
    
    onViewDetails(book);
  };

  return (
    <div className="recommendations-container">
      <div className="rec-toolbar">
        <div className="rec-info-banner">
          {profile.totalSourceCount > 0 ? (
            <>
              <ThumbsUp size={15} />
              <span>Personalized recommendations based on your entire bookshelf collection.</span>
            </>
          ) : (
            <>
              <Compass size={15} />
              <span>Add some books to your shelf to get custom recommendations. Currently showing trending books.</span>
            </>
          )}
        </div>
        
        <button 
          className="button ghost compact rec-refresh-btn" 
          onClick={() => setRefreshTrigger(prev => prev + 1)}
          disabled={loading}
          type="button"
        >
          <RefreshCw size={14} className={loading ? "spin" : ""} />
          <span>Refresh</span>
        </button>
      </div>

      {loading ? (
        <div className="rec-loading-panel">
          <Loader2 className="spin" size={32} />
          <span>Analyzing shelf and querying database for books...</span>
        </div>
      ) : error ? (
        <div className="rec-error-panel">
          <p>{error}</p>
          <button className="button primary compact" onClick={() => setRefreshTrigger(prev => prev + 1)}>
            Try Again
          </button>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="rec-empty-panel">
          <Sparkles size={24} />
          <p>No new recommendations found. Your library is already well-stocked!</p>
        </div>
      ) : (
        <div className="rec-grid">
          {recommendations.map((rec) => {
            const displayBook = {
              title: rec.title,
              author: rec.author,
              coverUrl: rec.coverUrl
            };

            return (
              <div key={rec.id} className="book-card rec-card">
                <div 
                  className="cover-wrapper clickable-cover" 
                  onClick={() => handleViewDetails(rec)}
                  title="Click to view details"
                >
                  <Cover book={displayBook} />
                </div>
                
                <div className="book-main">
                  <div className="book-heading">
                    <div className="rec-reason-badge">
                      <span>{rec.reason}</span>
                      {rec.inspiringBook && (
                        <span className="inspiring-title" title={`Because you liked ${rec.inspiringBook.title}`}>
                          Because you liked: <em>{rec.inspiringBook.title}</em>
                        </span>
                      )}
                    </div>
                    <h3 
                      className="book-title clickable-title" 
                      onClick={() => handleViewDetails(rec)}
                    >
                      {rec.title}
                    </h3>
                    <p className="book-author-meta">
                      by {rec.author}
                      {rec.publishedYear ? ` • ${rec.publishedYear}` : ""}
                      {rec.pages ? ` • ${rec.pages} pages` : ""}
                    </p>
                  </div>

                  {rec.genres.length > 0 && (
                    <div className="tag-row">
                      {rec.genres.map(g => (
                        <span key={g} className="tag-badge">{g}</span>
                      ))}
                    </div>
                  )}

                  <div className="rec-actions">
                    <button 
                      className="button ghost compact" 
                      onClick={() => handleViewDetails(rec)}
                      type="button"
                    >
                      <span>Details</span>
                    </button>
                    <button 
                      className="button primary compact" 
                      onClick={() => handleQuickAdd(rec)}
                      type="button"
                    >
                      <Plus size={13} />
                      <span>Quick Add</span>
                    </button>
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

export default Recommendations;

# 📚 Book Ledger

A premium, minimalistic, and modern book tracking web application designed for bibliophiles. Built with **React**, **Vite**, and **Firebase / Firestore** for secure, real-time cloud data synchronization.

Featuring a beautiful **Obsidian Dark** aesthetic, elegant typography, smooth transitions, and advanced multilingual lookup capabilities powered by the Google Books API.

---

## ✨ Features

- **Minimalist Obsidian Dark Theme**: Designed with an ultra-clean, slate-and-emerald charcoal aesthetic, focus-centered inputs, and smooth transitions. No distracting animations.
- **Auto-suggest Autocomplete Lookup**: Simply type in the search bar and watch book suggestions populate instantly.
- **Multilingual & Phonetic Search**: Supports transliteration queries. For example, search for *"Karvalo"* or *"Chidambara Rahasya"* in English, and retrieve the accurate Kannada script book details (*ಕರ್ವಾಲೋ* or *ಚಿದಂಬರ ರಹಸ್ಯ*).
- **Advanced Search Filters**: Refine search results by title, author, genre/subject, or general query.
- **Structured Book Stats**: Track your reading metrics (total library count, active reads, page counts read, average shelf ratings, completion progress charts).
- **Flexible Layouts**: Effortlessly switch between a detailed Grid view and a compact list-style Row view.
- **Firebase/Firestore Integration**: Safe, instant storage keeping your shelf synchronized across devices.
- **JSON Import/Export**: Backup or restore your entire library ledger with clean JSON files.

---

## 🛠️ Project Structure & Architecture

The application was redesigned with a highly modular component structure to ensure maintainability:

```text
src/
├── components/
│   ├── constants.js         # Shared statuses, sort configurations, formatting helpers
│   ├── Cover.jsx            # Book cover image container & spine fallback cards
│   ├── Rating.jsx           # Clean interactive & read-only star reviews
│   ├── MetricCard.jsx       # Dashboard statistics components
│   ├── ReadingStack.jsx     # Side widgets showing active & completed books
│   ├── EmptyState.jsx       # Fallback states for filtered shelves
│   ├── BookCard.jsx         # Book listings with inline page-progress inputs
│   ├── BookModal.jsx        # Book forms & Google Books autocomplete queries
│   ├── AuthScreen.jsx       # Google & Email authentication panel
│   ├── AccountCard.jsx      # Profile widgets with Sign out controls
│   ├── LoadingScreen.jsx    # Full-page connection loaders
│   ├── LoadingPanel.jsx     # Inline list spinners
│   └── Toast.jsx            # Micro-notifications (success/error popups)
├── firebase.js              # Initialized Firebase/Firestore SDK setup
├── main.jsx                 # Vite application entry script
├── App.jsx                  # Main state controller and layout orchestrator
└── styles.css               # Clean Obsidian slate style system
```

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have [Node.js](https://nodejs.org) (v18 or higher) installed.

### 2. Installation
Clone the repository and install the dependencies:
```bash
npm install
```

### 3. Firebase Configuration
Verify the credentials in `src/firebase.js` match your active Firebase App config. Ensure you have activated **Email/Password** and **Google Sign-In** under Firebase Authentication, and set up **Firestore Database** in test mode or with proper read/write rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/books/{bookId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. Development Server
Start the local development server:
```bash
npm run dev
```

### 5. Production Build
Create an optimized production bundle:
```bash
npm run build
```

---

## 📖 Technologies Used
- **Vite** — High-speed bundler & dev server
- **React 19** — User interface components
- **Firebase 12** — Real-time Firestore database & Authentication
- **Lucide React** — Minimalist vector icons
- **Google Books API** — Advanced multilingual book index queries
- **Google Fonts** — Elegant typography (Outfit, Playfair Display)

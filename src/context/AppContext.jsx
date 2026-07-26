import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuthController } from "../hooks/useAuthController";
import { useBooksController } from "../hooks/useBooksController";
import { useShelvesController } from "../hooks/useShelvesController";
import { formFromBook } from "../utils/book";

const AppContext = createContext(null);

function useAppContext() {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error("useApp (and useBooks/useAuth/useShelves) must be used within <AppProvider>");
  }
  return ctx;
}

/* Public consumer hooks (the API requested by the refactor) */
export function useAuth() {
  return useAppContext().auth;
}
export function useBooks() {
  return useAppContext().books;
}
export function useShelves() {
  return useAppContext().shelves;
}
export function useTheme() {
  return useAppContext().theme;
}
export function useUi() {
  return useAppContext().ui;
}
export function useModal() {
  return useAppContext().modal;
}
export function useToast() {
  return useAppContext().toast;
}
export function useApp() {
  return useAppContext();
}

export function AppProvider({ children }) {
  const authController = useAuthController();
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");

  // Toast auto-dismiss
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const notify = (message, type = "success") => {
    setToastType(type);
    setToast(message);
  };

  const booksApi = useBooksController(authController.user, notify);
  const shelvesApi = useShelvesController(booksApi.books, booksApi.updateBook);

  // Wrapped sign-out that surfaces a toast
  const signOut = async () => {
    try {
      await authController.signOut();
      notify("Signed out successfully.");
    } catch {
      notify("Could not complete sign out.", "error");
    }
  };
  const auth = { ...authController, signOut };

  /* ---- Modal / details / theme UI state owned by the provider ---- */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);
  const [deleteConfirmBook, setDeleteConfirmBook] = useState(null);
  const [detailsBook, setDetailsBook] = useState(null);

  const [theme, setTheme] = useState(() => localStorage.getItem("book-ledger:theme") || "dark");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("book-ledger:theme", theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev) => (prev === "dark" ? "light" : "dark"));

  // Close modals when the user signs out
  useEffect(() => {
    if (!authController.user) {
      setModalOpen(false);
      setEditingId(null);
      setForm(null);
      setDeleteConfirmBook(null);
      setDetailsBook(null);
    }
  }, [authController.user]);

  const EMPTY_FORM = {
    title: "",
    author: "",
    pages: "",
    currentPage: "",
    status: "want",
    rating: 0,
    tags: "",
    notes: "",
    description: "",
    genres: "",
    publishedYear: "",
    isbn: "",
    coverId: null,
    coverUrl: "",
    sourceKey: "",
    shelves: [],
  };

  const openNewBook = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  };

  const openEditBook = (book) => {
    setEditingId(book.id);
    setForm(formFromBook(book));
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setForm(null);
  };

  const openDetails = (book) => setDetailsBook(book);

  const submitForm = async () => {
    if (!form || !form.title.trim()) return;
    await booksApi.submitBook(editingId, form);
    closeModal();
  };

  const modal = {
    open: modalOpen,
    editing: Boolean(editingId),
    form,
    onFormChange: setForm,
    onSubmit: submitForm,
    onClose: closeModal,
    quickAdd: booksApi.quickAdd,
  };

  const ui = {
    openNewBook,
    openEditBook,
    openDetails,
    closeDetails: () => setDetailsBook(null),
    openDeleteConfirm: (book) => setDeleteConfirmBook(book),
    closeDeleteConfirm: () => setDeleteConfirmBook(null),
    closeModal,
    notify,
  };

  const value = {
    auth,
    books: booksApi,
    shelves: shelvesApi,
    theme: { theme, toggleTheme },
    toast: { toast, toastType },
    modal,
    ui,
    deleteConfirmBook,
    setDeleteConfirmBook,
    detailsBook,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

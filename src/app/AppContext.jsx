import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { useAuthController } from "../features/auth/useAuthController";
import { useBooksController } from "../features/library/useBooksController";
import { useShelvesController } from "../features/shelves/useShelvesController";
import { formFromBook } from "../domain/book";
import { withCoverTransition } from "../shared/lib/viewTransition";

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
  const [toastSeq, setToastSeq] = useState(0);

  // Toast auto-dismiss. `toastSeq` restarts the timer when the same message is shown
  // again, so a repeated message gets its full time instead of the previous one's remainder.
  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(""), 2600);
    return () => window.clearTimeout(timer);
  }, [toast, toastSeq]);

  const notify = (message, type = "success") => {
    setToastType(type);
    setToast(message);
    setToastSeq((n) => n + 1);
  };

  const booksApi = useBooksController(authController.user, notify);
  const shelvesApi = useShelvesController(booksApi.books, booksApi.updateManyBooks, notify);

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

  /* ---- Modal / details UI state owned by the provider ---- */
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(null);
  const [deleteConfirmBook, setDeleteConfirmBook] = useState(null);
  const [detailsBook, setDetailsBook] = useState(null);

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

  // Opening and closing animate the cover between the list and the dialog where the browser can.
  const openDetails = (book, sourceEl) => withCoverTransition(() => setDetailsBook(book), { from: sourceEl });
  const closeDetails = () => {
    const id = detailsBook?.id;
    withCoverTransition(() => setDetailsBook(null), {
      to: () => (id ? document.querySelector(`[data-cover-id="${CSS.escape(String(id))}"]`) : null),
    });
  };

  // One save at a time: pressing Save twice must not create two copies of a new book.
  const submitting = useRef(false);
  const submitForm = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!form || !form.title.trim() || submitting.current) return;
    submitting.current = true;
    try {
      const saved = await booksApi.submitBook(editingId, form);
      // If the save failed the dialog stays open, so what you typed is not lost.
      if (saved) closeModal();
    } finally {
      submitting.current = false;
    }
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
    closeDetails,
    openDeleteConfirm: (book) => setDeleteConfirmBook(book),
    closeDeleteConfirm: () => setDeleteConfirmBook(null),
    closeModal,
    notify,
  };

  const value = {
    auth,
    books: booksApi,
    shelves: shelvesApi,
    toast: { toast, toastType },
    modal,
    ui,
    deleteConfirmBook,
    setDeleteConfirmBook,
    detailsBook,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

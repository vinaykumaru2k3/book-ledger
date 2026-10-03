import { normalizeBook, createBookFromForm } from "./src/utils/book.js";

const form = {
    title: "Test Book",
    author: "Author",
    status: "reading",
    pages: "100",
    currentPage: "50"
};

const existing = {
    title: "Test Book",
    author: "Author",
    status: "want",
    pages: 100,
    currentPage: 0
};

const book = createBookFromForm(form, existing);
console.log("createBookFromForm:");
console.log(book);


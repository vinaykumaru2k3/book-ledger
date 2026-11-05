/**
 * Is the Kannada UI switch available? Off in production until the Kannada
 * strings in kn.js have been reviewed by a Kannada reader. Turn it on for a
 * build with VITE_ENABLE_KANNADA_UI=true; it is always on in local development.
 */
export const KANNADA_UI_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_KANNADA_UI === "true";

/**
 * Is the (unfinished) Kannada Explorer page available? It is a placeholder for
 * now, so it only appears in local development, or in a build made with
 * VITE_ENABLE_KANNADA_EXPLORER=true.
 */
export const KANNADA_EXPLORER_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_KANNADA_EXPLORER === "true";
// Literary maps are built in milestones; the live site shows them only once they are complete.
export const LITERARY_MAPS_ENABLED = import.meta.env.DEV || import.meta.env.VITE_ENABLE_LITERARY_MAPS === "true";

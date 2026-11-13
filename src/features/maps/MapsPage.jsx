import React from "react";
import { useAuth } from "../../app/AppContext";
import MapsGallery from "./MapsGallery";
import MapWizard from "./MapWizard";
import MapView from "./MapView";

/**
 * Literary maps. One page, three screens by URL:
 *   /maps                         the gallery (featured, community, mine)
 *   /maps/new                     make a map
 *   /maps/:id[/:section[/:sub]]   one map (section: list, later graph and timeline)
 * Public: anyone may browse and open public maps; making one needs an account.
 */
function MapsPage({ params = {}, navigate, onSignIn }) {
  const { user } = useAuth();
  const go = (path) => navigate?.(path);

  if (params.id === "new") return <MapWizard user={user} onSignIn={onSignIn} onDone={(id) => go(`/maps/${id}`)} onCancel={() => go("/maps")} />;
  if (params.id) return <MapView key={params.id} mapId={params.id} section={params.section} sub={params.sub} user={user} navigate={go} />;
  return <MapsGallery user={user} onOpen={(id) => go(`/maps/${id}`)} onNew={() => go("/maps/new")} onSignIn={onSignIn} />;
}

export default MapsPage;

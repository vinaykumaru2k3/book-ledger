import React, { useState } from "react";
import { Globe2, Lock, Plus, Star } from "lucide-react";
import Badge from "../../shared/pk/Badge";
import Button from "../../shared/pk/Button";
import EmptyState from "../../shared/pk/EmptyState";
import Skeleton from "../../shared/pk/Skeleton";
import Tabs from "../../shared/pk/Tabs";
import { MapIcon } from "../../shared/pk/NavIcons";
import { useLanguage } from "../../shared/i18n/LanguageContext";
import { useMapsGallery } from "./useMapsController";
import { scopeLabel } from "./mapText";

/** One map in the gallery: what it covers, how big it is, whose it is. */
function MapCard({ map, onOpen, showOwner }) {
  const { t } = useLanguage();
  const { authors, works, movements } = map.counts;
  return (
    <li>
      <button type="button" className="pk-map-card" onClick={() => onOpen(map.id)}>
        <span className="pk-map-card__scope">{scopeLabel(map.scope, t)}</span>
        <span className="pk-map-card__title">{map.title}</span>
        {map.description && <span className="pk-map-card__desc">{map.description}</span>}
        <span className="pk-map-card__counts">{t("maps.counts", { authors, works, movements })}</span>
        <span className="pk-map-card__foot">
          {map.featured && (
            <Badge tone="gold" icon={Star}>
              {t("maps.featured")}
            </Badge>
          )}
          {!showOwner && (
            <Badge tone={map.visibility === "public" ? "accent" : "neutral"} icon={map.visibility === "public" ? Globe2 : Lock}>
              {t(map.visibility === "public" ? "maps.public" : "maps.private")}
            </Badge>
          )}
          {showOwner && map.ownerName && <span className="pk-map-card__owner">{t("maps.by", { name: map.ownerName })}</span>}
        </span>
      </button>
    </li>
  );
}

function MapGrid({ maps, loading, onOpen, showOwner, empty }) {
  if (loading) {
    return (
      <ul className="pk-map-grid" aria-busy="true">
        {[0, 1, 2].map((i) => (
          <li key={i}>
            <Skeleton shape="block" height={150} />
          </li>
        ))}
      </ul>
    );
  }
  if (!maps.length) return empty;
  return (
    <ul className="pk-map-grid">
      {maps.map((map) => (
        <MapCard key={map.id} map={map} onOpen={onOpen} showOwner={showOwner} />
      ))}
    </ul>
  );
}

/** The maps gallery: featured maps, maps readers have shared, and your own. */
function MapsGallery({ user, onOpen, onNew, onSignIn }) {
  const { t } = useLanguage();
  const gallery = useMapsGallery(user);
  const [tab, setTab] = useState(user ? "mine" : "featured");

  const tabs = [
    { id: "featured", label: t("maps.tab.featured") },
    { id: "community", label: t("maps.tab.community") },
    ...(user ? [{ id: "mine", label: t("maps.tab.mine") }] : []),
  ];

  const newButton = user ? (
    <Button variant="primary" icon={Plus} onClick={onNew}>
      {t("maps.new")}
    </Button>
  ) : (
    onSignIn && (
      <Button variant="primary" onClick={onSignIn}>
        {t("maps.signInToMake")}
      </Button>
    )
  );

  return (
    <section className="pk-maps" aria-labelledby="pk-maps-heading">
      <div className="pk-maps__intro">
        <div>
          <h2 id="pk-maps-heading" className="pk-maps__heading">
            {t("maps.galleryTitle")}
          </h2>
          <p className="pk-maps__lede">{t("maps.galleryLede")}</p>
        </div>
        {newButton}
      </div>

      <Tabs tabs={tabs} value={tab} onChange={setTab} label={t("maps.galleryTabs")} />

      <div className="pk-maps__panel" role="tabpanel">
        {tab === "mine" && (
          <MapGrid
            maps={gallery.mine}
            loading={gallery.mineLoading}
            onOpen={onOpen}
            empty={
              <EmptyState icon={MapIcon} title={t("maps.emptyMine")} action={newButton}>
                {t("maps.emptyMineBody")}
              </EmptyState>
            }
          />
        )}
        {tab !== "mine" && gallery.error && <p className="pk-maps__error">{gallery.error}</p>}
        {tab === "featured" && (
          <MapGrid
            maps={gallery.featured}
            loading={gallery.loading}
            onOpen={onOpen}
            showOwner
            empty={<EmptyState icon={Star} title={t("maps.emptyFeatured")}>{t("maps.emptyFeaturedBody")}</EmptyState>}
          />
        )}
        {tab === "community" && (
          <MapGrid
            maps={gallery.community}
            loading={gallery.loading}
            onOpen={onOpen}
            showOwner
            empty={<EmptyState icon={Globe2} title={t("maps.emptyCommunity")}>{t("maps.emptyCommunityBody")}</EmptyState>}
          />
        )}
      </div>
    </section>
  );
}

export default MapsGallery;

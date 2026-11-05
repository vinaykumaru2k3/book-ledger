import React, { useState } from "react";
import { BookOpen, Heart, Library, Plus, Trash2 } from "lucide-react";
import Button from "../shared/pk/Button";
import Card from "../shared/pk/Card";
import Badge from "../shared/pk/Badge";
import Skeleton from "../shared/pk/Skeleton";
import Tabs from "../shared/pk/Tabs";
import Dialog from "../shared/pk/Dialog";
import Field from "../shared/pk/Field";
import ProgressRibbon from "../shared/pk/ProgressRibbon";
import BookCover from "../shared/pk/BookCover";
import EmptyState from "../shared/pk/EmptyState";
import LanguageToggle from "../shared/pk/LanguageToggle";
import { useLanguage } from "../shared/i18n/LanguageContext";

const SWATCHES = [
  ["--pk-bg", "Page"],
  ["--pk-surface", "Surface"],
  ["--pk-surface-raised", "Raised"],
  ["--pk-surface-sunken", "Sunken"],
  ["--pk-ink", "Ink"],
  ["--pk-ink-2", "Ink 2"],
  ["--pk-ink-3", "Ink 3"],
  ["--pk-accent", "Accent"],
  ["--pk-accent-soft", "Accent soft"],
  ["--pk-gold", "Gold"],
  ["--pk-gold-soft", "Gold soft"],
  ["--pk-success", "Success"],
  ["--pk-danger", "Danger"],
];

const SAMPLE_BOOKS = [
  { title: "Dune", author: "Frank Herbert" },
  { title: "ಕರ್ವಾಲೋ", author: "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ" },
  { title: "Emma", author: "Jane Austen" },
  { title: "ಸಂಸ್ಕಾರ", author: "ಯು. ಆರ್. ಅನಂತಮೂರ್ತಿ" },
];

function Section({ title, children }) {
  return (
    <section className="pk-dev__section">
      <h2 className="pk-dev__h2">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Showcase of every design token and primitive, in both languages.
 * Not linked from the app; open it at /dev/ui. It is the review surface for
 * Phase R0 and the reference for anyone building new screens.
 */
function DevUiPage() {
  const { t, lang } = useLanguage();
  const [tab, setTab] = useState("library");
  const [dialog, setDialog] = useState(false);
  const [progress, setProgress] = useState(42);

  return (
    <main className="pk-dev">
      <header className="pk-dev__header">
        <div>
          <p className="pk-dev__kicker">Design system</p>
          <h1 className="pk-dev__h1">Reading Room</h1>
          <p className="pk-dev__lede">
            Tokens and components for the Pustaka redesign. Current language: <strong>{lang}</strong>.
          </p>
        </div>
        <LanguageToggle />
      </header>

      <Section title="Colour">
        <div className="pk-dev__swatches">
          {SWATCHES.map(([token, label]) => (
            <div key={token} className="pk-dev__swatch">
              <span className="pk-dev__chip" style={{ background: `var(${token})` }} />
              <strong>{label}</strong>
              <code>{token}</code>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Typography">
        <div className="pk-dev__type">
          <p className="pk-dev__display">Your personal library, thoughtfully cataloged</p>
          <p className="pk-dev__display" lang="kn">
            ನಿಮ್ಮ ವೈಯಕ್ತಿಕ ಗ್ರಂಥಾಲಯ, ಜಾಗರೂಕತೆಯಿಂದ ಜೋಡಿಸಲಾಗಿದೆ
          </p>
          <p className="pk-dev__body">
            Body text in Inter. A quiet harbor for your books, reading progress, and thoughts. No feeds, no noise.
          </p>
          <p className="pk-dev__body" lang="kn">
            ಕನ್ನಡ ಪಠ್ಯ ನೋಟೋ ಸಾನ್ಸ್ ಕನ್ನಡದಲ್ಲಿ. ಕನ್ನಡ ಅಕ್ಷರಗಳು ಎತ್ತರವಾಗಿರುವುದರಿಂದ ಸಾಲಿನ ಅಂತರ ಹೆಚ್ಚಿದೆ.
          </p>
        </div>
      </Section>

      <Section title="Translated strings (t)">
        <div className="pk-dev__row">
          <Badge tone="accent">{t("status.want")}</Badge>
          <Badge tone="gold">{t("status.reading")}</Badge>
          <Badge tone="success">{t("status.done")}</Badge>
          <Button variant="primary" icon={Plus}>
            {t("action.addBook")}
          </Button>
          <Button>{t("action.cancel")}</Button>
          <span>{t("count.books", { count: 8 })}</span>
        </div>
      </Section>

      <Section title="Buttons">
        <div className="pk-dev__row">
          <Button variant="primary">Primary</Button>
          <Button>Secondary</Button>
          <Button variant="ghost">Ghost</Button>
          <Button variant="danger" icon={Trash2}>
            Delete
          </Button>
          <Button variant="primary" loading>
            Saving
          </Button>
          <Button variant="primary" disabled>
            Disabled
          </Button>
        </div>
        <div className="pk-dev__row">
          <Button size="sm">Small</Button>
          <Button size="md">Medium</Button>
          <Button size="lg" variant="primary" icon={BookOpen}>
            Large
          </Button>
        </div>
      </Section>

      <Section title="Badges and tabs">
        <div className="pk-dev__row">
          <Badge>Neutral</Badge>
          <Badge tone="accent" icon={Heart}>
            Favourite
          </Badge>
          <Badge tone="gold">Gold</Badge>
          <Badge tone="success">Finished</Badge>
          <Badge tone="danger">Overdue</Badge>
        </div>
        <Tabs
          label="Example tabs"
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "library", label: "Library" },
            { id: "shelves", label: "Shelves" },
            { id: "insights", label: "Insights" },
          ]}
        />
      </Section>

      <Section title="Cards, covers and progress">
        <div className="pk-dev__cards">
          {SAMPLE_BOOKS.map((book) => (
            <Card key={book.title} interactive tabIndex={0} className="pk-dev__book">
              <BookCover book={book} size="md" />
              <strong lang={/[ಀ-೿]/.test(book.title) ? "kn" : undefined}>{book.title}</strong>
              <span lang={/[ಀ-೿]/.test(book.author) ? "kn" : undefined}>{book.author}</span>
            </Card>
          ))}
        </div>
        <div className="pk-dev__progress">
          <ProgressRibbon value={progress} />
          <input type="range" min="0" max="100" value={progress} onChange={(e) => setProgress(Number(e.target.value))} aria-label="Progress value" />
        </div>
      </Section>

      <Section title="Form fields">
        <div className="pk-dev__form">
          <Field label="Title" placeholder="e.g. Karvalo" hint="As it appears on the cover." />
          <Field label="Author" defaultValue="" error="Author is required" />
          <Field label="Status" as="select" defaultValue="want">
            <option value="want">Want to read</option>
            <option value="reading">Reading</option>
            <option value="done">Finished</option>
          </Field>
          <Field label="Notes" as="textarea" placeholder="Quotes, thoughts..." />
        </div>
      </Section>

      <Section title="Loading and empty states">
        <div className="pk-dev__row pk-dev__row--top">
          <Card className="pk-dev__skeleton">
            <Skeleton shape="block" />
            <Skeleton width="70%" />
            <Skeleton width="45%" />
          </Card>
          <Card>
            <EmptyState icon={Library} title="Your shelf is empty" action={<Button variant="primary" icon={Plus}>Add book</Button>}>
              Add your first book to start tracking your reading journey.
            </EmptyState>
          </Card>
        </div>
      </Section>

      <Section title="Dialog">
        <Button onClick={() => setDialog(true)}>Open dialog</Button>
        {dialog && (
          <Dialog
            title="Remove this book?"
            onClose={() => setDialog(false)}
            footer={
              <>
                <Button variant="ghost" onClick={() => setDialog(false)}>
                  Cancel
                </Button>
                <Button variant="danger" onClick={() => setDialog(false)} data-autofocus>
                  Remove
                </Button>
              </>
            }
          >
            Focus stays inside this dialog, Escape closes it, and focus returns to the button that opened it.
          </Dialog>
        )}
      </Section>
    </main>
  );
}

export default DevUiPage;

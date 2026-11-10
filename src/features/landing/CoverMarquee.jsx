import React from "react";
import MiniCover from "../../shared/pk/MiniCover";

// Sample covers (decorative only).
const ROW_A = [
  ["Middlemarch", "George Eliot"],
  ["Dune", "Frank Herbert"],
  ["Beloved", "Toni Morrison"],
  ["Emma", "Jane Austen"],
  ["The Hobbit", "J. R. R. Tolkien"],
  ["Things Fall Apart", "Chinua Achebe"],
  ["Jane Eyre", "Charlotte Brontë"],
  ["The Overstory", "Richard Powers"],
];
const ROW_B = [
  ["1984", "George Orwell"],
  ["Persuasion", "Jane Austen"],
  ["Kim", "Rudyard Kipling"],
  ["Frankenstein", "Mary Shelley"],
  ["Moby-Dick", "Herman Melville"],
  ["The Remains of the Day", "Kazuo Ishiguro"],
  ["Rebecca", "Daphne du Maurier"],
  ["Little Women", "Louisa May Alcott"],
];

function Row({ books, reverse }) {
  // The list is drawn twice so the loop is seamless.
  const loop = [...books, ...books];
  return (
    <div className={`pk-marquee__row${reverse ? " pk-marquee__row--reverse" : ""}`}>
      <div className="pk-marquee__track">
        {loop.map(([title, author], index) => (
          <MiniCover key={`${title}-${index}`} title={title} author={author} variant={index + (reverse ? 2 : 0)} />
        ))}
      </div>
    </div>
  );
}

/** Two bands of book covers drifting past in opposite directions. Decorative. */
function CoverMarquee() {
  return (
    <div className="pk-marquee" aria-hidden="true">
      <Row books={ROW_A} />
      <Row books={ROW_B} reverse />
    </div>
  );
}

export default CoverMarquee;

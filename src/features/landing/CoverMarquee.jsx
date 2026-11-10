import React from "react";
import MiniCover from "../../shared/pk/MiniCover";

// Sample covers (decorative only): a mix of Kannada and English classics.
const ROW_A = [
  ["ಕರ್ವಾಲೋ", "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ"],
  ["Dune", "Frank Herbert"],
  ["ಸಂಸ್ಕಾರ", "ಯು. ಆರ್. ಅನಂತಮೂರ್ತಿ"],
  ["Emma", "Jane Austen"],
  ["ಮಲೆಗಳಲ್ಲಿ ಮದುಮಗಳು", "ಕುವೆಂಪು"],
  ["The Hobbit", "J. R. R. Tolkien"],
  ["Middlemarch", "George Eliot"],
  ["ಚೋಮನ ದುಡಿ", "ಕೆ. ಶಿವರಾಮ ಕಾರಂತ"],
];
const ROW_B = [
  ["1984", "George Orwell"],
  ["ಮೂಕಜ್ಜಿಯ ಕನಸುಗಳು", "ಕೆ. ಶಿವರಾಮ ಕಾರಂತ"],
  ["Kim", "Rudyard Kipling"],
  ["ಪರ್ವ", "ಎಸ್. ಎಲ್. ಭೈರಪ್ಪ"],
  ["Persuasion", "Jane Austen"],
  ["ಜುಗಾರಿ ಕ್ರಾಸ್", "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ"],
  ["Frankenstein", "Mary Shelley"],
  ["ಗ್ರಹಣ", "ಎಸ್. ಎಲ್. ಭೈರಪ್ಪ"],
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

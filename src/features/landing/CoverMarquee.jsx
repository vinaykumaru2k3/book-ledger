import React from "react";
import MiniCover from "../../shared/pk/MiniCover";

// Sample covers (decorative only): books from many languages, as a real library would hold.
const ROW_A = [
  ["ಕರ್ವಾಲೋ", "ಪೂರ್ಣಚಂದ್ರ ತೇಜಸ್ವಿ"],
  ["Middlemarch", "George Eliot"],
  ["Cien años de soledad", "Gabriel García Márquez"],
  ["गोदान", "प्रेमचंद"],
  ["ノルウェイの森", "村上春樹"],
  ["ಮಲೆಗಳಲ್ಲಿ ಮದುಮಗಳು", "ಕುವೆಂಪು"],
  ["L'Étranger", "Albert Camus"],
  ["পথের পাঁচালী", "বিভূতিভূষণ বন্দ্যোপাধ্যায়"],
];
const ROW_B = [
  ["Анна Каренина", "Лев Толстой"],
  ["பொன்னியின் செல்வன்", "கல்கி"],
  ["Dune", "Frank Herbert"],
  ["ಸಂಸ್ಕಾರ", "ಯು. ಆರ್. ಅನಂತಮೂರ್ತಿ"],
  ["Der Process", "Franz Kafka"],
  ["红楼梦", "曹雪芹"],
  ["Things Fall Apart", "Chinua Achebe"],
  ["ಪರ್ವ", "ಎಸ್. ಎಲ್. ಭೈರಪ್ಪ"],
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

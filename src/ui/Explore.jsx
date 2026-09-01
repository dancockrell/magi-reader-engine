import { Link } from 'react-router-dom';
import { useBook } from './useBook.jsx';

function plain(value) {
  return String(value || '')
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export default function Explore() {
  const { book, title } = useBook();
  const authored = book.explore || {};
  const background = Object.values(book.info || {});
  const units = book.units || [];
  const lenses = authored.lenses || [];

  return (
    <main className="explore">
      <header className="explore-hero">
        <p className="eyebrow">Ambrose's notebook</p>
        <h1>Explore {title}</h1>
        <p>
          This is the conversation we deliberately kept out of the reading. Here we can stop,
          look closely, argue with an interpretation, chase a historical detail, and notice how
          the writer made the language work.
        </p>
        <div className="explore-actions">
          <Link className="btn primary" to="../read/0">
            Read the book
          </Link>
          <Link className="btn" to="../words">
            Practise vocabulary
          </Link>
        </div>
      </header>

      {authored.intro ? (
        <section className="explore-section lead">
          <p className="eyebrow">From Ambrose</p>
          <h2>{authored.intro.title || 'Before you dig in'}</h2>
          <p>{authored.intro.text}</p>
        </section>
      ) : null}

      {lenses.length ? (
        <section className="explore-section">
          <p className="eyebrow">Big ideas</p>
          <h2>Ways into the book</h2>
          <p className="section-intro">
            These are lenses, not answers. A good interpretation should make more of the text
            visible; if a lens makes the text smaller or duller, put it down.
          </p>
          <div className="explore-cards lenses">
            {lenses.map((lens, i) => (
              <article className="explore-card lens" key={lens.title || i}>
                <span className="lens-kicker">{lens.kicker || 'Ambrose notices'}</span>
                <h3>{lens.title}</h3>
                <p>{lens.text}</p>
                {lens.lookFor ? <p className="lens-look"><b>Look back at:</b> {lens.lookFor}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {background.length ? (
        <section className="explore-section">
          <p className="eyebrow">Context</p>
          <h2>The world around the text</h2>
          <div className="explore-cards">
            {background.map((item, i) => (
              <article className="explore-card" key={item.id || item.title || i}>
                <h3>{item.title || item.caption || 'Background'}</h3>
                {item.caption ? <p className="muted">{plain(item.caption)}</p> : null}
                {item.para || item.text ? <p>{plain(item.para || item.text)}</p> : null}
              </article>
            ))}
          </div>
        </section>
      ) : null}

      <section className="explore-section">
        <p className="eyebrow">Close reading</p>
        <h2>Walk through the text</h2>
        <p className="section-intro">
          No quiz is hiding here. These notes are a second set of eyes: what is happening, what
          the writer is doing, and what becomes more interesting when you read the passage again.
        </p>
        <div className="explore-walkthrough">
          {units.map((unit, i) => (
            <article className="explore-beat" key={unit.id || i}>
              <span className="explore-number">{i + 1}</span>
              <div>
                <h3>{unit.title || unit.act || `Part ${i + 1}`}</h3>
                {unit.caption ? <p className="muted">{plain(unit.caption)}</p> : null}
                {unit.para ? <p>{plain(unit.para)}</p> : null}
                {authored.units?.[unit.id] ? (
                  <p className="ambrose-note">{authored.units[unit.id]}</p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="explore-footer">
        <p>
          Come here after a first reading. Once you already know what happens, you have attention
          left over for the more interesting question: how did the writer make it happen?
        </p>
        <Link className="btn" to="../">
          Back to the book
        </Link>
      </footer>
    </main>
  );
}

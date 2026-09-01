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

  return (
    <main className="explore">
      <header className="explore-hero">
        <p className="eyebrow">Ambrose's notebook</p>
        <h1>Explore {title}</h1>
        <p>
          This is separate from the reading on purpose. Here we can stop, look closely, talk about
          context and craft, and follow an idea without interrupting the story itself.
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
          <h2>{authored.intro.title || 'Before you dig in'}</h2>
          <p>{authored.intro.text}</p>
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
        <h2>Walk through the story</h2>
        <p className="section-intro">
          These notes are not questions to answer. They are a second set of eyes: what is happening,
          what the writer is doing, and what is worth noticing when you return to the passage.
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
          The best use of this section is after a first reading, when you already know what happens
          and can afford to notice how the writer made it happen.
        </p>
        <Link className="btn" to="../">
          Back to the book
        </Link>
      </footer>
    </main>
  );
}

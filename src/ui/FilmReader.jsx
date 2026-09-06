import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBook } from './useBook.jsx';

/** One authored movie owns picture, narration, score, captions and transport. */
export default function FilmReader() {
  const { book, id, title } = useBook();
  const videoRef = useRef(null);
  const [needsStart, setNeedsStart] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const video = videoRef.current;
    let alive = true;
    video?.play()?.catch(() => { if (alive) setNeedsStart(true); });
    return () => { alive = false; };
  }, [book.cinematicFilm]);
  async function start() {
    try {
      await videoRef.current?.play();
      setNeedsStart(false);
    } catch {
      setNeedsStart(true);
    }
  }
  return (
    <main className="film-workspace" aria-label={title}>
      <div className="film-stage">
        <video ref={videoRef} src={book.cinematicFilm} controls playsInline
          preload="metadata" poster={book.cinematicPoster} aria-label={`${title}, narrated film`}
          onPlay={() => setNeedsStart(false)} onError={() => setFailed(true)}>
          <track kind="captions" src={book.cinematicCaptions || book.cinematicFilm.replace(/\.mp4(?=\?|$)/, '.vtt')}
            srcLang="en" label="English" default />
        </video>
        {needsStart && !failed ? (
          <button type="button" className="film-start" onClick={start}>Play film</button>
        ) : null}
        {failed ? <p role="alert" className="film-error">The film could not load.
          {' '}<Link to={`/book/${id}/read/0?view=text`}>Open the text</Link>
        </p> : null}
      </div>
    </main>
  );
}

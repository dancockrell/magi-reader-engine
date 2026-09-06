export const FILM_DOWNLOAD = 'https://github.com/dancockrell/magi-reader-engine/releases/download/v0.9.1-portfolio/the-gift-of-the-magi.mp4';
export const FILM_URL = import.meta.env.VITE_FILM_URL ||
  (import.meta.env.PROD ? FILM_DOWNLOAD : 'video/films/magi-reader-film-final.mp4?edit=portfolio');
export const FILM_CAPTIONS = 'video/films/magi-reader-film-final.vtt';
export const FILM_POSTER = 'art/storyboard/s1/s1-a-counting.jpg';

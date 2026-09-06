import { FILM_URL, FILM_CAPTIONS, FILM_POSTER, FILM_DOWNLOAD } from './lib/media/film-delivery.js';
const player = document.querySelector('video');
player.src = FILM_URL;
player.poster = FILM_POSTER;
document.querySelector('track').src = FILM_CAPTIONS;
document.querySelector('#download').setAttribute('href', FILM_DOWNLOAD);
player.addEventListener('error', () => { document.querySelector('#playback-error').removeAttribute('hidden'); });

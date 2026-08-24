/**
 * The shapes everything else agrees on.
 *
 * Written as JSDoc rather than TypeScript so the runtime stays plain
 * JavaScript, while `checkJs` still refuses a renamed field or a
 * changed argument. When a book format changes, the failure should be a
 * type error at build time, not a blank card in front of a class.
 *
 * @module types
 */

/**
 * One glossed word, as the trainer carries it.
 * @typedef {object} Word
 * @property {string} w         the word as it appears in the text
 * @property {string} d         its meaning, in the book's own words
 * @property {string} [unit]    id of the scene it was met in
 * @property {number} [hits]    consecutive right answers; 2 retires it
 * @property {number} [asked]   how many times it has been put to the student
 * @property {boolean} [mine]   true when the student looked it up themselves
 */

/**
 * One option on a question card.
 * @typedef {object} Choice
 * @property {string} t   the text shown
 * @property {boolean} ok whether choosing it is correct
 */

/**
 * A question, ready to render. Exactly one of `options` or `answer` is
 * meaningful: spelling questions are typed, everything else is chosen.
 * @typedef {object} Question
 * @property {string} kind
 * @property {Word} [item]
 * @property {Word[]} [items]        matching rounds carry several
 * @property {string} [prompt]
 * @property {string} [sub]
 * @property {Choice[]} options
 * @property {string} [answer]       spelling only
 * @property {string} [hint]         spelling only
 * @property {string} [firstLetter]  spelling only
 * @property {string[]} [words]      matching only
 * @property {{t:string,w:string}[]} [meanings] matching only
 * @property {object} [set]          odd-one-out only
 */

/**
 * Everything the engine needs to build a question.
 * @typedef {object} Ctx
 * @property {Book} book
 * @property {Record<string,string>} swaps
 * @property {Word[]} all
 */

/**
 * @typedef {object} Unit
 * @property {string} id
 * @property {string} title
 * @property {string} [act]      the division of the story this belongs to
 * @property {string} [scene]    key into the plate map; defaults to id
 * @property {string} [caption]  one line about the picture — used as alt text
 * @property {number} [num]
 * @property {string} [para]     a plain-language summary of the scene
 * @property {string[]} [stanzas]
 * @property {string[][]} [gloss]   [word, meaning] pairs — the pairing is
 *                                  enforced by validateBook at load time,
 *                                  not by the type, because a JSON import
 *                                  cannot be narrowed to a tuple
 * @property {{q:string,opts:string[],correct:number}[]} [mc]
 */

/**
 * A book package.
 *
 * `plates` maps a scene to its picture file. The art is content-addressed
 * — filenames are hashes — so without this map there is no way from a
 * scene to its image, and a missing entry must read as "no picture"
 * rather than as a guessed path that 404s.
 *
 * The rest is what a book teaches with and what its characters say. It
 * is listed here rather than left off because a package that quietly
 * lacks `dialogue` should be a type error where it is read, not a
 * reading where nobody speaks and no one can say why.
 *
 * @typedef {object} Book
 * @property {{title:string,id?:string,source?:string}} meta
 * @property {Unit[]} units
 * @property {Record<string,string>} [swaps]
 * @property {Record<string,string>} [plates]
 * @property {{audio?:string, cues?:string}} [media]  where this book's
 *     recordings and cue file sit once built. Part of the pack rather
 *     than of the extracted data: it depends on how the assets are laid
 *     out, not on anything the author wrote. Relative, always — itch
 *     serves from a nested path and a leading slash 404s everything.
 * @property {Record<string,any>} [teaching]   questions and prompts, by unit
 * @property {Record<string,any>} [info]       material that is not read aloud
 * @property {Record<string,any>} [recaps]
 * @property {{members:Record<string,CastMember>}} [cast]
 * @property {{name?:string, hello?:string, passIntro?:Record<string,string>}} [guideVoice]
 * @property {any[]} [preshow]
 * @property {Record<string,{at:number,state?:string,line?:string}[]>} [wrenReactions]
 * @property {Record<string,{who:string,text:string,state?:string}[]>} [dialogue]
 * @property {Record<string,any>} [lineTranslations]
 * @property {Record<string,any>} [wordTranslations]
 * @property {Record<string,any>} [uiTranslations]
 * @property {any[]} [languages]
 */

/**
 * Somebody who speaks. A book pack can ship a different cast — or one
 * voice, or five — without the engine changing.
 *
 * @typedef {object} CastMember
 * @property {string} id
 * @property {string} name
 * @property {string} [role]
 * @property {string} [voice]
 * @property {string} [side]
 * @property {string} [blurb]
 * @property {string} [art]   relative path, for the same reason the
 *                            plate paths are relative
 */

/**
 * One beat: a picture, a line, and the recording that speaks it.
 * @typedef {object} Beat
 * @property {number} i
 * @property {string} unit
 * @property {string} line
 * @property {string|null} clip
 * @property {{id:string,src:string|null,alt:string}} plate
 * @property {Record<string,string>} [gloss] the words this unit explains,
 *                                           carried so a line knows its
 *                                           own hard words
 */

/**
 * A practice session. Every field is replaced, never edited.
 * @typedef {object} Session
 * @property {Word[]} queue
 * @property {string|null} lastKind
 * @property {number} right
 * @property {number} wrong
 * @property {number} asked
 * @property {Question|null} question
 * @property {boolean} awaitingNext
 * @property {boolean} done
 */

/**
 * One row of the gradebook.
 * @typedef {object} Row
 * @property {string} [file]        the filename it arrived as, if any
 * @property {number} [pass]        which reading (2 = quiz, 3 = written)
 * @property {number} [autoRight]   automatically-marked items correct
 * @property {number} [autoTotal]   automatically-marked items asked
 * @property {string} cls
 * @property {string} no
 * @property {string} name
 * @property {string} assignment
 * @property {number|''} scoreNum
 * @property {number|''} totalNum
 * @property {number|''} percentNum
 * @property {number} minutes
 * @property {string} when
 * @property {number|string} retried  count, or '' when none — the CSV
 *                                    wants an empty cell, not a zero
 * @property {number} [attempts]
 * @property {number|''} [priorScore]
 * @property {number|''} [priorPercent]
 * @property {boolean} [lowerThanPrior]
 * @property {any} payload
 */

export {};

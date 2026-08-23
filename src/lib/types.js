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
 * @property {string} [act]
 * @property {string[]} [stanzas]
 * @property {[string,string][]} [gloss]
 * @property {{q:string,opts:string[],correct:number}[]} [mc]
 */

/**
 * @typedef {object} Book
 * @property {{title:string,id?:string,source?:string}} meta
 * @property {Unit[]} units
 * @property {Record<string,string>} [swaps]
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

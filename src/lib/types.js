/**
 * The shapes everything else agrees on.
 *
 * Written as JSDoc rather than TypeScript so the runtime stays plain
 * JavaScript while `checkJs` still catches drift in the pack contract.
 *
 * @module types
 */

/**
 * One glossed word, as the trainer carries it.
 * @typedef {object} Word
 * @property {string} w
 * @property {string} d
 * @property {string} [unit]
 * @property {number} [hits]
 * @property {number} [asked]
 * @property {boolean} [mine]
 */

/**
 * One option on a vocabulary question card.
 * @typedef {object} Choice
 * @property {string} t
 * @property {boolean} ok
 */

/**
 * @typedef {object} Question
 * @property {string} kind
 * @property {Word} [item]
 * @property {Word[]} [items]
 * @property {string} [prompt]
 * @property {string} [sub]
 * @property {Choice[]} options
 * @property {string} [answer]
 * @property {string} [hint]
 * @property {string} [firstLetter]
 * @property {string[]} [words]
 * @property {{t:string,w:string}[]} [meanings]
 * @property {object} [set]
 */

/**
 * Everything the vocabulary engine needs to build a question.
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
 * @property {string} [scene]
 * @property {string} [caption]
 * @property {number} [num]
 * @property {string} [para]
 * @property {string[]} [stanzas]
 * @property {string[][]} [gloss]
 * @property {{q:string,opts:string[],correct:number}[]} [mc]
 */

/**
 * One guide turn before or after a book.
 *
 * `clip: null` is meaningful: the text has been rewritten but its new
 * recording has not been produced yet, so the UI must not play an older
 * recording whose words no longer match.
 *
 * @typedef {object} FramingTurn
 * @property {string} [who]
 * @property {string} text
 * @property {string} [state]
 * @property {string|null} [clip]
 */

/**
 * The production packet for one narrated line.
 *
 * The descriptive fields are intentionally part of runtime data. The
 * same object drives the reader and serves as the exact brief for the
 * image/video generation pipeline.
 *
 * @typedef {object} VisualPlan
 * @property {string|null} [start]  approved first key image
 * @property {string|null} [end]    optional controlled second key image
 * @property {string|null} [clip]   optional finished silent visual clip
 * @property {string|null} [poster]
 * @property {string} [alt]
 * @property {string} [shot]
 * @property {string} [camera]
 * @property {string} [action]
 * @property {string} [mood]
 * @property {number} [duration]    narration window in seconds
 * @property {string} [status]      production state such as todo/approved
 */

/** @typedef {Record<string, VisualPlan|VisualPlan[]|Record<string,VisualPlan>>} Storyboard */

/**
 * One optional literary lens in Ambrose's Explore notes.
 * @typedef {object} ExploreLens
 * @property {string} title
 * @property {string} text
 * @property {string} [kicker]
 * @property {string} [lookFor]
 */

/**
 * @typedef {object} ExploreNotes
 * @property {{title?:string,text:string}} [intro]
 * @property {ExploreLens[]} [lenses]
 * @property {Record<string,string>} [units]
 */

/**
 * A book package consumed by the solo reader.
 *
 * The active product contract is story text, media, vocabulary, optional
 * framing, optional Explore notes, and optional storyboard production
 * data. Legacy teaching/dialogue fields remain typed temporarily while
 * old extracted packs are migrated, but the solo story track does not
 * consult them.
 *
 * @typedef {object} Book
 * @property {{title:string,id?:string,source?:string,author?:string,by?:string,kind?:string}} meta
 * @property {Unit[]} units
 * @property {Record<string,string>} [swaps]
 * @property {Record<string,string>} [plates]
 * @property {Storyboard} [storyboard]
 * @property {{audio?:string, cues?:string}} [media]
 * @property {{source?:string,fetchedAt?:number}} [plugin]
 * @property {ExploreNotes} [explore]
 * @property {Record<string,any>} [teaching] legacy extraction data
 * @property {Record<string,any>} [info]
 * @property {Record<string,any>} [recaps]
 * @property {{members:Record<string,CastMember>}} [cast]
 * @property {{name?:string, hello?:string, passIntro?:Record<string,string>}} [guideVoice]
 * @property {FramingTurn[]} [preshow]
 * @property {FramingTurn[]} [afterword]
 * @property {Record<string,{at:number,state?:string,line?:string}[]>} [wrenReactions]
 * @property {Record<string,{who:string,text:string,state?:string,clip?:string|null}[]>} [dialogue]
 * @property {Record<string,any>} [lineTranslations]
 * @property {Record<string,any>} [wordTranslations]
 * @property {Record<string,any>} [uiTranslations]
 * @property {any[]} [languages]
 */

/**
 * Somebody who speaks.
 * @typedef {object} CastMember
 * @property {string} id
 * @property {string} name
 * @property {string} [role]
 * @property {string} [voice]
 * @property {string} [side]
 * @property {string} [blurb]
 * @property {string} [art]
 */

/**
 * One narrated line: visual, literary text, recording and clickable words.
 * @typedef {object} Beat
 * @property {number} i
 * @property {string} unit
 * @property {string} line
 * @property {string|null} clip
 * @property {{id:string,src:string|null,alt:string}} plate
 * @property {Record<string,string>} [gloss]
 * @property {VisualPlan|null} [visual]
 */

/**
 * A vocabulary practice session.
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
 * Legacy gradebook row. This type disappears with the classroom removal
 * pass; keeping it until then prevents dormant old modules from silently
 * breaking the integration branch before they are deleted together.
 * @typedef {object} Row
 * @property {string} [file]
 * @property {number} [pass]
 * @property {number} [autoRight]
 * @property {number} [autoTotal]
 * @property {string} cls
 * @property {string} no
 * @property {string} name
 * @property {string} assignment
 * @property {number|''} scoreNum
 * @property {number|''} totalNum
 * @property {number|''} percentNum
 * @property {number} minutes
 * @property {string} when
 * @property {number|string} retried
 * @property {number} [attempts]
 * @property {number|''} [priorScore]
 * @property {number|''} [priorPercent]
 * @property {boolean} [lowerThanPrior]
 * @property {any} payload
 */

export {};

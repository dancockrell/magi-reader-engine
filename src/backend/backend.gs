/* ------------------------------------------------------------------
   Magi Reader — classroom backend  —  paste this into your Google Sheet.

   Extensions > Apps Script, delete what is there, paste this, Save.
   Then Deploy > New deployment > type: Web app
        Execute as:      Me
        Who has access:  Anyone
   Copy the /exec link it gives you and paste it into the reader.

   Nothing is stored on anybody's tablet. Work posts here; you open
   the sheet from whatever you happen to be holding.

   ------------------------------------------------------------------
   WHO SIGNS IN, AND WHO DOES NOT

   You sign in once, here, and no student ever does.

   "Execute as: Me" means this script runs with YOUR Google account's
   permission on YOUR sheet. The first time you save a deployment
   Google shows you its own consent screen; approving it is the whole
   of the authentication, and it is Google doing it, not the reader.
   That single act is also the real proof of who the teacher is —
   better than any passcode the app could invent, because it is tied
   to the account that owns the gradebook.

   Google will warn you that the app is "unverified". That is expected
   and it is not a problem: the app is a script YOU just pasted into
   YOUR own sheet, and Google says that about every script that has
   not been through its commercial review. Click Advanced, then "Go to
   (project name)".

   "Who has access: Anyone" then lets a student's tablet post without
   any Google account at all — which is the point, because half a class
   will be on a shared iPad or signed into a personal account.

   No route here ever returns a student's work, so the link is a way
   in, not a way to read the class.

   TWO THINGS MAKE THE NAME ON A ROW TRUSTWORTHY.

   Keep a Roster tab (Class | Student number | Nickname | Real name)
   and every submission is checked against it. Anything that does not
   match a name on your list still arrives — nothing is ever dropped
   silently — but it lands flagged, so you see it rather than marking
   it.

   And if your school is a Google Workspace domain, deploy with
   "Anyone with Google Account" instead of "Anyone". Some districts
   require that anyway. On a managed Chromebook the student is already
   signed in, so nothing changes for them, and the "Signed in as"
   column records the school address Google itself verified. At that
   point the name on the row is not a claim, it is a fact.
   ------------------------------------------------------------------ */

var SUBS_TAB = 'Submissions'; /* raw log, append only            */
var GRADE_TAB = 'Grades'; /* the gradebook, rebuilt          */
var ANS_TAB = 'Answers'; /* written work, graded by you     */
var ROSTER_TAB = 'Roster'; /* optional: your class list       */
var WRITTEN_MAX = 2; /* points per written answer       */
var SHARE_ROSTER = true; /* names offered at sign-in        */

function doGet(e) {
  var p = (e && e.parameter) || {};
  /* A teacher opening the gradebook. The sheet itself is still
     protected by Google's own sharing — this only says where it is. */
  if (p.page === 'meta') return json({ ok: true, sheetUrl: ss().getUrl() });
  if (p.page === 'roster') return json(SHARE_ROSTER ? roster(p['class']) : []);
  /* No page= means a student scanned the check-in code. */
  return checkinPage(p['class'] || '', p.p || '1');
}

function doPost(e) {
  /* Two students hitting submit in the same second must not
     interleave a rebuild. */
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(25000);
  } catch (err) {
    return json({ status: 'error', message: 'busy, try again' });
  }
  try {
    var body = JSON.parse(e.postData.contents);
    if (!body || !body.assignment) throw new Error('not a submission');
    record(body);
    rebuild();
    return json({ status: 'ok' });
  } catch (err) {
    return json({ status: 'error', message: String(err) });
  } finally {
    try {
      lock.releaseLock();
    } catch (x) {}
  }
}

/* ---------- helpers ---------- */
function ss() {
  return SpreadsheetApp.getActiveSpreadsheet();
}
function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(
    ContentService.MimeType.JSON
  );
}
function tab(name, headers) {
  var s = ss().getSheetByName(name);
  if (!s) {
    s = ss().insertSheet(name);
    if (headers && headers.length) {
      s.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  }
  return s;
}
/* A cell beginning with = + - or @ is a formula to a spreadsheet, and
   every one of these values was typed by a student. */
function safe(v) {
  if (v === null || v === undefined) return '';
  var s = String(v);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}
function num(v) {
  return typeof v === 'number' && isFinite(v) ? v : '';
}
/* short, stable fingerprint of an answer, so a mark can be tied to the
   exact words it was given for */
function hash(s) {
  var h = 0x811c9dc5;
  for (var i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return h.toString(16);
}

/* Empty unless you deployed with "Anyone with Google Account" AND the
   student is in your Workspace domain — Google will not hand over an
   outside address, by design. When it IS there it is verified, so a
   name typed into the reader can be checked against it. */
function signedInAs() {
  try {
    return Session.getActiveUser().getEmail() || '';
  } catch (e) {
    return '';
  }
}

/* ---------- 1. log the submission ---------- */
function record(b) {
  var s = tab(SUBS_TAB, [
    'Received',
    'Assignment',
    'Reading',
    'Class',
    'Student number',
    'Name',
    'Score',
    'Out of',
    'Percent',
    'Minutes',
    'Submitted',
    'Signed in as',
    'Not on list',
    'Items',
  ]);
  /* ------------------------------------------------------------
     A written reading has no automatic score, and its "out of"
     must not be recorded either.

     Reading 3 sends score:null with totalItems set to the number
     of written questions. Writing that into "Auto out of" counted
     those questions twice — once here, where they can never be
     scored because there is nothing to mark automatically, and
     again in "Written out of" from the answers you grade. A
     student who answered every question perfectly topped out at
     8/12: sixty-seven per cent for full marks.

     So the automatic columns are filled in only when there is
     genuinely an automatic score. For a written reading they stay
     empty, and the total is exactly what you awarded.
     ------------------------------------------------------------ */
  var auto = b.score !== null && b.score !== undefined && isFinite(b.score);
  s.appendRow([
    new Date(),
    safe(b.assignment),
    num(b.pass),
    safe(b.className),
    safe(b.studentNo),
    safe(b.realName || b.nickname),
    auto ? num(b.score) : '',
    auto ? num(b.totalItems) : '',
    auto ? num(b.percent) : '',
    num(b.minutesSpent),
    safe(b.submittedAt),
    safe(signedInAs()),
    onRoster(b),
    JSON.stringify(b.items || []),
  ]);
}

/* ---------- 2. rebuild the gradebook ---------- */
function rebuild() {
  var raw = tab(SUBS_TAB).getDataRange().getValues();
  if (raw.length < 2) return;

  /* latest attempt wins, but the count of attempts is kept —
     a silently overwritten grade is the worst thing a gradebook does */
  var latest = {},
    attempts = {};
  for (var i = 1; i < raw.length; i++) {
    var r = raw[i];
    var key = [r[1], r[3], r[4] || r[5]].join('||');
    attempts[key] = (attempts[key] || 0) + 1;
    latest[key] = r;
  }

  /* the scores you have already typed, kept across rebuilds */
  var kept = {};
  var a0 = ss().getSheetByName(ANS_TAB);
  if (a0) {
    var av = a0.getDataRange().getValues();
    for (var j = 1; j < av.length; j++) {
      if (av[j][0]) kept[String(av[j][0])] = av[j][6];
    }
  }

  var grades = [],
    answers = [];
  Object.keys(latest).forEach(function (k) {
    var r = latest[k];
    var cls = r[3],
      no = r[4],
      name = r[5];
    grades.push({
      cls: cls,
      no: no,
      name: name,
      assign: r[1],
      score: r[6],
      outOf: r[7],
      pct: r[8],
      mins: r[9],
      when: r[10],
      email: r[11],
      flag: r[12],
      tries: attempts[k],
    });
    var items = [];
    try {
      items = JSON.parse(r[13] || '[]');
    } catch (e) {}
    items.forEach(function (it, n) {
      if (it.answer === null || it.answer === undefined) return;
      if (String(it.answer).trim() === '') return;
      /* The key includes the answer itself. A student who hands in
         again with the SAME words keeps the mark you already gave.
         One who has rewritten the answer gets a fresh, unmarked row
         — because the mark you gave belonged to the old words, and
         quietly moving it onto new ones is how a gradebook starts
         lying to you. */
      var id = k + '||' + (it.segment || '') + '||' + n + '||' + hash(String(it.answer));
      answers.push({
        id: id,
        cls: cls,
        no: no,
        name: name,
        q: it.question || '(untitled)',
        seg: it.segment || '',
        text: String(it.answer),
        score: kept[id] === 0 || kept[id] ? kept[id] : '',
      });
    });
  });

  grades.sort(function (x, y) {
    return String(x.cls + '|' + x.no + '|' + x.name).localeCompare(
      String(y.cls + '|' + y.no + '|' + y.name)
    );
  });
  /* by question, not by student: you hold one rubric in your head and
     apply it down the whole class, instead of reloading it every row */
  answers.sort(function (x, y) {
    var q = String(x.q).localeCompare(String(y.q));
    return q ? q : String(x.cls + '|' + x.name).localeCompare(String(y.cls + '|' + y.name));
  });

  writeAnswers(answers);
  writeGrades(grades, answers.length > 0);
}

function writeAnswers(rows) {
  var s = tab(ANS_TAB);
  s.clear();
  var head = ['Key', 'Class', 'No.', 'Name', 'Question', 'Answer', 'Score', 'Out of', 'Part'];
  var out = [head];
  rows.forEach(function (a) {
    out.push([
      a.id,
      safe(a.cls),
      safe(a.no),
      safe(a.name),
      safe(a.q),
      safe(a.text),
      a.score,
      WRITTEN_MAX,
      safe(a.seg),
    ]);
  });
  if (out.length === 1) out.push(['', '', '', '', '(no written answers yet)', '', '', '', '']);
  s.getRange(1, 1, out.length, head.length).setValues(out);

  s.setFrozenRows(1);
  s.hideColumns(1); /* the key is plumbing */
  s.setColumnWidth(2, 70);
  s.setColumnWidth(3, 60);
  s.setColumnWidth(4, 150);
  s.setColumnWidth(5, 260);
  s.setColumnWidth(6, 460); /* the answer gets the room */
  s.setColumnWidth(7, 70);
  s.setColumnWidth(8, 60);
  s.setColumnWidth(9, 70);
  s.getRange(1, 1, 1, head.length)
    .setFontWeight('bold')
    .setBackground('#3E3A31')
    .setFontColor('#FFFFFF');
  if (out.length > 1) {
    s.getRange(2, 5, out.length - 1, 2)
      .setWrap(true)
      .setVerticalAlignment('top');
    /* the one column you touch is the only coloured one */
    s.getRange(2, 7, out.length - 1, 1)
      .setBackground('#FFF2C4')
      .setHorizontalAlignment('center')
      .setFontWeight('bold')
      .setBorder(true, true, true, true, false, false);
    s.getRange(2, 8, out.length - 1, 1).setHorizontalAlignment('center');
  }
  try {
    s.autoResizeRows(2, Math.max(1, out.length - 1));
  } catch (e) {}
}

function writeGrades(rows, hasWritten) {
  var s = tab(GRADE_TAB);
  s.clear();
  var head = [
    'Class',
    'Student number',
    'Name',
    'Assignment',
    'Auto score',
    'Auto out of',
    'Auto %',
    'Written score',
    'Written out of',
    'Total',
    'Total out of',
    'Final %',
    'Attempts',
    'Minutes',
    'Last submitted',
    'Signed in as',
    'Not on list',
  ];
  var out = [head];
  rows.forEach(function (g, i) {
    var n = i + 2;
    /* matched on class + name so you can correct either side by eye */
    var m = 'Answers!$B:$B,$A' + n + ',Answers!$D:$D,$C' + n;
    out.push([
      safe(g.cls),
      safe(g.no),
      safe(g.name),
      safe(g.assign),
      num(g.score),
      num(g.outOf),
      num(g.pct),
      hasWritten ? '=SUMIFS(Answers!$G:$G,' + m + ')' : 0,
      hasWritten ? '=SUMIFS(Answers!$H:$H,' + m + ')' : 0,
      '=E' + n + '+H' + n,
      '=F' + n + '+I' + n,
      '=IF(K' + n + '=0,"",ROUND(J' + n + '/K' + n + '*100,1))',
      g.tries,
      num(g.mins),
      safe(g.when),
      safe(g.email),
      safe(g.flag),
    ]);
  });
  if (out.length === 1)
    out.push([
      '(nothing handed in yet)',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
    ]);
  s.getRange(1, 1, out.length, head.length).setValues(out);
  s.setFrozenRows(1);
  s.setFrozenColumns(3);
  s.getRange(1, 1, 1, head.length)
    .setFontWeight('bold')
    .setBackground('#3E3A31')
    .setFontColor('#FFFFFF');
  s.setColumnWidth(1, 70);
  s.setColumnWidth(2, 120);
  s.setColumnWidth(3, 160);
  s.setColumnWidth(4, 110);
  s.setColumnWidth(15, 150);
  if (out.length > 1) s.getRange(2, 12, out.length - 1, 1).setNumberFormat('0.0');
}

/* Is this submission from somebody on your list?
   With no Roster tab there is nothing to check against, and everything
   passes — the app has to work for a teacher who set up nothing. Where
   a list DOES exist, a row that matches nobody on it is marked rather
   than refused: a student whose name is spelled differently has still
   done the work, and losing it would be worse than showing it to you. */
function onRoster(b) {
  var list = roster(b.className);
  if (!list.length) return '';
  var no = String(b.studentNo || '')
    .trim()
    .toLowerCase();
  var nm = String(b.realName || b.nickname || '')
    .trim()
    .toLowerCase();
  for (var i = 0; i < list.length; i++) {
    var rn = String(list[i].studentNo || '')
      .trim()
      .toLowerCase();
    if (no && rn && no === rn) return '';
    if (
      nm &&
      (String(list[i].realName).trim().toLowerCase() === nm ||
        String(list[i].nickname).trim().toLowerCase() === nm)
    )
      return '';
  }
  return 'CHECK';
}

/* ---------- 3. the class list, if you keep one ---------- */
function roster(cls) {
  var s = ss().getSheetByName(ROSTER_TAB);
  if (!s) return [];
  var v = s.getDataRange().getValues(),
    out = [];
  for (var i = 1; i < v.length; i++) {
    if (!v[i][2] && !v[i][3]) continue;
    if (cls && String(v[i][0]) !== String(cls)) continue;
    out.push({
      studentNo: String(v[i][1] || ''),
      nickname: String(v[i][2] || v[i][3] || ''),
      realName: String(v[i][3] || v[i][2] || ''),
    });
  }
  return out;
}

/* ---------- 4. the check-in page a student scans ---------- */
function checkinPage(cls, p) {
  var h =
    '<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<style>body{font:16px/1.5 system-ui,sans-serif;margin:0;background:#141110;color:#EDE3D0;' +
    'display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px}' +
    '.c{max-width:22rem;text-align:center}h1{font-size:1.3rem;margin:0 0 .4rem}' +
    'p{color:#B9AC97;margin:.3rem 0 1rem}</style>' +
    '<div class="c"><h1>Checked in</h1><p>Class ' +
    cls.replace(/[<&>]/g, '') +
    ', reading ' +
    String(p).replace(/[<&>]/g, '') +
    '.</p><p>Go back to the reading. Your work arrives here when you press Send.</p></div>';
  return HtmlService.createHtmlOutput(h);
}

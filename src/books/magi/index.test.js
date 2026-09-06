import { describe, expect, it } from 'vitest';
import magi from './index.js';

const sceneOneSegments = [
  {
    lines: [0, 1, 2, 3],
    clip: 'video/storyboard/s1/s1-a-counting.mp4',
    starts: [0, 1.984, 3.667, 5.684],
  },
  {
    lines: [4, 5, 6],
    clip: 'video/storyboard/s1/s1-b-market.mp4',
    starts: [0, 3.667, 6.667],
  },
  {
    lines: [7, 8, 9],
    clip: 'video/storyboard/s1/s1-c-recount.mp4',
    starts: [0, 1.919, 3.903],
  },
  {
    lines: [10, 11, 12],
    clip: 'video/storyboard/s1/s1-d-couch.mp4',
    starts: [0, 1.841, 4.554],
  },
  {
    lines: [14, 15],
    clip: 'video/storyboard/s1/s1-e-reflection.mp4',
    starts: [0, 3.377],
  },
];

const sceneTwoOpening = {
  lines: [0, 1, 2, 3, 4],
  clip: 'video/storyboard/s2/s2-a-flat-reveal.mp4',
  starts: [0, 3.3, 4.5, 6.3, 7.8],
  durations: [3.3, 1.2, 1.8, 1.5, 2.2],
};

const sceneTwoSegments = [
  sceneTwoOpening,
  {
    lines: [5, 6, 7, 8],
    clip: 'video/storyboard/s2/s2-b-vestibule.mp4',
    starts: [0, 2.4, 5.3, 7.7],
    durations: [2.4, 2.9, 2.4, 2.3],
  },
  {
    lines: [9, 10, 11, 12, 13],
    clip: 'video/storyboard/s2/s2-c-dillingham.mp4',
    starts: [0, 1.8, 3.5, 5.6, 7.8],
    durations: [1.8, 1.7, 2.1, 2.2, 2.2],
  },
  {
    lines: [14, 15, 16, 17],
    clip: 'video/storyboard/s2/s2-d-homecoming.mp4',
    starts: [0, 3.5, 6.3, 8.3],
    durations: [3.5, 2.8, 2, 1.7],
  },
];

const sceneThreeSegments = [
  {
    lines: [2, 3, 4, 5],
    clip: 'video/storyboard/s3/s3-b-cat-fence.mp4',
    starts: [0, 2.6, 5.2, 7.4],
    durations: [2.6, 2.6, 2.2, 2.6],
  },
  {
    lines: [6, 7, 8],
    clip: 'video/storyboard/s3/s3-c-present-planning.mp4',
    starts: [0, 1.1, 2.3],
    durations: [1.1, 1.2, 1.1],
    end: 3.4,
  },
  {
    lines: [9, 10],
    clip: 'video/storyboard/s3/s3-c-present-planning-v2.mp4',
    starts: [0, 5.75],
    durations: [5.75, 4.292],
    end: 10.042,
  },
  {
    lines: [11, 12, 13],
    clip: 'video/storyboard/s3/s3-c-present-planning.mp4',
    starts: [5.9, 7.1, 8.4],
    durations: [1.2, 1.3, 1.6],
  },
  {
    lines: [14, 15, 16, 17, 18, 19],
    clip: 'video/storyboard/s3/s3-d-pier-glass.mp4',
    starts: [0, 1.6, 3.2, 4.8, 6.5, 8.2],
    durations: [1.6, 1.6, 1.6, 1.7, 1.7, 1.8],
  },
  {
    lines: [22, 23],
    clip: 'video/storyboard/s3/s3-e-hair-release.mp4',
    starts: [3, 4.8],
    durations: [1.8, 2.2],
    end: 7,
  },
];

const sceneFourSegments = [
  {
    lines: [0, 1, 2, 3],
    clip: 'video/storyboard/s4/s4-a-two-treasures.mp4',
    starts: [0, 2.5, 5, 7.5],
    durations: [2.5, 2.5, 2.5, 2.5],
  },
  {
    lines: [4, 5, 6],
    clip: 'video/storyboard/s4/s4-b-sheba.mp4',
    starts: [0, 3.2, 6.4],
    durations: [3.2, 3.2, 3.6],
  },
  {
    lines: [7, 8, 9, 10],
    clip: 'video/storyboard/s4/s4-c-solomon.mp4',
    starts: [0, 2.4, 4.8, 7.3],
    durations: [2.4, 2.4, 2.5, 2.7],
  },
  {
    lines: [15],
    clip: 'video/storyboard/s4/s4-e-repin.mp4',
    starts: [0],
    durations: [5.2],
  },
];

describe('The Gift of the Magi timed visual segments', () => {
  it('covers every Scene 1 line with five shared clips and exact cue cuts', () => {
    expect(Object.keys(magi.storyboard)).toHaveLength(77);

    for (const segment of sceneOneSegments) {
      segment.lines.forEach((line, index) => {
        const visual = magi.storyboard[`s1-${line}`];
        expect(visual.clip).toBe(segment.clip);
        expect(visual.clipStart).toBeCloseTo(segment.starts[index], 3);
        expect(visual.duration).toBeGreaterThan(0);
        expect(visual.status).toBe('approved');
      });
    }

    const couchHold = magi.storyboard['s1-13'];
    expect(couchHold.start).toBe('art/storyboard/s1/s1-d-couch-hold.jpg');
    expect(couchHold.clip).toBeUndefined();
    expect(couchHold.status).toBe('approved');

  });

  it('keeps each line inside its generated source window', () => {
    const generatedLengths = [8, 9, 6, 8, 5];

    sceneOneSegments.forEach((segment, index) => {
      const last = magi.storyboard[`s1-${segment.lines.at(-1)}`];
      expect(last.clipStart + last.duration).toBeLessThanOrEqual(generatedLengths[index]);
    });
  });

  it('maps the Scene 2 opening across one ten-second continuity pullback', () => {
    sceneTwoOpening.lines.forEach((line, index) => {
      const visual = magi.storyboard[`s2-${line}`];
      expect(visual.clip).toBe(sceneTwoOpening.clip);
      expect(visual.clipStart).toBeCloseTo(sceneTwoOpening.starts[index], 3);
      expect(visual.duration).toBeCloseTo(sceneTwoOpening.durations[index], 3);
      expect(visual.status).toBe('approved');
    });

    const last = magi.storyboard['s2-4'];
    expect(last.clipStart + last.duration).toBeCloseTo(10, 3);
  });

  it('covers every Scene 2 line with four reviewed ten-second masters', () => {
    expect(sceneTwoSegments.flatMap((segment) => segment.lines)).toEqual(
      Array.from({ length: 18 }, (_, index) => index)
    );

    sceneTwoSegments.forEach((segment) => {
      segment.lines.forEach((line, index) => {
        const visual = magi.storyboard[`s2-${line}`];
        expect(visual.clip).toBe(segment.clip);
        expect(visual.clipStart).toBeCloseTo(segment.starts[index], 3);
        expect(visual.duration).toBeCloseTo(segment.durations[index], 3);
        expect(visual.status).toBe('approved');
      });

      const last = magi.storyboard[`s2-${segment.lines.at(-1)}`];
      expect(last.clipStart + last.duration).toBeCloseTo(10, 3);
    });
  });

  it('opens Scene 3 quietly and quarantines the bad intervals in its hair-release master', () => {
    for (const line of [0, 1, 20, 21, 24]) {
      const visual = magi.storyboard[`s3-${line}`];
      expect(visual.start).toMatch(/^art\/storyboard\/s3\//);
      expect(visual.clip).toBeUndefined();
      expect(visual.status).toBe('approved');
    }

    expect(sceneThreeSegments.flatMap((segment) => segment.lines)).toEqual(
      Array.from({ length: 18 }, (_, index) => index + 2).concat([22, 23])
    );

    sceneThreeSegments.forEach((segment) => {
      segment.lines.forEach((line, index) => {
        const visual = magi.storyboard[`s3-${line}`];
        expect(visual.clip).toBe(segment.clip);
        expect(visual.clipStart).toBeCloseTo(segment.starts[index], 3);
        expect(visual.duration).toBeCloseTo(segment.durations[index], 3);
        expect(visual.status).toBe('approved');
      });

      const last = magi.storyboard[`s3-${segment.lines.at(-1)}`];
      expect(last.clipStart + last.duration).toBeCloseTo(segment.end || 10, 3);
    });

  });

  it('covers Scene 4 with four reviewed masters and a deliberate still hold', () => {
    expect(sceneFourSegments.flatMap((segment) => segment.lines)).toEqual([
      0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 15,
    ]);

    sceneFourSegments.forEach((segment) => {
      segment.lines.forEach((line, index) => {
        const visual = magi.storyboard[`s4-${line}`];
        expect(visual.clip).toBe(segment.clip);
        expect(visual.clipStart).toBeCloseTo(segment.starts[index], 3);
        expect(visual.duration).toBeCloseTo(segment.durations[index], 3);
        expect(visual.status).toBe('approved');
      });

      const last = magi.storyboard[`s4-${segment.lines.at(-1)}`];
      const expectedEnd = segment.lines.at(-1) === 15 ? 5.2 : 10;
      expect(last.clipStart + last.duration).toBeCloseTo(expectedEnd, 3);
    });

    for (const line of [11, 12, 13, 14]) {
      const visual = magi.storyboard[`s4-${line}`];
      expect(visual.start).toBe('art/storyboard/s4/s4-d-hair-cascade.jpg');
      expect(visual.clip).toBeUndefined();
      expect(visual.status).toBe('approved');
    }

    for (const line of [16, 17]) {
      const visual = magi.storyboard[`s4-${line}`];
      expect(visual.start).toBe('art/storyboard/s4/s4-e-repin-end.jpg');
      expect(visual.clip).toBeUndefined();
      expect(visual.status).toBe('approved');
    }
  });
});

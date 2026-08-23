import { defineConfig, devices } from '@playwright/test';

/**
 * A real browser, because jsdom cannot answer the questions that matter
 * here.
 *
 * Three findings in this project came from measurements that were wrong
 * because the page was never really rendered or never really focused:
 *
 *   - "19 of 19 controls have no focus indicator" — false. The automated
 *     tab had document.hasFocus() === false, so :focus matched nothing
 *     whatever the CSS said.
 *   - the hand-in progress bar never moved, because requestAnimationFrame
 *     does not fire in a backgrounded tab.
 *   - contrast measured at 1.04:1 on text that is perfectly legible,
 *     because a semi-transparent background was treated as opaque.
 *
 * Playwright renders and composites for real, so focus, computed colour
 * and layout can be asserted rather than reasoned about.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  reporter: process.env.CI ? 'github' : [['list']],

  /* Four engines at twelve workers each starved a cold dev server that
     had just started serving 27 MB of art and audio, and WebKit timed
     out waiting for the first paint. The tests were fine; the machine
     was not. Six workers keeps the suite under ten seconds without the
     false failures. */
  workers: process.env.CI ? 2 : 6,

  /* Assertions get longer than the 5s default.
   *
   * Four engines share one dev server that is handing out 28 MB of art
   * and audio, so a render that takes 200ms alone can take seconds under
   * load. Tests were failing on the timeout and passing in isolation,
   * which is the worst kind of red: it teaches people to re-run rather
   * than to look. Raising this does not hide a real failure — an
   * assertion that is genuinely wrong still fails, just later. */
  expect: { timeout: 15_000 },

  use: {
    baseURL: 'http://127.0.0.1:5734',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },

  /* All three engines, because the classroom has all three and they
     disagree about exactly the things this reader depends on — focus
     handling, flexbox sizing, and how a form field behaves when tapped.
     The iPad profile is WebKit, which is what most of these students
     actually hold. */
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'tablet', use: { ...devices['iPad (gen 7)'] } },
    { name: 'phone', use: { ...devices['Pixel 7'] } },

    /* Gecko, via the real Firefox rather than Playwright's own build.
     *
     * Playwright's bundled Firefox will not start on this Windows build
     * (26200): firefox.exe embeds a manifest requiring `mozglue` as a
     * side-by-side assembly and the distribution ships no manifest to
     * resolve it against, so it dies with "side-by-side configuration is
     * incorrect". A hand-written manifest and two clean re-downloads all
     * reproduce it, which rules out a corrupt download.
     *
     * `moz-firefox` sidesteps the whole problem: it drives the installed
     * Firefox over WebDriver BiDi instead of Mozilla's juggler-patched
     * build. Requires a normal Firefox in Program Files — the MSIX/Store
     * package is a sandboxed alias and will not do.
     */
    {
      name: 'gecko',
      use: { ...devices['Desktop Firefox'], channel: 'moz-firefox' },
    },
  ],

  /* Playwright starts and stops the server itself, so no dev server is
     left running after the suite — which is how this project accumulated
     seventeen orphaned HTTP servers in one session. */
  webServer: {
    /* --host must match the baseURL exactly. Vite binds `localhost` by
       default, Playwright polls 127.0.0.1, and on a machine where those
       resolve differently the readiness check never succeeds — it just
       times out after a minute with no useful message. */
    command: 'npx vite --port 5734 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:5734',
    reuseExistingServer: false,
    timeout: 60_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
});

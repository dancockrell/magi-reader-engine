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

    /* Firefox is deliberately absent, and this is not an oversight.
     *
     * Playwright's Firefox 153 build will not start on this machine:
     *
     *   Activation context generation failed for firefox.exe.
     *   Dependent Assembly mozglue, version="1.0.0.0" could not be found.
     *
     * firefox.exe embeds a manifest requiring `mozglue` as a side-by-side
     * assembly, and the shipped distribution has no mozglue.manifest to
     * resolve it against — so having mozglue.dll on disk is not enough.
     * Tried: writing the missing manifest by hand, and a full clean
     * re-download. Both reproduce it, so the download is not corrupt;
     * it is this Windows build (11, 26200) plus that Firefox build.
     *
     * Left out rather than left failing, because a red suite that
     * everyone learns to ignore is worse than an honest gap. Revisit on
     * the next Playwright release: add the project back and run
     * `npx playwright install firefox`.
     */
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

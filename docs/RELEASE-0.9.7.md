# Historical v0.9.7 film and production backup

The film in this release is superseded by [v0.9.8](RELEASE-0.9.8.md).
Its production archives remain available; they are not a backup of later edits.

This release publishes the latest complete film, `magi-award-assembly-v6.mp4`,
as `the-gift-of-the-magi.mp4`, with its matching captions. It also preserves the
subsequent scene edits, source footage, review evidence and production files.
Those later scene previews are editing work, not a newer completed full film.

Film SHA-256: `852574ecb47757dd45b3d56293ec05b6af0547efcdbd5257b71e083997b3ef3b`.
1920 x 1080, native 24 fps, approximately 14:51.

Production backup ZIPs are independent archives: extract all into the same
folder. The manifest records original relative paths, sizes and SHA-256 hashes.
Dependencies, caches, duplicated build output and installed FFmpeg binaries are
excluded. Source and editing history are preserved in Git. Earlier releases remain
available. This is a current-version publication, not a claim of final artistic
approval or completion of every outstanding correction.

## Restore

1. Clone this repository to recover source, edit scripts and their Git history.
2. Download the film, captions, all 14 `production-NNN.zip` files,
   `production-manifest.json` and `SHA256SUMS.txt` from this release.
3. Verify each ZIP against `SHA256SUMS.txt`, then extract all ZIPs into a single
   production folder, preserving their relative paths. These are independent
   archives, not split ZIP volumes. The manifest identifies the archive and
   SHA-256 hash for each of the 3,084 preserved files.
4. Install the Node dependencies and FFmpeg separately. Some historical edit
   scripts use absolute production paths; supply or adjust their documented
   paths to the restored production folder before rebuilding.

`scripts/verify-production-backup.ps1` compares local backup files with GitHub's
remote release sizes and SHA-256 digests. No production cache or installed
dependency is needed to recover the authored work.

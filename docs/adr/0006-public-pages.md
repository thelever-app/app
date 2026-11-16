# 0006. Public pages of the dilemmas

- Status: accepted
- Date: 2026-11-16
- Notion: [ADR: páginas públicas servidas desde Cloud Storage con un servicio pequeño de Cloud Run](https://app.notion.com/p/41995e6919c58139b9c8eab3376a6fa9)

## Context

CU-14 asks for a public page of every dilemma of the general catalog, in each language, that search engines can index, with a page per category and a home, regenerated every day from the catalog. The PWA is a single page served by Firebase Hosting, and a Hosting deploy replaces the whole site: a daily job that deployed only the pages would remove the PWA, or the PWA deploy would remove the pages.

## Decision

- **Generation:** the Cloud Run job `generate-site` reads the public catalog (`GetPublicCatalogUseCase`, with a database user that only reads the tables of Dilemmas) and writes the HTML, the sitemap and a `manifest.json` into the bucket `{project}-site`. Cloud Scheduler runs it every night, Deploy runs it after each deploy and Import the catalog after each load. It writes only the files that changed, then the manifest, then removes the files no page uses.
- **Service:** the Cloud Run service `site` answers `/{language}/…`, `/_site/…`, `/robots.txt` and `/sitemap.xml` from the bucket, behind Firebase Hosting, which rewrites those addresses to it. It sends the old address of a dilemma to its new one with 301, answers 410 to a withdrawn one and decides `X-Robots-Tag` per page and environment.
- **HTML without React:** TypeScript templates with an `html` tag that escapes every text, run by Node as the rest of the repo, with no build step.
- **Addresses:** `/{language}/{category}/{name}-{number}`, the number of the curated catalog, which never changes.
- **Links into the app:** `/new/{publicId}`, a random id each dilemma gets when it is created, so nobody reaches a dilemma by guessing ids.

## Consequences

- The PWA and the pages deploy apart and never overwrite each other.
- A change in Notion reaches the web after the next load, not at once; the CDN of Hosting keeps a page up to an hour.
- The job takes the connection of `catalog-import` in the budget of the database: they never run at the same time.

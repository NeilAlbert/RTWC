# Royal Temple Worship Centre — Page Update Task

## Task Scope
1. Update `about.html` Leadership section (expand roles, static data in `js/pages/about.js`)
2. Update `events.html` (split into Past & Upcoming, auto-sorting, toggle tabs)

## Steps

### About Page
- [x] Explore existing structure (`about.html`, `js/pages/about.js`, `css/pages/about.css`)
- [x] Split `leadershipData.presbytery` into `elders` and `deaconsDeaconesses` in `js/pages/about.js`
- [x] Update about.js render functions to target `#elders-container` and `#deacons-container`
- [x] Split "Presbytery" subsection in `about.html` into "Elders" and "Deacons & Deaconesses"
- [x] Replace invalid `margin-top-1.5` class with valid utility class in `about.html`
- [x] Add missing utility classes (`margin-bottom-3`, `margin-top-2`) to `css/pages/about.css`

### Events Page
- [x] Replace static events array in `js/pages/events.js` with `event_date`/`event_time` shape
- [x] Add date comparison logic (auto-split Upcoming vs Past)
- [x] Add sorting: Upcoming soonest-first, Past most-recent-first
- [x] Add view toggle logic (default "Upcoming"), badge counts, category filters within active view
- [x] Add "Add to Calendar" only for upcoming; photo thumbnail for past events
- [x] Add styles for view-toggle bar, tabs, badge counts, section header, no-results, past thumbnails in `css/pages/events.css`
- [x] Update `events.html` hero copy and no-results message text

### Verification
- [x] All implementation steps complete; verify in browser by opening `about.html` and `events.html`


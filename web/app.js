const mainNavTabs = document.querySelector('#main-nav-tabs');
const mainWorkspace = document.querySelector('#main-workspace');
const accountPill = document.querySelector('#account-pill');
const logoutBtn = document.querySelector('#logout-btn');
const authView = document.querySelector('#auth-view');
const authTabLogin = document.querySelector('#auth-tab-login');
const authTabSignup = document.querySelector('#auth-tab-signup');
const authForm = document.querySelector('#auth-form');
const authNameField = document.querySelector('#auth-name-field');
const authNameInput = document.querySelector('#auth-name-input');
const authEmailInput = document.querySelector('#auth-email-input');
const authPasswordInput = document.querySelector('#auth-password-input');
const authErrorEl = document.querySelector('#auth-error');
const authSubmitBtn = document.querySelector('#auth-submit-btn');

const tabRetrieveBtn = document.querySelector('#tab-retrieve');
const tabPortalsBtn = document.querySelector('#tab-portals');
const panelRetrieve = document.querySelector('#panel-retrieve');
const panelPortals = document.querySelector('#panel-portals');
const portalsCountBadge = document.querySelector('#portals-count-badge');
const watchLiveDot = document.querySelector('#watch-live-dot');
const watchStatusPill = document.querySelector('#watch-status-pill');
const watchTimingText = document.querySelector('#watch-timing-text');
const watchIntervalSelect = document.querySelector('#watch-interval-select');
const watchNotifyBtn = document.querySelector('#watch-notify-btn');
const watchToggleBtn = document.querySelector('#watch-toggle-btn');

const changesPanel = document.querySelector('#changes-panel');
const changesSummaryBadge = document.querySelector('#changes-summary-badge');
const changesList = document.querySelector('#changes-list');
const clearChangesBtn = document.querySelector('#clear-changes-btn');

const searchForm = document.querySelector('#search-form');
const companyInput = document.querySelector('#company-input');
const submitBtn = document.querySelector('#submit-btn');
const scraperCountPill = document.querySelector('#scraper-count-pill');

const toggleAdvancedBtn = document.querySelector('#toggle-advanced');
const advancedPanel = document.querySelector('#advanced-panel');
const scraperSelect = document.querySelector('#scraper-select');
const slugInput = document.querySelector('#slug-input');

const retrievePortalsEmpty = document.querySelector('#retrieve-portals-empty');
const retrievePortalsGrid = document.querySelector('#retrieve-portals-grid');
const fetchAllPortalsBtn = document.querySelector('#fetch-all-portals-btn');
const gotoPortalsBtn = document.querySelector('#goto-portals-btn');

const portalAddForm = document.querySelector('#portal-add-form');
const portalUrlInput = document.querySelector('#portal-url-input');
const portalNameInput = document.querySelector('#portal-name-input');
const portalScraperSelect = document.querySelector('#portal-scraper-select');
const portalSlugInput = document.querySelector('#portal-slug-input');
const portalBulkInput = document.querySelector('#portal-bulk-input');
const savePortalBtn = document.querySelector('#save-portal-btn');
const portalsStoragePath = document.querySelector('#portals-storage-path');
const portalsTabFetchAllBtn = document.querySelector('#portals-tab-fetch-all');
const portalsManageEmpty = document.querySelector('#portals-manage-empty');
const portalsManageList = document.querySelector('#portals-manage-list');

const statusBanner = document.querySelector('#status-banner');
const resultsSection = document.querySelector('#results-section');
const companyNameEl = document.querySelector('#company-name');
const scraperBadge = document.querySelector('#scraper-badge');
const slugBadge = document.querySelector('#slug-badge');
const countBadge = document.querySelector('#count-badge');
const loadedStat = document.querySelector('#loaded-stat');
const fetchedAtStat = document.querySelector('#fetched-at-stat');
const timingBadge = document.querySelector('#timing-badge');

const progressPanel = document.querySelector('#progress-panel');
const progressTrack = document.querySelector('#progress-track');
const progressText = document.querySelector('#progress-text');
const progressFill = document.querySelector('#progress-fill');
const stopStreamBtn = document.querySelector('#stop-stream-btn');

const expFilterPanel = document.querySelector('#exp-filter-panel');
const expFilterList = document.querySelector('#exp-filter-list');

const topTechPanel = document.querySelector('#top-tech-panel');
const topTechList = document.querySelector('#top-tech-list');

const filterInput = document.querySelector('#filter-input');
const mySkillsInput = document.querySelector('#my-skills-input');
const clearSkillsBtn = document.querySelector('#clear-skills-btn');
const locationSelect = document.querySelector('#location-select');
const sortSelect = document.querySelector('#sort-select');
const filterCount = document.querySelector('#filter-count');
const clearFiltersBtn = document.querySelector('#clear-filters-btn');
const workspaceGrid = document.querySelector('#workspace-grid');
const jobsList = document.querySelector('#jobs-list');
const splitInspector = document.querySelector('#split-inspector');
const splitInspectorInner = document.querySelector('#split-inspector-inner');
const emptyFilter = document.querySelector('#empty-filter');

const modeExpandedBtn = document.querySelector('#mode-expanded-btn');
const modeSplitBtn = document.querySelector('#mode-split-btn');
const modeCompactBtn = document.querySelector('#mode-compact-btn');

const preRegionIndiaBtn = document.querySelector('#pre-region-india');
const preRegionAllBtn = document.querySelector('#pre-region-all');
const preExp05Btn = document.querySelector('#pre-exp-0-5');
const preExp02Btn = document.querySelector('#pre-exp-0-2');
const preExpAllBtn = document.querySelector('#pre-exp-all');
const preRoleTechBtn = document.querySelector('#pre-role-tech');
const preRoleAllBtn = document.querySelector('#pre-role-all');
const liveFreshCheckbox = document.querySelector('#live-fresh-checkbox');

const copyJsonBtn = document.querySelector('#copy-json-btn');
const downloadMdBtn = document.querySelector('#download-md-btn');
const downloadCsvBtn = document.querySelector('#download-csv-btn');

const styleStudioBtn = document.querySelector('#style-studio-btn');
const styleStudioPopover = document.querySelector('#style-studio-popover');
const themeChoiceBtns = document.querySelectorAll('[data-theme-choice]');

const kpiMatchedEl = document.querySelector('#kpi-matched');
const kpiTechsEl = document.querySelector('#kpi-techs');
const kpiChangesEl = document.querySelector('#kpi-changes');
const kpiPortalsEl = document.querySelector('#kpi-portals');

const drawerBackdrop = document.querySelector('#drawer-backdrop');
const jobDrawer = document.querySelector('#job-drawer');
const drawerMeta = document.querySelector('#drawer-meta');
const drawerTitle = document.querySelector('#drawer-title');
const drawerExternalLink = document.querySelector('#drawer-external-link');
const drawerCloseBtn = document.querySelector('#drawer-close');
const drawerBody = document.querySelector('#drawer-body');
let drawerCloseTimer = null;

let savedPortals = [];
let currentCompany = null;
let jobEntries = [];
let entryById = new Map();
let filteredEntries = [];
let activeStream = null;
let viewMode = 'expanded'; // 'expanded' | 'split' | 'compact'
let selectedJobId = null;
let selectedTechFilter = '';
let selectedExpFilter = '';
let selectedPortalFilter = '';
let selectedBookmarkFilter = ''; // '' | 'saved' | 'applied'
let indiaOnly = false;
let preRegion = 'india'; // 'india' | 'all'
let preExp = '0-5'; // '0-5' | '0-2' | 'all'
let preRole = 'tech'; // 'tech' | 'all'
let sortMode = 'exp-asc'; // 'exp-asc' | 'exp-desc' | 'skill-match' | 'default'
let streamTotalToCheck = 0;
let streamTotalBoard = 0;
let streamMatchedCount = 0;
let activeRunHasExpPreFilter = false;
let lastSearchRequest = null;
let lastDrawerTrigger = null;
let watchState = null;
let watchEventSource = null;
let manualViewActive = false;
let selectedChangesOnly = false;
let bookmarkMap = {};
let userSkills = [];
let desktopAlertsEnabled = false;
let currentUser = null;
let authMode = 'login'; // 'login' | 'signup'

const INDIA_LOCATION_RE =
  /\b(india|bengaluru|bangalore|pune|hyderabad|mumbai|chennai|gurugram|gurgaon|noida|new delhi|delhi|kolkata|ahmedabad|kochi|chandigarh|jaipur|indore|coimbatore|thiruvananthapuram|trivandrum|navi mumbai|thane)\b/i;

function isIndiaLocation(location) {
  return INDIA_LOCATION_RE.test(location || '');
}

const EXP_BUCKETS = [
  { id: '', label: 'All' },
  { id: 'lt5', label: '< 5 yrs' },
  { id: '0-2', label: '0–2 yrs', min: 0, max: 2 },
  { id: '2-5', label: '2–5 yrs', min: 2, max: 5 },
  { id: '5-8', label: '5–8 yrs', min: 5, max: 8 },
  { id: '8+', label: '8+ yrs', min: 8, max: Infinity },
  { id: 'none', label: 'Unspecified' },
];

function matchesExpBucket(entry, bucketId) {
  if (!bucketId) return true;
  if (bucketId === 'none') return entry.experienceMin == null;
  if (entry.experienceMin == null) return false;
  if (bucketId === 'lt5') return entry.experienceMin < 5;
  const bucket = EXP_BUCKETS.find((b) => b.id === bucketId);
  if (!bucket || bucket.min == null) return true;
  if (entry.experienceMax != null) {
    return (
      entry.experienceMin <= bucket.max && entry.experienceMax >= bucket.min
    );
  }
  return entry.experienceMin >= bucket.min && entry.experienceMin <= bucket.max;
}

function formatTimestamp(iso) {
  if (!iso) return 'Never retrieved';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString();
}

function switchTab(tabName) {
  const isRetrieve = tabName === 'retrieve';
  tabRetrieveBtn.classList.toggle('is-active', isRetrieve);
  tabRetrieveBtn.setAttribute('aria-selected', String(isRetrieve));
  panelRetrieve.hidden = !isRetrieve;

  tabPortalsBtn.classList.toggle('is-active', !isRetrieve);
  tabPortalsBtn.setAttribute('aria-selected', String(!isRetrieve));
  panelPortals.hidden = isRetrieve;
  refreshAllSlidingPills();
}

function createSvgIcon(paths, size = 14) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '2');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  for (const def of paths) {
    const el = document.createElementNS('http://www.w3.org/2000/svg', def.tag);
    for (const [k, v] of Object.entries(def.attrs)) {
      el.setAttribute(k, v);
    }
    svg.append(el);
  }
  return svg;
}

function pinIcon() {
  return createSvgIcon([
    {
      tag: 'path',
      attrs: { d: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' },
    },
    { tag: 'circle', attrs: { cx: '12', cy: '10', r: '3' } },
  ]);
}

function externalIcon() {
  return createSvgIcon([
    {
      tag: 'path',
      attrs: { d: 'M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6' },
    },
    { tag: 'polyline', attrs: { points: '15 3 21 3 21 9' } },
    { tag: 'line', attrs: { x1: '10', y1: '14', x2: '21', y2: '3' } },
  ]);
}

function setStatus(message, type = 'info') {
  if (!message) {
    statusBanner.hidden = true;
    statusBanner.textContent = '';
    statusBanner.className = 'status-banner';
    return;
  }
  statusBanner.hidden = false;
  statusBanner.textContent = message;
  statusBanner.className = `status-banner is-${type}`;
}

function setLoading(isLoading) {
  submitBtn.disabled = isLoading;
  submitBtn.querySelector('.btn-label').textContent = isLoading
    ? 'Fetching...'
    : 'Fetch Live Jobs';
}

function stopActiveStream() {
  if (activeStream) {
    activeStream.close();
    activeStream = null;
  }
  setLoading(false);
}

function updateStatsSummary(completed, total) {
  if (activeRunHasExpPreFilter) {
    loadedStat.textContent = `${streamMatchedCount} matched (${completed}/${total} checked)`;
  } else {
    loadedStat.textContent = `${completed} / ${total} analyzed`;
  }
}

function updateProgress(completed, total, done = false, stopped = false) {
  updateStatsSummary(completed, total);
  if (total === 0) {
    progressPanel.hidden = false;
    progressFill.style.width = '100%';
    progressTrack.setAttribute('aria-valuenow', '100');
    progressTrack.setAttribute('aria-busy', 'false');
    stopStreamBtn.hidden = true;
    progressText.textContent =
      preRegion === 'india' && streamTotalBoard > 0
        ? `0 India openings found out of ${streamTotalBoard} total openings on this board.`
        : 'No openings found on this board.';
    return;
  }
  progressPanel.hidden = false;
  const pct = Math.round((completed / total) * 100);
  progressFill.style.width = `${pct}%`;
  progressTrack.setAttribute('aria-valuenow', String(pct));
  progressTrack.setAttribute('aria-busy', String(!done && !stopped));

  const scopeLabel =
    preRegion === 'india'
      ? `India openings (from ${streamTotalBoard} total)`
      : 'openings';

  if (activeRunHasExpPreFilter) {
    if (done) {
      progressText.textContent = `Completed: ${streamMatchedCount} openings match ${preExp} yrs across ${completed} ${scopeLabel}.`;
      stopStreamBtn.hidden = true;
    } else if (stopped) {
      progressText.textContent = `Stopped: ${streamMatchedCount} matched (${completed} / ${total} ${scopeLabel} checked).`;
      stopStreamBtn.hidden = true;
    } else {
      progressText.textContent = `Filtering ${scopeLabel}: ${completed} / ${total} checked · ${streamMatchedCount} matched ${preExp} yrs (${pct}%)`;
      stopStreamBtn.hidden = false;
    }
    return;
  }

  if (done) {
    progressText.textContent = `Completed: extracted tech & experience for ${completed} / ${total} ${scopeLabel} (100%).`;
    stopStreamBtn.hidden = true;
  } else if (stopped) {
    progressText.textContent = `Stopped: extracted ${completed} / ${total} ${scopeLabel} (${pct}%).`;
    stopStreamBtn.hidden = true;
  } else {
    progressText.textContent = `Extracting tech stack & experience: ${completed} / ${total} ${scopeLabel} (${pct}%)`;
    stopStreamBtn.hidden = false;
  }
}

function populateLocationFilter(entries) {
  const counts = new Map();
  for (const entry of entries) {
    const loc = (entry.location || 'Unspecified').trim();
    counts.set(loc, (counts.get(loc) ?? 0) + 1);
  }
  const sorted = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );

  locationSelect.replaceChildren();
  const allOption = document.createElement('option');
  allOption.value = '';
  allOption.textContent = `All locations (${entries.length})`;
  locationSelect.append(allOption);

  for (const [loc, count] of sorted) {
    const option = document.createElement('option');
    option.value = loc;
    option.textContent = `${loc} (${count})`;
    locationSelect.append(option);
  }
}

function getEntryUid(entry) {
  return entry.uid || `${entry.portalId || entry.slug || 'board'}:${entry.id}`;
}

function getBookmarkKey(entry) {
  return entry.url || getEntryUid(entry);
}

function getEntryBookmark(entry) {
  return bookmarkMap[getBookmarkKey(entry)] || { saved: false, applied: false };
}

function getSkillMatches(entry) {
  if (!userSkills.length) return { count: 0, matchedSet: new Set() };
  const matchedSet = new Set();
  const titleLower = (entry.title || '').toLowerCase();
  const techs = entry.technologies || [];
  let count = 0;
  for (const skill of userSkills) {
    const s = skill.toLowerCase();
    const matchedTech = techs.find(
      (t) => t.toLowerCase() === s || t.toLowerCase().includes(s)
    );
    if (matchedTech) {
      count++;
      matchedSet.add(matchedTech.toLowerCase());
    } else if (titleLower.includes(s)) {
      count++;
    }
  }
  return { count, matchedSet };
}

async function toggleBookmark(entry, field) {
  const key = getBookmarkKey(entry);
  const current = getEntryBookmark(entry);
  const nextVal = !current[field];
  const optimistic = { ...current, [field]: nextVal };
  if (!optimistic.saved && !optimistic.applied) {
    delete bookmarkMap[key];
  } else {
    bookmarkMap[key] = optimistic;
  }
  if (entry.dom) syncCardDetails(entry);
  refreshExpFilterBar();
  if (selectedBookmarkFilter) applyFilters();

  try {
    const res = await fetch('/api/bookmarks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, [field]: nextVal }),
    });
    if (res.ok) {
      const data = await res.json();
      bookmarkMap = data.bookmarks || bookmarkMap;
      if (entry.dom) syncCardDetails(entry);
      refreshExpFilterBar();
    }
  } catch {
    // Keep optimistic state if offline
  }
}

async function loadBookmarks() {
  try {
    const res = await fetch('/api/bookmarks');
    if (!res.ok) return;
    const data = await res.json();
    bookmarkMap = data.bookmarks || {};
    for (const entry of jobEntries) {
      if (entry.dom) syncCardDetails(entry);
    }
    refreshExpFilterBar();
  } catch {
    // Ignore non-fatal bookmark load failure
  }
}

function refreshExpFilterBar() {
  expFilterList.replaceChildren();
  expFilterPanel.hidden = jobEntries.length === 0;

  const indiaCount = jobEntries.filter((e) =>
    isIndiaLocation(e.location)
  ).length;
  const indiaLt5Count = jobEntries.filter(
    (e) => isIndiaLocation(e.location) && matchesExpBucket(e, 'lt5')
  ).length;

  const comboBtn = document.createElement('button');
  comboBtn.type = 'button';
  const comboActive = indiaOnly && selectedExpFilter === 'lt5';
  comboBtn.className = comboActive ? 'chip is-active' : 'chip';
  comboBtn.setAttribute('aria-pressed', String(comboActive));
  comboBtn.textContent = `India · < 5 yrs (${indiaLt5Count})`;
  comboBtn.addEventListener('click', () => {
    if (comboActive) {
      indiaOnly = false;
      selectedExpFilter = '';
    } else {
      indiaOnly = true;
      selectedExpFilter = 'lt5';
    }
    refreshExpFilterBar();
    refreshTopTechnologies();
    applyFilters();
  });
  expFilterList.append(comboBtn);

  const indiaBtn = document.createElement('button');
  indiaBtn.type = 'button';
  indiaBtn.className = indiaOnly ? 'chip is-active' : 'chip';
  indiaBtn.setAttribute('aria-pressed', String(indiaOnly));
  indiaBtn.textContent = `India only (${indiaCount})`;
  indiaBtn.addEventListener('click', () => {
    indiaOnly = !indiaOnly;
    refreshExpFilterBar();
    refreshTopTechnologies();
    applyFilters();
  });
  expFilterList.append(indiaBtn);

  const savedCount = jobEntries.filter((e) => getEntryBookmark(e).saved).length;
  if (savedCount > 0 || selectedBookmarkFilter === 'saved') {
    const savedBtn = document.createElement('button');
    savedBtn.type = 'button';
    const active = selectedBookmarkFilter === 'saved';
    savedBtn.className = active ? 'chip is-active' : 'chip';
    savedBtn.setAttribute('aria-pressed', String(active));
    savedBtn.textContent = `Saved (${savedCount})`;
    savedBtn.addEventListener('click', () => {
      selectedBookmarkFilter = active ? '' : 'saved';
      refreshExpFilterBar();
      applyFilters();
    });
    expFilterList.append(savedBtn);
  }

  const appliedCount = jobEntries.filter(
    (e) => getEntryBookmark(e).applied
  ).length;
  if (appliedCount > 0 || selectedBookmarkFilter === 'applied') {
    const appliedBtn = document.createElement('button');
    appliedBtn.type = 'button';
    const active = selectedBookmarkFilter === 'applied';
    appliedBtn.className = active ? 'chip is-active' : 'chip';
    appliedBtn.setAttribute('aria-pressed', String(active));
    appliedBtn.textContent = `Applied (${appliedCount})`;
    appliedBtn.addEventListener('click', () => {
      selectedBookmarkFilter = active ? '' : 'applied';
      refreshExpFilterBar();
      applyFilters();
    });
    expFilterList.append(appliedBtn);
  }

  const changedCount = jobEntries.filter(
    (e) => e.changeType === 'added' || e.changeType === 'updated'
  ).length;
  if (changedCount > 0 || selectedChangesOnly) {
    const chgBtn = document.createElement('button');
    chgBtn.type = 'button';
    chgBtn.className = selectedChangesOnly ? 'chip is-active' : 'chip';
    chgBtn.setAttribute('aria-pressed', String(selectedChangesOnly));
    chgBtn.textContent = `New / Updated (${changedCount})`;
    chgBtn.addEventListener('click', () => {
      selectedChangesOnly = !selectedChangesOnly;
      refreshExpFilterBar();
      refreshTopTechnologies();
      applyFilters();
    });
    expFilterList.append(chgBtn);
  }

  for (const bucket of EXP_BUCKETS) {
    const basePool = indiaOnly
      ? jobEntries.filter((e) => isIndiaLocation(e.location))
      : jobEntries;
    const count = basePool.filter((e) => matchesExpBucket(e, bucket.id)).length;
    if (bucket.id !== '' && count === 0 && selectedExpFilter !== bucket.id)
      continue;

    const btn = document.createElement('button');
    btn.type = 'button';
    const isActive =
      bucket.id === ''
        ? selectedExpFilter === '' &&
          !indiaOnly &&
          !selectedTechFilter &&
          !selectedChangesOnly &&
          !selectedBookmarkFilter &&
          !selectedPortalFilter
        : selectedExpFilter === bucket.id;
    btn.className = isActive ? 'chip is-active-info' : 'chip';
    btn.setAttribute('aria-pressed', String(isActive));
    btn.textContent = `${bucket.label} (${count})`;
    btn.addEventListener('click', () => {
      if (bucket.id === '') {
        selectedExpFilter = '';
        indiaOnly = false;
        selectedTechFilter = '';
        selectedChangesOnly = false;
        selectedBookmarkFilter = '';
        selectedPortalFilter = '';
        renderPortalsViews();
      } else {
        selectedExpFilter = selectedExpFilter === bucket.id ? '' : bucket.id;
      }
      refreshExpFilterBar();
      refreshTopTechnologies();
      applyFilters();
    });
    expFilterList.append(btn);
  }
}

function refreshTopTechnologies() {
  const counts = new Map();
  const basePool = jobEntries.filter((entry) => {
    if (indiaOnly && !isIndiaLocation(entry.location)) return false;
    if (!matchesExpBucket(entry, selectedExpFilter)) return false;
    return true;
  });
  for (const entry of basePool) {
    for (const tech of entry.technologies) {
      counts.set(tech, (counts.get(tech) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 14);

  topTechList.replaceChildren();
  topTechPanel.hidden = top.length === 0;

  for (const [tech, count] of top) {
    const btn = document.createElement('button');
    btn.type = 'button';
    const isActive = selectedTechFilter === tech;
    btn.className = isActive ? 'chip is-active' : 'chip';
    btn.setAttribute('aria-pressed', String(isActive));
    btn.textContent = `${tech} (${count})`;
    btn.addEventListener('click', () => {
      selectedTechFilter = selectedTechFilter === tech ? '' : tech;
      refreshTopTechnologies();
      applyFilters();
    });
    topTechList.append(btn);
  }
}

function renderRequirementsGrid(entry, container) {
  container.replaceChildren();

  const grid = document.createElement('div');
  grid.className = 'req-grid';

  const techCol = document.createElement('div');
  const techHeading = document.createElement('h4');
  techHeading.className = 'req-block-title';
  techHeading.textContent = 'Technology Expertise';
  techCol.append(techHeading);

  if (entry.technologies.length > 0) {
    const pills = document.createElement('div');
    pills.className = 'tech-pills';
    const { matchedSet } = getSkillMatches(entry);
    entry.technologies.forEach((tech, idx) => {
      const pill = document.createElement('span');
      const isMatch = matchedSet.has(tech.toLowerCase());
      pill.className = isMatch ? 'tech-pill is-matched' : 'tech-pill';
      pill.style.setProperty('--pill-i', String(Math.min(idx, 12)));
      pill.textContent = tech;
      pills.append(pill);
    });
    techCol.append(pills);
  } else {
    const empty = document.createElement('p');
    empty.className = 'req-empty';
    empty.textContent = 'No specific tools or languages detected.';
    techCol.append(empty);
  }

  const expCol = document.createElement('div');
  const expHeading = document.createElement('h4');
  expHeading.className = 'req-block-title';
  expHeading.textContent = entry.experienceSummary
    ? `Experience Wanted (${entry.experienceSummary})`
    : 'Experience Wanted';
  expCol.append(expHeading);

  if (entry.experience.length > 0) {
    const list = document.createElement('ul');
    list.className = 'exp-list';
    for (const item of entry.experience) {
      const li = document.createElement('li');
      li.textContent = item;
      list.append(li);
    }
    expCol.append(list);
  } else {
    const empty = document.createElement('p');
    empty.className = 'req-empty';
    empty.textContent = 'No explicit experience requirements listed.';
    expCol.append(empty);
  }

  grid.append(techCol, expCol);
  container.append(grid);
}

function renderSplitInspector(entry) {
  if (viewMode !== 'split') return;
  splitInspectorInner.replaceChildren();
  if (!entry) {
    const p = document.createElement('p');
    p.className = 'empty-inspector';
    p.textContent =
      'Select any opening from the list to view its required tech and experience.';
    splitInspectorInner.append(p);
    return;
  }

  const head = document.createElement('div');
  head.className = 'split-inspector-header';

  const info = document.createElement('div');
  const title = document.createElement('h3');
  title.textContent = entry.title;
  const meta = document.createElement('div');
  meta.className = 'job-meta';
  meta.textContent = `${entry.companyName ? `${entry.companyName} · ` : ''}${entry.location || 'Location unspecified'} · ${entry.id}`;
  info.append(title, meta);

  const link = document.createElement('a');
  link.className = 'btn btn-accent-soft';
  link.href = entry.url;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  const label = document.createElement('span');
  label.textContent = 'Open Posting';
  link.append(label, externalIcon());

  head.append(info, link);

  const body = document.createElement('div');
  if (entry.status === 'pending') {
    const p = document.createElement('p');
    p.className = 'job-details-placeholder';
    p.textContent =
      'Extracting technology expertise and experience requirements...';
    body.append(p);
  } else if (entry.status === 'error') {
    const p = document.createElement('p');
    p.className = 'job-details-error';
    p.textContent = entry.error || 'Could not extract job requirements.';
    body.append(p);
  } else {
    renderRequirementsGrid(entry, body);
  }

  splitInspectorInner.append(head, body);
}

function syncCardDetails(entry) {
  if (!entry.dom) return;
  const {
    card,
    statusPill,
    changeBadge,
    matchBadge,
    expBadge,
    bookmarkBtn,
    appliedBtn,
    detailsWrap,
    detailsBox,
    toggleBtn,
  } = entry.dom;

  card.classList.toggle(
    'is-selected',
    viewMode === 'split' && getEntryUid(entry) === selectedJobId
  );
  const showInline = viewMode !== 'split' && entry.expanded;
  detailsWrap.classList.toggle('is-open', showInline);
  detailsWrap.setAttribute('aria-hidden', String(!showInline));
  toggleBtn.hidden = viewMode === 'split';
  toggleBtn.textContent = entry.expanded ? 'Hide' : 'Show';
  toggleBtn.setAttribute('aria-expanded', String(showInline));

  const bm = getEntryBookmark(entry);
  if (bookmarkBtn) {
    bookmarkBtn.classList.toggle('is-active', bm.saved);
    bookmarkBtn.setAttribute('aria-pressed', String(bm.saved));
    bookmarkBtn.textContent = bm.saved ? 'Saved' : 'Save';
  }
  if (appliedBtn) {
    appliedBtn.classList.toggle('is-active', bm.applied);
    appliedBtn.setAttribute('aria-pressed', String(bm.applied));
    appliedBtn.textContent = bm.applied ? 'Applied ✓' : 'Applied';
  }

  if (matchBadge) {
    const { count } = getSkillMatches(entry);
    if (userSkills.length > 0 && count > 0) {
      matchBadge.hidden = false;
      matchBadge.textContent = `${count}/${userSkills.length} match`;
    } else {
      matchBadge.hidden = true;
    }
  }

  if (changeBadge) {
    if (entry.changeType === 'added') {
      changeBadge.hidden = false;
      changeBadge.className = 'change-badge is-added';
      changeBadge.textContent = 'New';
    } else if (entry.changeType === 'updated') {
      changeBadge.hidden = false;
      changeBadge.className = 'change-badge is-updated';
      changeBadge.textContent = 'Updated';
    } else {
      changeBadge.hidden = true;
    }
  }

  if (entry.experienceSummary) {
    expBadge.hidden = false;
    expBadge.textContent = entry.experienceSummary;
  } else {
    expBadge.hidden = true;
  }

  if (entry.status === 'pending') {
    statusPill.textContent = 'Extracting...';
    statusPill.className = 'job-status-pill';
    if (showInline) {
      detailsBox.replaceChildren();
      const stack = document.createElement('div');
      stack.className = 'skeleton-stack';
      const bar1 = document.createElement('div');
      bar1.className = 'skeleton-bar';
      const bar2 = document.createElement('div');
      bar2.className = 'skeleton-bar is-short';
      const p = document.createElement('p');
      p.className = 'job-details-placeholder';
      p.textContent =
        'Extracting technology expertise and experience requirements...';
      stack.append(bar1, bar2, p);
      detailsBox.append(stack);
    }
  } else if (entry.status === 'error') {
    statusPill.textContent = 'Failed';
    statusPill.className = 'job-status-pill is-error';
    detailsBox.replaceChildren();
    const p = document.createElement('p');
    p.className = 'job-details-error';
    p.textContent = entry.error || 'Could not extract requirements.';
    detailsBox.append(p);
  } else {
    statusPill.textContent = `${entry.technologies.length} tech`;
    statusPill.className = 'job-status-pill is-loaded';
    if (!entry.dom.rendered) {
      renderRequirementsGrid(entry, detailsBox);
      entry.dom.rendered = true;
    }
  }

  if (viewMode === 'split' && getEntryUid(entry) === selectedJobId) {
    renderSplitInspector(entry);
  }
}

function selectJobInSplit(entry) {
  const prev = selectedJobId ? entryById.get(selectedJobId) : null;
  selectedJobId = getEntryUid(entry);
  if (prev?.dom) syncCardDetails(prev);
  if (entry.dom) syncCardDetails(entry);
  renderSplitInspector(entry);
}

function createJobCard(entry) {
  const card = document.createElement('article');
  card.className = 'job-card';
  card.setAttribute('role', 'listitem');

  const header = document.createElement('div');
  header.className = 'job-card-header';

  const main = document.createElement('div');
  main.className = 'job-main';

  const title = document.createElement('h3');
  title.className = 'job-title';
  title.textContent = entry.title;

  const meta = document.createElement('div');
  meta.className = 'job-meta';

  if (entry.companyName) {
    const companySpan = document.createElement('span');
    companySpan.className = 'job-id';
    companySpan.textContent = entry.companyName;
    meta.append(companySpan);
  }

  const location = document.createElement('span');
  location.className = 'job-location';
  const locText = document.createElement('span');
  locText.textContent = entry.location || 'Location unspecified';
  location.append(pinIcon(), locText);

  const idSpan = document.createElement('span');
  idSpan.className = 'job-id';
  idSpan.textContent = entry.id;

  const expBadge = document.createElement('span');
  expBadge.className = 'exp-pill';
  expBadge.hidden = true;

  const statusPill = document.createElement('span');
  statusPill.className = 'job-status-pill';

  const changeBadge = document.createElement('span');
  changeBadge.className = 'change-badge';
  changeBadge.hidden = true;

  const matchBadge = document.createElement('span');
  matchBadge.className = 'match-pill';
  matchBadge.hidden = true;

  meta.append(location, idSpan, expBadge, statusPill, matchBadge, changeBadge);
  main.append(title, meta);

  const actions = document.createElement('div');
  actions.className = 'job-actions';

  const bookmarkBtn = document.createElement('button');
  bookmarkBtn.type = 'button';
  bookmarkBtn.className = 'btn btn-secondary btn-bookmark';
  bookmarkBtn.textContent = 'Save';
  bookmarkBtn.addEventListener('click', () => {
    void toggleBookmark(entry, 'saved');
  });

  const appliedBtn = document.createElement('button');
  appliedBtn.type = 'button';
  appliedBtn.className = 'btn btn-secondary btn-applied';
  appliedBtn.textContent = 'Applied';
  appliedBtn.addEventListener('click', () => {
    void toggleBookmark(entry, 'applied');
  });

  const inspectBtn = document.createElement('button');
  inspectBtn.type = 'button';
  inspectBtn.className = 'btn btn-secondary';
  inspectBtn.textContent = 'Inspect';
  inspectBtn.addEventListener('click', (event) => {
    if (viewMode === 'split') {
      selectJobInSplit(entry);
    } else {
      void openJobDrawer(entry, event.currentTarget);
    }
  });

  const toggleBtn = document.createElement('button');
  toggleBtn.type = 'button';
  toggleBtn.className = 'btn btn-secondary';
  toggleBtn.addEventListener('click', () => {
    entry.expanded = !entry.expanded;
    syncCardDetails(entry);
  });

  const openLink = document.createElement('a');
  openLink.className = 'btn btn-accent-soft';
  openLink.href = entry.url;
  openLink.target = '_blank';
  openLink.rel = 'noopener noreferrer';
  const openText = document.createElement('span');
  openText.textContent = 'Open';
  openLink.append(openText, externalIcon());

  actions.append(bookmarkBtn, appliedBtn, toggleBtn, inspectBtn, openLink);
  header.append(main, actions);

  const detailsWrap = document.createElement('div');
  detailsWrap.className = 'job-details-collapse';

  const detailsOverflow = document.createElement('div');
  detailsOverflow.className = 'job-details-inline';

  const detailsBox = document.createElement('div');
  detailsBox.className = 'job-details-inner';

  detailsOverflow.append(detailsBox);
  detailsWrap.append(detailsOverflow);
  card.append(header, detailsWrap);

  entry.dom = {
    card,
    statusPill,
    changeBadge,
    matchBadge,
    expBadge,
    bookmarkBtn,
    appliedBtn,
    toggleBtn,
    detailsWrap,
    detailsBox,
    rendered: false,
  };
  syncCardDetails(entry);
  return card;
}

function setViewMode(nextMode) {
  viewMode = nextMode;
  const buttons = [
    [modeExpandedBtn, 'expanded'],
    [modeSplitBtn, 'split'],
    [modeCompactBtn, 'compact'],
  ];
  for (const [btn, mode] of buttons) {
    const active = mode === nextMode;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  }

  workspaceGrid.classList.toggle('is-split', nextMode === 'split');
  splitInspector.hidden = nextMode !== 'split';
  refreshAllSlidingPills();

  for (const entry of jobEntries) {
    if (nextMode === 'expanded') entry.expanded = true;
    if (nextMode === 'compact') entry.expanded = false;
    if (entry.dom) syncCardDetails(entry);
  }

  if (nextMode === 'split') {
    const selected =
      (selectedJobId && entryById.get(selectedJobId)) ||
      filteredEntries[0] ||
      jobEntries[0] ||
      null;
    if (selected) {
      selectJobInSplit(selected);
    } else {
      renderSplitInspector(null);
    }
  }
}

function compareExperience(a, b, direction = 'asc') {
  const aHas = a.experienceMin != null;
  const bHas = b.experienceMin != null;
  if (aHas !== bHas) return aHas ? -1 : 1;
  if (aHas && bHas) {
    const minDiff =
      direction === 'asc'
        ? a.experienceMin - b.experienceMin
        : b.experienceMin - a.experienceMin;
    if (minDiff !== 0) return minDiff;
    const aMax = a.experienceMax ?? a.experienceMin;
    const bMax = b.experienceMax ?? b.experienceMin;
    const maxDiff = direction === 'asc' ? aMax - bMax : bMax - aMax;
    if (maxDiff !== 0) return maxDiff;
  }
  return a.title.localeCompare(b.title);
}

function applyFilters() {
  if (!currentCompany) return;
  const query = filterInput.value.trim().toLowerCase();
  const selectedLocation = locationSelect.value;

  filteredEntries = jobEntries.filter((entry) => {
    const loc = (entry.location || 'Unspecified').trim();
    if (selectedPortalFilter && entry.portalId !== selectedPortalFilter) {
      return false;
    }
    if (selectedLocation && loc !== selectedLocation) return false;
    if (indiaOnly && !isIndiaLocation(entry.location)) return false;
    if (selectedBookmarkFilter === 'saved' && !getEntryBookmark(entry).saved) {
      return false;
    }
    if (
      selectedBookmarkFilter === 'applied' &&
      !getEntryBookmark(entry).applied
    ) {
      return false;
    }
    if (
      selectedChangesOnly &&
      entry.changeType !== 'added' &&
      entry.changeType !== 'updated'
    ) {
      return false;
    }
    if (!matchesExpBucket(entry, selectedExpFilter)) return false;
    if (
      selectedTechFilter &&
      !entry.technologies.includes(selectedTechFilter)
    ) {
      return false;
    }
    if (!query) return true;
    return (
      entry.title.toLowerCase().includes(query) ||
      (entry.companyName && entry.companyName.toLowerCase().includes(query)) ||
      loc.toLowerCase().includes(query) ||
      entry.id.toLowerCase().includes(query) ||
      (entry.experienceSummary &&
        entry.experienceSummary.toLowerCase().includes(query)) ||
      entry.technologies.some((t) => t.toLowerCase().includes(query)) ||
      entry.experience.some((e) => e.toLowerCase().includes(query))
    );
  });

  if (sortMode === 'exp-asc') {
    filteredEntries.sort((a, b) => compareExperience(a, b, 'asc'));
  } else if (sortMode === 'exp-desc') {
    filteredEntries.sort((a, b) => compareExperience(a, b, 'desc'));
  } else if (sortMode === 'skill-match') {
    filteredEntries.sort((a, b) => {
      const diff = getSkillMatches(b).count - getSkillMatches(a).count;
      return diff !== 0 ? diff : compareExperience(a, b, 'asc');
    });
  }

  renderFilteredCards();
}

function renderFilteredCards() {
  jobsList.replaceChildren();
  const countText =
    filteredEntries.length === jobEntries.length
      ? `${jobEntries.length} openings`
      : `Showing ${filteredEntries.length} of ${jobEntries.length}`;
  filterCount.textContent = countText;

  if (
    filteredEntries.length !== jobEntries.length ||
    selectedExpFilter ||
    selectedTechFilter ||
    selectedPortalFilter ||
    selectedBookmarkFilter ||
    indiaOnly
  ) {
    loadedStat.textContent = `Showing ${filteredEntries.length} of ${jobEntries.length} retrieved`;
  } else {
    loadedStat.textContent = `${jobEntries.length} displayed`;
  }

  emptyFilter.hidden = filteredEntries.length > 0;

  const fragment = document.createDocumentFragment();
  filteredEntries.forEach((entry, idx) => {
    const card = entry.dom ? entry.dom.card : createJobCard(entry);
    card.style.setProperty('--stagger-index', String(idx));
    fragment.append(card);
  });
  jobsList.append(fragment);
  updateKpiStrip();

  if (viewMode === 'split' && filteredEntries.length > 0) {
    const stillVisible = filteredEntries.some(
      (e) => getEntryUid(e) === selectedJobId
    );
    if (!stillVisible) {
      selectJobInSplit(filteredEntries[0]);
    }
  }
  refreshAllSlidingPills();
}

async function openJobDrawer(entry, triggerEl = null) {
  if (!currentCompany) return;
  lastDrawerTrigger = triggerEl;
  drawerTitle.textContent = entry.title;
  drawerMeta.textContent = `${entry.companyName || currentCompany.name} · ${entry.location || 'Location unspecified'} · ${entry.id}`;
  drawerExternalLink.href = entry.url;

  if (drawerCloseTimer) {
    clearTimeout(drawerCloseTimer);
    drawerCloseTimer = null;
  }
  drawerBackdrop.classList.remove('is-closing');
  jobDrawer.classList.remove('is-closing');
  drawerBackdrop.hidden = false;
  jobDrawer.hidden = false;
  jobDrawer.setAttribute('aria-hidden', 'false');
  drawerCloseBtn.focus();

  drawerBody.className = 'drawer-body';
  if (entry.status === 'loaded') {
    renderRequirementsGrid(entry, drawerBody);
    return;
  }

  drawerBody.textContent = 'Extracting technology expertise and experience...';
  try {
    const params = new URLSearchParams({
      scraper: entry.scraper || currentCompany.scraper,
      slug: entry.slug || currentCompany.slug,
      id: entry.id,
      url: entry.url,
    });
    const response = await fetch(`/api/job?${params.toString()}`);
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Failed to load job requirements');
    }
    entry.status = 'loaded';
    entry.technologies = payload.technologies || [];
    entry.experienceSummary = payload.experienceSummary || null;
    entry.experienceMin =
      typeof payload.experienceMin === 'number' ? payload.experienceMin : null;
    entry.experienceMax =
      typeof payload.experienceMax === 'number' ? payload.experienceMax : null;
    entry.experience = payload.experience || [];
    if (entry.dom) {
      entry.dom.rendered = false;
      syncCardDetails(entry);
    }
    refreshExpFilterBar();
    refreshTopTechnologies();
    renderRequirementsGrid(entry, drawerBody);
  } catch (error) {
    drawerBody.textContent =
      error instanceof Error
        ? error.message
        : 'Unable to extract job requirements.';
  }
}

function closeDrawer() {
  if (jobDrawer.hidden) return;
  drawerBackdrop.classList.add('is-closing');
  jobDrawer.classList.add('is-closing');
  jobDrawer.setAttribute('aria-hidden', 'true');
  if (drawerCloseTimer) clearTimeout(drawerCloseTimer);
  drawerCloseTimer = setTimeout(() => {
    drawerBackdrop.hidden = true;
    jobDrawer.hidden = true;
    drawerBackdrop.classList.remove('is-closing');
    jobDrawer.classList.remove('is-closing');
    drawerCloseTimer = null;
  }, 200);
  if (lastDrawerTrigger && typeof lastDrawerTrigger.focus === 'function') {
    lastDrawerTrigger.focus();
  }
  lastDrawerTrigger = null;
}

function resetResultsState() {
  resultsSection.hidden = true;
  progressPanel.hidden = true;
  expFilterPanel.hidden = true;
  topTechPanel.hidden = true;
  currentCompany = null;
  jobEntries = [];
  entryById = new Map();
  filteredEntries = [];
  selectedJobId = null;
  selectedTechFilter = '';
  selectedExpFilter = '';
  selectedPortalFilter = '';
  selectedBookmarkFilter = '';
  selectedChangesOnly = false;
  indiaOnly = false;
  fetchedAtStat.textContent = '';
}

function streamSingleTarget(
  queryText,
  overrides = null,
  options = { appendMode: false, fresh: false, portalId: '' }
) {
  return new Promise((resolvePromise) => {
    const scraper = overrides ? overrides.scraper : scraperSelect.value.trim();
    const slug = overrides ? overrides.slug : slugInput.value.trim();

    const params = new URLSearchParams();
    if (queryText) params.set('q', queryText);
    if (scraper) params.set('scraper', scraper);
    if (slug) params.set('slug', slug);
    params.set('region', preRegion);
    params.set('role', preRole);
    params.set('exp', preExp);
    if (options.fresh) params.set('fresh', '1');
    if (options.portalId) params.set('portalId', options.portalId);

    const stream = new EventSource(`/api/jobs/stream?${params.toString()}`);
    activeStream = stream;
    let streamCompanySlug = options.slug || '';

    stream.addEventListener('list', (event) => {
      const payload = JSON.parse(event.data);
      streamCompanySlug = payload.company.slug || streamCompanySlug;
      if (!options.appendMode) {
        currentCompany = payload.company;
        streamTotalToCheck = payload.count;
        streamTotalBoard = payload.totalBoardCount ?? payload.count;
        streamMatchedCount = 0;

        jobEntries = payload.jobs.map((job) => {
          const entry = {
            ...job,
            companyName: payload.company.name,
            scraper: payload.company.scraper,
            slug: payload.company.slug,
            status: 'pending',
            expanded: viewMode === 'expanded',
            technologies: [],
            experienceSummary: null,
            experienceMin: null,
            experienceMax: null,
            experience: [],
            error: '',
            dom: null,
          };
          entryById.set(`${payload.company.slug}:${job.id}`, entry);
          return entry;
        });

        setStatus('');
        resultsSection.hidden = false;
        companyNameEl.textContent = payload.company.name;
        scraperBadge.textContent = payload.company.scraper;
        slugBadge.textContent = `slug: ${payload.company.slug}`;
        countBadge.textContent =
          preRegion === 'india' && streamTotalBoard !== payload.count
            ? `${payload.count} in India (${streamTotalBoard} total)`
            : `${payload.count} openings`;
        fetchedAtStat.textContent = `live @ ${new Date(payload.fetchedAt).toLocaleTimeString()}`;
        timingBadge.textContent = `list ${payload.elapsedMs}ms`;

        filterInput.value = '';
        populateLocationFilter(jobEntries);
        refreshExpFilterBar();
        applyFilters();
        setViewMode(viewMode);
        updateProgress(0, streamTotalToCheck, streamTotalToCheck === 0, false);
      } else {
        streamTotalToCheck += payload.count;
        streamTotalBoard += payload.totalBoardCount ?? payload.count;
        countBadge.textContent = `${streamTotalToCheck} in ${preRegion === 'india' ? 'India' : 'all regions'} (${streamTotalBoard} total)`;
        fetchedAtStat.textContent = `live @ ${new Date(payload.fetchedAt).toLocaleTimeString()}`;

        for (const job of payload.jobs) {
          const key = `${payload.company.slug}:${job.id}`;
          if (entryById.has(key)) continue;
          const entry = {
            ...job,
            companyName: payload.company.name,
            scraper: payload.company.scraper,
            slug: payload.company.slug,
            status: 'pending',
            expanded: viewMode === 'expanded',
            technologies: [],
            experienceSummary: null,
            experienceMin: null,
            experienceMax: null,
            experience: [],
            error: '',
            dom: null,
          };
          entryById.set(key, entry);
          jobEntries.push(entry);
        }
        populateLocationFilter(jobEntries);
        applyFilters();
        refreshExpFilterBar();
      }
    });

    stream.addEventListener('progress', (event) => {
      const payload = JSON.parse(event.data);
      if (!options.appendMode) {
        streamMatchedCount = payload.matched ?? streamMatchedCount;
        updateProgress(payload.completed, payload.total, false, false);
      }
    });

    stream.addEventListener('detail', (event) => {
      const payload = JSON.parse(event.data);
      const entryKey = `${streamCompanySlug}:${payload.id}`;
      let entry = entryById.get(entryKey);
      if (!options.appendMode) {
        streamMatchedCount = payload.matched ?? streamMatchedCount + 1;
      } else {
        streamMatchedCount++;
      }

      if (!entry) {
        entry = {
          id: payload.id,
          title: payload.title,
          location: payload.location,
          url: payload.url,
          companyName: options.portalName || currentCompany?.name || '',
          scraper: options.scraper || currentCompany?.scraper || '',
          slug: options.slug || currentCompany?.slug || '',
          status: 'loaded',
          expanded: viewMode === 'expanded',
          technologies: payload.technologies || [],
          experienceSummary: payload.experienceSummary || null,
          experienceMin:
            typeof payload.experienceMin === 'number'
              ? payload.experienceMin
              : null,
          experienceMax:
            typeof payload.experienceMax === 'number'
              ? payload.experienceMax
              : null,
          experience: payload.experience || [],
          error: '',
          dom: null,
        };
        const uniqueKey = `${entry.slug}:${entry.id}`;
        entryById.set(uniqueKey, entry);
        jobEntries.push(entry);
        populateLocationFilter(jobEntries);
        applyFilters();
        refreshExpFilterBar();
        refreshTopTechnologies();
      } else {
        entry.status = 'loaded';
        entry.technologies = payload.technologies || [];
        entry.experienceSummary = payload.experienceSummary || null;
        entry.experienceMin =
          typeof payload.experienceMin === 'number'
            ? payload.experienceMin
            : null;
        entry.experienceMax =
          typeof payload.experienceMax === 'number'
            ? payload.experienceMax
            : null;
        entry.experience = payload.experience || [];
        if (entry.dom) {
          entry.dom.rendered = false;
          syncCardDetails(entry);
        }
        if (
          payload.completed % 5 === 0 ||
          payload.completed === payload.total
        ) {
          refreshExpFilterBar();
          refreshTopTechnologies();
          if (sortMode !== 'default') applyFilters();
        }
      }
      if (!options.appendMode) {
        updateProgress(payload.completed, payload.total, false, false);
      } else {
        updateStatsSummary(streamMatchedCount, streamTotalToCheck);
      }
    });

    stream.addEventListener('detail_error', (event) => {
      const payload = JSON.parse(event.data);
      const entry = entryById.get(`${streamCompanySlug}:${payload.id}`);
      if (entry) {
        entry.status = 'error';
        entry.error = payload.error;
        if (entry.dom) syncCardDetails(entry);
      }
      if (!options.appendMode) {
        updateProgress(payload.completed, payload.total, false, false);
      }
    });

    stream.addEventListener('done', (event) => {
      const payload = JSON.parse(event.data);
      stream.close();
      if (activeStream === stream) activeStream = null;
      if (!options.appendMode) {
        streamMatchedCount = payload.matched ?? streamMatchedCount;
        timingBadge.textContent = `total ${payload.elapsedMs}ms`;
        fetchedAtStat.textContent = `live @ ${new Date(payload.fetchedAt).toLocaleTimeString()}`;
        populateLocationFilter(jobEntries);
        refreshExpFilterBar();
        refreshTopTechnologies();
        updateProgress(payload.completed, payload.total, true, false);
        applyFilters();
        setLoading(false);
      }
      if (options.portalId) void loadPortals();
      resolvePromise({ ok: true, payload });
    });

    stream.addEventListener('fail', (event) => {
      const payload = JSON.parse(event.data);
      stream.close();
      if (activeStream === stream) activeStream = null;
      if (!options.appendMode) {
        setLoading(false);
        if (!currentCompany) resultsSection.hidden = true;
        setStatus(payload.error || 'Failed to scrape job board.', 'error');
      }
      resolvePromise({ ok: false, error: payload.error });
    });

    stream.onerror = () => {
      if (activeStream !== stream) {
        resolvePromise({ ok: false });
        return;
      }
      stream.close();
      activeStream = null;
      if (!options.appendMode) {
        setLoading(false);
        if (!currentCompany) {
          resultsSection.hidden = true;
          setStatus(
            'Connection error while extracting job requirements.',
            'error'
          );
        } else {
          refreshExpFilterBar();
          refreshTopTechnologies();
          const doneCount = jobEntries.filter(
            (e) => e.status !== 'pending'
          ).length;
          updateProgress(doneCount, streamTotalToCheck, false, true);
        }
      }
      resolvePromise({ ok: false });
    };
  });
}

function runSearch(queryText, overrides = null, portal = null) {
  manualViewActive = true;
  lastSearchRequest = { type: 'single', queryText, overrides, portal };
  stopActiveStream();
  resetResultsState();

  const fresh = liveFreshCheckbox.checked || Boolean(portal);
  activeRunHasExpPreFilter = preExp !== 'all';
  streamTotalToCheck = 0;
  streamTotalBoard = 0;
  streamMatchedCount = 0;

  setLoading(true);
  setStatus(
    `${fresh ? 'Live fetching' : 'Fetching'} ${portal ? portal.name : queryText} [${preRegion === 'india' ? 'India only' : 'All regions'}, ${preExp === 'all' ? 'All exp' : preExp + ' yrs'}]...`,
    'loading'
  );

  void streamSingleTarget(queryText, overrides, {
    appendMode: false,
    fresh,
    portalId: portal?.id || '',
    portalName: portal?.name || '',
    scraper: overrides?.scraper || '',
    slug: overrides?.slug || '',
  });
}

async function runFetchAllSavedPortals() {
  if (!savedPortals.length) return;
  manualViewActive = false;
  lastSearchRequest = { type: 'allPortals' };
  try {
    setStatus(
      'Running live auto-watch check across saved career portals...',
      'loading'
    );
    await fetch('/api/watch/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
  } catch {
    setStatus('Failed to trigger background portal check.', 'error');
  }
}

function renderPortalsViews() {
  const count = savedPortals.length;
  portalsCountBadge.textContent = String(count);
  updateKpiStrip();

  // Retrieve tab strip
  retrievePortalsEmpty.hidden = count > 0;
  retrievePortalsGrid.hidden = count === 0;
  fetchAllPortalsBtn.hidden = count === 0;
  portalsTabFetchAllBtn.hidden = count < 2;
  retrievePortalsGrid.replaceChildren();

  for (const portal of savedPortals) {
    const mini = document.createElement('div');
    const isFiltered = !manualViewActive && selectedPortalFilter === portal.id;
    mini.className = isFiltered
      ? 'portal-mini-card is-filtered'
      : 'portal-mini-card';
    mini.setAttribute('role', 'button');
    mini.tabIndex = 0;
    mini.title = 'Click to filter feed to this portal';

    const togglePortalFilter = () => {
      if (manualViewActive) {
        manualViewActive = false;
        selectedPortalFilter = portal.id;
        if (watchState) hydrateFromWatchState(watchState);
      } else {
        selectedPortalFilter =
          selectedPortalFilter === portal.id ? '' : portal.id;
        renderPortalsViews();
        refreshExpFilterBar();
        applyFilters();
      }
    };

    mini.addEventListener('click', (event) => {
      if (event.target.closest('button')) return;
      togglePortalFilter();
    });
    mini.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        if (event.target !== mini) return;
        event.preventDefault();
        togglePortalFilter();
      }
    });

    const info = document.createElement('div');
    info.className = 'portal-mini-info';
    const title = document.createElement('div');
    title.className = 'portal-mini-title';
    title.textContent = portal.name;
    const meta = document.createElement('div');
    meta.className = 'portal-mini-meta';
    meta.textContent = portal.scraper
      ? `${portal.scraper.replace(/Scraper$/, '')} · ${portal.lastCount != null ? `${portal.lastCount} last matched` : 'Ready'}`
      : portal.url;
    info.append(title, meta);

    const actionsWrap = document.createElement('div');
    actionsWrap.className = 'portal-mini-actions';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-accent-soft btn-xs';
    btn.textContent = 'Sync';
    btn.addEventListener('click', () => {
      companyInput.value = portal.url;
      const overrides =
        portal.scraper && portal.slug
          ? { scraper: portal.scraper, slug: portal.slug }
          : null;
      runSearch(portal.url, overrides, portal);
    });

    actionsWrap.append(btn);
    mini.append(info, actionsWrap);
    retrievePortalsGrid.append(mini);
  }

  // Career Portals tab management list
  portalsManageEmpty.hidden = count > 0;
  portalsManageList.replaceChildren();

  for (const portal of savedPortals) {
    const card = document.createElement('article');
    card.className = 'portal-manage-card';

    const info = document.createElement('div');
    info.className = 'portal-manage-info';

    const titleRow = document.createElement('div');
    titleRow.className = 'portal-manage-title';
    const h3 = document.createElement('h3');
    h3.textContent = portal.name;
    titleRow.append(h3);

    if (portal.scraper) {
      const tag = document.createElement('span');
      tag.className = 'tag tag-accent';
      tag.textContent = portal.scraper;
      titleRow.append(tag);
    }
    if (portal.slug) {
      const slugTag = document.createElement('span');
      slugTag.className = 'tag tag-mono';
      slugTag.textContent = portal.slug;
      titleRow.append(slugTag);
    }

    const urlDiv = document.createElement('div');
    urlDiv.className = 'portal-manage-url';
    urlDiv.textContent = portal.url;

    const statsDiv = document.createElement('div');
    statsDiv.className = 'portal-manage-stats';
    statsDiv.textContent = `Last retrieved: ${formatTimestamp(portal.lastFetchedAt)}${
      portal.lastCount != null ? ` (${portal.lastCount} matched)` : ''
    }`;

    info.append(titleRow, urlDiv, statsDiv);

    const actions = document.createElement('div');
    actions.className = 'portal-manage-actions';

    const fetchBtn = document.createElement('button');
    fetchBtn.type = 'button';
    fetchBtn.className = 'btn btn-accent-soft';
    fetchBtn.textContent = 'Retrieve Live';
    fetchBtn.addEventListener('click', () => {
      switchTab('retrieve');
      companyInput.value = portal.url;
      const overrides =
        portal.scraper && portal.slug
          ? { scraper: portal.scraper, slug: portal.slug }
          : null;
      runSearch(portal.url, overrides, portal);
    });

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'btn btn-danger-soft';
    delBtn.textContent = 'Remove';
    delBtn.addEventListener('click', async () => {
      try {
        const res = await fetch(
          `/api/portals?id=${encodeURIComponent(portal.id)}`,
          { method: 'DELETE' }
        );
        if (res.ok) {
          await loadPortals();
        }
      } catch {
        setStatus('Failed to remove portal.', 'error');
      }
    });

    actions.append(fetchBtn, delBtn);
    card.append(info, actions);
    portalsManageList.append(card);
  }
}

async function loadPortals() {
  try {
    const response = await fetch('/api/portals');
    if (!response.ok) return;
    const data = await response.json();
    savedPortals = data.portals || [];
    if (data.storagePath && portalsStoragePath) {
      portalsStoragePath.textContent = data.storagePath;
    }
    renderPortalsViews();
  } catch {
    // Ignore non-fatal load error
  }
}

function csvCell(value) {
  const str = String(value ?? '');
  return `"${str.replace(/"/g, '""')}"`;
}

tabRetrieveBtn.addEventListener('click', () => switchTab('retrieve'));
tabPortalsBtn.addEventListener('click', () => switchTab('portals'));
gotoPortalsBtn.addEventListener('click', () => {
  switchTab('portals');
  portalUrlInput.focus();
});

fetchAllPortalsBtn.addEventListener('click', () => {
  void runFetchAllSavedPortals();
});

portalsTabFetchAllBtn.addEventListener('click', () => {
  switchTab('retrieve');
  void runFetchAllSavedPortals();
});

portalAddForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const singleUrl = portalUrlInput.value.trim();
  const singleName = portalNameInput.value.trim();
  const scraper = portalScraperSelect.value.trim();
  const slug = portalSlugInput.value.trim();
  const bulkLines = portalBulkInput.value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (!singleUrl && !(scraper && slug) && bulkLines.length === 0) {
    setStatus(
      'Enter a career portal URL, paste multiple lines, or specify scraper + slug.',
      'error'
    );
    portalUrlInput.focus();
    return;
  }

  savePortalBtn.disabled = true;
  setStatus('Validating & saving career portal(s) persistently...', 'loading');

  try {
    let payloadBody;
    if (bulkLines.length > 0 && !singleUrl) {
      payloadBody = {
        entries: bulkLines.map((line) => ({ url: line })),
      };
    } else if (bulkLines.length > 0 && singleUrl) {
      payloadBody = {
        entries: [
          { name: singleName, url: singleUrl },
          ...bulkLines.map((line) => ({ url: line })),
        ],
      };
    } else {
      payloadBody = {
        name: singleName,
        url: singleUrl,
        ...(scraper ? { scraper } : {}),
        ...(slug ? { slug } : {}),
      };
    }

    const res = await fetch('/api/portals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payloadBody),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Could not save career portal.');
    }

    portalUrlInput.value = '';
    portalNameInput.value = '';
    portalScraperSelect.value = '';
    portalSlugInput.value = '';
    portalBulkInput.value = '';

    await loadPortals();

    if (Array.isArray(data.errors) && data.errors.length > 0) {
      const savedCount = data.saved?.length ?? 0;
      setStatus(
        `Saved ${savedCount} portal(s). Failed (${data.errors.length}): ${data.errors.map((e) => `${e.entry}: ${e.error}`).join('; ')}`,
        savedCount > 0 ? 'info' : 'error'
      );
    } else {
      setStatus(
        Array.isArray(data.saved)
          ? `Saved ${data.saved.length} career portal(s). Auto-watch is syncing their live openings now...`
          : `Saved "${data.portal.name}". Auto-watch is syncing its live openings automatically.`,
        'info'
      );
    }
  } catch (error) {
    setStatus(error instanceof Error ? error.message : String(error), 'error');
  } finally {
    savePortalBtn.disabled = false;
  }
});

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = companyInput.value.trim();
  if (!query && !(scraperSelect.value && slugInput.value.trim())) {
    setStatus('Please enter a company job board URL or company name.', 'error');
    companyInput.focus();
    return;
  }
  runSearch(query);
});

for (const chip of document.querySelectorAll('.chip[data-query]')) {
  chip.addEventListener('click', () => {
    const query = chip.getAttribute('data-query') || '';
    companyInput.value = query;
    scraperSelect.value = '';
    slugInput.value = '';
    runSearch(query);
  });
}

stopStreamBtn.addEventListener('click', () => {
  const doneCount = jobEntries.filter((e) => e.status !== 'pending').length;
  stopActiveStream();
  refreshExpFilterBar();
  refreshTopTechnologies();
  updateProgress(doneCount, streamTotalToCheck, false, true);
});

function triggerActiveRefresh() {
  if (!manualViewActive) {
    void updateWatchConfig({
      region: preRegion,
      role: preRole,
      exp: preExp,
      syncNow: true,
    });
    return;
  }
  if (!lastSearchRequest || resultsSection.hidden) return;
  if (lastSearchRequest.type === 'allPortals') {
    void runFetchAllSavedPortals();
  } else {
    runSearch(
      lastSearchRequest.queryText,
      lastSearchRequest.overrides,
      lastSearchRequest.portal
    );
  }
}

function setPreRegion(region) {
  const changed = preRegion !== region;
  preRegion = region;
  preRegionIndiaBtn.classList.toggle('is-active', region === 'india');
  preRegionIndiaBtn.setAttribute('aria-pressed', String(region === 'india'));
  preRegionAllBtn.classList.toggle('is-active', region === 'all');
  preRegionAllBtn.setAttribute('aria-pressed', String(region === 'all'));
  refreshAllSlidingPills();
  if (changed) triggerActiveRefresh();
}

function setPreExp(exp) {
  const changed = preExp !== exp;
  preExp = exp;
  const map = [
    [preExp05Btn, '0-5'],
    [preExp02Btn, '0-2'],
    [preExpAllBtn, 'all'],
  ];
  for (const [btn, value] of map) {
    const active = value === exp;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  }
  refreshAllSlidingPills();
  if (changed) triggerActiveRefresh();
}

function setPreRole(role) {
  const changed = preRole !== role;
  preRole = role;
  preRoleTechBtn.classList.toggle('is-active', role === 'tech');
  preRoleTechBtn.setAttribute('aria-pressed', String(role === 'tech'));
  preRoleAllBtn.classList.toggle('is-active', role === 'all');
  preRoleAllBtn.setAttribute('aria-pressed', String(role === 'all'));
  refreshAllSlidingPills();
  if (changed) triggerActiveRefresh();
}

preRegionIndiaBtn.addEventListener('click', () => setPreRegion('india'));
preRegionAllBtn.addEventListener('click', () => setPreRegion('all'));
preExp05Btn.addEventListener('click', () => setPreExp('0-5'));
preExp02Btn.addEventListener('click', () => setPreExp('0-2'));
preExpAllBtn.addEventListener('click', () => setPreExp('all'));
preRoleTechBtn.addEventListener('click', () => setPreRole('tech'));
preRoleAllBtn.addEventListener('click', () => setPreRole('all'));

sortSelect.addEventListener('change', () => {
  sortMode = sortSelect.value;
  applyFilters();
});

modeExpandedBtn.addEventListener('click', () => setViewMode('expanded'));
modeSplitBtn.addEventListener('click', () => setViewMode('split'));
modeCompactBtn.addEventListener('click', () => setViewMode('compact'));

clearFiltersBtn.addEventListener('click', () => {
  filterInput.value = '';
  locationSelect.value = '';
  selectedTechFilter = '';
  selectedExpFilter = '';
  selectedPortalFilter = '';
  selectedBookmarkFilter = '';
  selectedChangesOnly = false;
  indiaOnly = false;
  renderPortalsViews();
  refreshExpFilterBar();
  refreshTopTechnologies();
  applyFilters();
  filterInput.focus();
});

toggleAdvancedBtn.addEventListener('click', () => {
  const expanded = toggleAdvancedBtn.getAttribute('aria-expanded') === 'true';
  toggleAdvancedBtn.setAttribute('aria-expanded', String(!expanded));
  advancedPanel.hidden = expanded;
});

filterInput.addEventListener('input', applyFilters);
locationSelect.addEventListener('change', applyFilters);

copyJsonBtn.addEventListener('click', async () => {
  if (!currentCompany) return;
  const exportPayload = filteredEntries.map((entry) => {
    const bm = getEntryBookmark(entry);
    return {
      company: entry.companyName || currentCompany.name,
      id: entry.id,
      title: entry.title,
      location: entry.location,
      url: entry.url,
      experienceSummary: entry.experienceSummary,
      technologies: entry.technologies,
      experience: entry.experience,
      saved: bm.saved,
      applied: bm.applied,
    };
  });
  await navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2));
  const label = copyJsonBtn.querySelector('span');
  const original = label.textContent;
  label.textContent = 'Copied!';
  setTimeout(() => {
    label.textContent = original;
  }, 1500);
});

downloadMdBtn.addEventListener('click', () => {
  if (!currentCompany) return;
  const sections = filteredEntries.map((entry) => {
    const techLine = entry.technologies.length
      ? entry.technologies.join(', ')
      : 'None listed';
    const expLines = entry.experience.length
      ? entry.experience.map((e) => `  - ${e}`).join('\n')
      : '  - None listed';
    return [
      `## ${entry.title}`,
      `- **Company:** ${entry.companyName || currentCompany.name}`,
      `- **Location:** ${entry.location || 'Unspecified'}`,
      `- **ID:** ${entry.id}`,
      `- **URL:** ${entry.url}`,
      `- **Experience Summary:** ${entry.experienceSummary || 'Not specified'}`,
      `- **Technologies:** ${techLine}`,
      `- **Experience Wanted:**\n${expLines}`,
    ].join('\n');
  });
  const blob = new Blob([sections.join('\n\n---\n\n')], {
    type: 'text/markdown;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${currentCompany.slug || 'jobs'}-tech-experience.md`;
  link.click();
  URL.revokeObjectURL(url);
});

downloadCsvBtn.addEventListener('click', () => {
  if (!currentCompany) return;
  const header = [
    'company',
    'title',
    'location',
    'id',
    'url',
    'experience_summary',
    'technologies',
    'experience',
  ].join(',');
  const rows = filteredEntries.map((entry) =>
    [
      csvCell(entry.companyName || currentCompany.name),
      csvCell(entry.title),
      csvCell(entry.location),
      csvCell(entry.id),
      csvCell(entry.url),
      csvCell(entry.experienceSummary || ''),
      csvCell(entry.technologies.join('; ')),
      csvCell(entry.experience.join(' | ')),
    ].join(',')
  );
  const blob = new Blob([[header, ...rows].join('\n')], {
    type: 'text/csv;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${currentCompany.slug || 'jobs'}-tech-experience.csv`;
  link.click();
  URL.revokeObjectURL(url);
});

drawerBackdrop.addEventListener('click', closeDrawer);
drawerCloseBtn.addEventListener('click', closeDrawer);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !jobDrawer.hidden) {
    closeDrawer();
    return;
  }
  if (
    event.key === '/' &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey &&
    !['INPUT', 'TEXTAREA', 'SELECT'].includes(
      document.activeElement?.tagName || ''
    ) &&
    !panelRetrieve.hidden &&
    !resultsSection.hidden
  ) {
    event.preventDefault();
    filterInput.focus();
  }
});

async function loadScrapers() {
  if (scraperSelect.options.length > 1) return;
  try {
    const response = await fetch('/api/health');
    if (!response.ok) return;
    const data = await response.json();
    const names = data.scrapers || [];
    scraperCountPill.textContent = `${names.length} boards`;
    for (const name of names) {
      for (const selectEl of [scraperSelect, portalScraperSelect]) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        selectEl.append(option);
      }
    }
  } catch {
    // Ignore if initial health probe fails
  }
}

function formatCountdown(nextSyncAt) {
  if (!nextSyncAt) return '';
  const diffSec = Math.max(
    0,
    Math.round((Date.parse(nextSyncAt) - Date.now()) / 1000)
  );
  const mins = Math.floor(diffSec / 60);
  const secs = diffSec % 60;
  return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function updateWatchBanner() {
  if (!watchState) return;
  const { config, isSyncing, lastSyncAt, nextSyncAt } = watchState;
  const portalsCard = document.querySelector('#saved-portals-retrieve');
  if (portalsCard) {
    portalsCard.classList.toggle('is-syncing', Boolean(isSyncing));
  }

  watchIntervalSelect.value = String(config.intervalMinutes || 15);
  watchToggleBtn.textContent = config.enabled ? 'Pause Watch' : 'Resume Watch';

  if (isSyncing) {
    watchLiveDot.className = 'live-dot is-syncing';
    watchStatusPill.textContent = 'Syncing live...';
    watchStatusPill.className = 'tag';
    watchTimingText.textContent =
      'Checking saved career portals for new or updated positions...';
    return;
  }

  if (!config.enabled) {
    watchLiveDot.className = 'live-dot is-paused';
    watchStatusPill.textContent = 'Auto-Watch: Paused';
    watchStatusPill.className = 'tag';
    watchTimingText.textContent = lastSyncAt
      ? `Paused · Last checked: ${formatTimestamp(lastSyncAt)}`
      : 'Auto-watch is paused. Click Resume Watch to monitor portals automatically.';
    return;
  }

  watchLiveDot.className = 'live-dot';
  watchStatusPill.textContent = 'Auto-Watch: ON';
  watchStatusPill.className = 'tag tag-accent';
  const lastLabel = lastSyncAt
    ? `Last checked: ${formatTimestamp(lastSyncAt)}`
    : 'Waiting for first check';
  const nextLabel = nextSyncAt
    ? ` · Next check in ${formatCountdown(nextSyncAt)}`
    : '';
  watchTimingText.textContent = `${lastLabel}${nextLabel}`;
}

function renderChangesFeed(changes) {
  const list = Array.isArray(changes) ? changes : [];
  changesPanel.hidden = list.length === 0;
  changesList.replaceChildren();
  updateKpiStrip();
  if (list.length === 0) return;

  const added = list.filter((c) => c.type === 'added').length;
  const updated = list.filter((c) => c.type === 'updated').length;
  const removed = list.filter((c) => c.type === 'removed').length;
  const parts = [];
  if (added) parts.push(`+${added} new`);
  if (updated) parts.push(`~${updated} updated`);
  if (removed) parts.push(`-${removed} closed`);
  changesSummaryBadge.textContent =
    parts.join(' · ') || `${list.length} events`;

  list.slice(0, 20).forEach((ch, idx) => {
    const row = document.createElement('div');
    row.className = 'change-row';
    row.style.setProperty('--row-i', String(idx));

    const badge = document.createElement('span');
    badge.className = `change-badge is-${ch.type}`;
    badge.textContent = ch.type === 'removed' ? 'Closed' : ch.type;

    const link = document.createElement('a');
    link.className = 'change-link';
    link.href = ch.url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = ch.jobTitle;

    const portalSpan = document.createElement('span');
    portalSpan.className = 'job-id';
    portalSpan.textContent = ch.portalName;

    const meta = document.createElement('span');
    meta.className = 'change-meta';
    meta.textContent = `${ch.detail} · ${new Date(ch.timestamp).toLocaleTimeString()}`;

    row.append(badge, portalSpan, link, meta);
    changesList.append(row);
  });
}

function syncFirstLevelButtonsFromConfig(config) {
  if (!config) return;
  preRegion = config.region || 'india';
  preRegionIndiaBtn.classList.toggle('is-active', preRegion === 'india');
  preRegionIndiaBtn.setAttribute('aria-pressed', String(preRegion === 'india'));
  preRegionAllBtn.classList.toggle('is-active', preRegion === 'all');
  preRegionAllBtn.setAttribute('aria-pressed', String(preRegion === 'all'));

  preRole = config.role || 'tech';
  preRoleTechBtn.classList.toggle('is-active', preRole === 'tech');
  preRoleTechBtn.setAttribute('aria-pressed', String(preRole === 'tech'));
  preRoleAllBtn.classList.toggle('is-active', preRole === 'all');
  preRoleAllBtn.setAttribute('aria-pressed', String(preRole === 'all'));

  preExp = config.exp || '0-5';
  const expMap = [
    [preExp05Btn, '0-5'],
    [preExp02Btn, '0-2'],
    [preExpAllBtn, 'all'],
  ];
  for (const [btn, val] of expMap) {
    const active = val === preExp;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  }
  refreshAllSlidingPills();
}

function hydrateFromWatchState(state) {
  watchState = state;
  syncFirstLevelButtonsFromConfig(state.config);
  updateWatchBanner();
  renderChangesFeed(state.changes);

  if (manualViewActive) return;

  const snapshots = Object.values(state.snapshots || {});
  if (snapshots.length === 0) {
    if (!state.isSyncing) {
      resultsSection.hidden = true;
    }
    return;
  }

  let totalBoard = 0;
  let totalChecked = 0;
  const nextEntries = [];
  const nextMap = new Map();

  for (const snap of snapshots) {
    totalBoard += snap.totalBoardCount || 0;
    totalChecked += snap.checkedCount || 0;
    for (const job of snap.jobs || []) {
      const uid = `${job.portalId}:${job.id}`;
      const entry = {
        ...job,
        uid,
        status: 'loaded',
        expanded: viewMode === 'expanded',
        error: '',
        dom: null,
      };
      nextEntries.push(entry);
      nextMap.set(uid, entry);
    }
  }

  jobEntries = nextEntries;
  entryById = nextMap;
  currentCompany = {
    name: `Auto-Watched Portals (${snapshots.length})`,
    scraper: 'Auto-Watch',
    slug: 'watched-portals',
  };

  setStatus('');
  resultsSection.hidden = false;
  progressPanel.hidden = true;
  companyNameEl.textContent = currentCompany.name;
  scraperBadge.textContent = `${snapshots.length} synced`;
  slugBadge.textContent = `${state.config.region === 'india' ? 'India' : 'All'} · ${state.config.role === 'tech' ? 'Tech/IT' : 'All'} · ${state.config.exp === 'all' ? 'All exp' : state.config.exp + ' yrs'}`;
  countBadge.textContent = `${jobEntries.length} matched (${totalChecked} checked / ${totalBoard} total)`;
  fetchedAtStat.textContent = state.lastSyncAt
    ? `synced @ ${new Date(state.lastSyncAt).toLocaleTimeString()}`
    : '';
  timingBadge.textContent = state.isSyncing ? 'syncing...' : 'live';

  populateLocationFilter(jobEntries);
  refreshExpFilterBar();
  refreshTopTechnologies();
  applyFilters();
  setViewMode(viewMode);
}

async function updateWatchConfig(patch) {
  try {
    const res = await fetch('/api/watch/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    if (!res.ok) return;
    const data = await res.json();
    if (data.state) {
      hydrateFromWatchState(data.state);
    }
  } catch {
    setStatus('Failed to update auto-watch settings.', 'error');
  }
}

function connectWatchEvents() {
  if (watchEventSource) {
    watchEventSource.close();
  }
  const es = new EventSource('/api/watch/events');
  watchEventSource = es;

  es.addEventListener('state', (event) => {
    const state = JSON.parse(event.data);
    hydrateFromWatchState(state);
  });

  es.addEventListener('sync_start', () => {
    if (watchState) {
      watchState.isSyncing = true;
      updateWatchBanner();
    }
  });

  es.addEventListener('sync_portal', (event) => {
    const payload = JSON.parse(event.data);
    if (watchState) {
      watchState.snapshots = watchState.snapshots || {};
      watchState.snapshots[payload.portalId] = payload.snapshot;
      hydrateFromWatchState(watchState);
    }
    void loadPortals();
  });

  es.addEventListener('sync_done', (event) => {
    const payload = JSON.parse(event.data);
    if (payload.state) {
      hydrateFromWatchState(payload.state);
    }
    if (
      desktopAlertsEnabled &&
      payload.addedCount > 0 &&
      typeof Notification !== 'undefined' &&
      Notification.permission === 'granted'
    ) {
      new Notification('Career Radar — New Openings Detected', {
        body: `${payload.addedCount} new opening${payload.addedCount === 1 ? '' : 's'} spotted across watched career portals.`,
      });
    }
    setStatus('');
    void loadPortals();
  });

  es.addEventListener('sync_error', (event) => {
    const payload = JSON.parse(event.data);
    setStatus(
      `Auto-watch check failed for ${payload.portalName}: ${payload.error}`,
      'error'
    );
  });
}

watchIntervalSelect.addEventListener('change', () => {
  void updateWatchConfig({
    intervalMinutes: Number(watchIntervalSelect.value),
  });
});

watchToggleBtn.addEventListener('click', () => {
  const currentlyEnabled = watchState?.config?.enabled ?? true;
  void updateWatchConfig({ enabled: !currentlyEnabled });
});

clearChangesBtn.addEventListener('click', async () => {
  try {
    const res = await fetch('/api/watch/changes', { method: 'DELETE' });
    if (res.ok) {
      const data = await res.json();
      if (data.state) hydrateFromWatchState(data.state);
    }
  } catch {
    // Ignore non-fatal clear error
  }
});

const prefersReducedMotion = () =>
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const counterAnimations = new WeakMap();

function animateCounter(el, targetValue) {
  if (!el) return;
  const nextVal = Math.max(0, Number(targetValue) || 0);
  const currentVal =
    Number.parseInt(el.dataset.targetValue ?? el.textContent ?? '0', 10) || 0;
  el.dataset.targetValue = String(nextVal);
  if (prefersReducedMotion() || currentVal === nextVal) {
    el.textContent = String(nextVal);
    return;
  }
  const prevRaf = counterAnimations.get(el);
  if (prevRaf) cancelAnimationFrame(prevRaf);

  const start = performance.now();
  const duration = 380;
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = String(
      Math.round(currentVal + (nextVal - currentVal) * eased)
    );
    if (t < 1) {
      counterAnimations.set(el, requestAnimationFrame(step));
    } else {
      counterAnimations.delete(el);
      el.textContent = String(nextVal);
    }
  };
  counterAnimations.set(el, requestAnimationFrame(step));
}

function updateKpiStrip() {
  if (!kpiMatchedEl) return;
  animateCounter(kpiMatchedEl, filteredEntries.length);

  const uniqueTech = new Set();
  for (const entry of filteredEntries) {
    for (const tech of entry.technologies || []) {
      uniqueTech.add(tech);
    }
  }
  if (kpiTechsEl) animateCounter(kpiTechsEl, uniqueTech.size);

  const recentChangesCount = watchState?.changes?.length ?? 0;
  if (kpiChangesEl) animateCounter(kpiChangesEl, recentChangesCount);
  if (kpiPortalsEl) animateCounter(kpiPortalsEl, savedPortals.length);
}

const slidingPillContainers = [];

function positionSlidingPill(container, pill, animate = true) {
  const active = container.querySelector('.is-active');
  if (!active || active.offsetWidth === 0) {
    pill.style.opacity = '0';
    return;
  }
  if (!animate) {
    pill.style.transition = 'none';
  }
  pill.style.opacity = '1';
  pill.style.width = `${active.offsetWidth}px`;
  pill.style.transform = `translateX(${active.offsetLeft}px)`;
  if (!animate) {
    void pill.offsetWidth;
    pill.style.transition = '';
  }
}

function refreshAllSlidingPills(animate = true) {
  requestAnimationFrame(() => {
    for (const { container, pill } of slidingPillContainers) {
      positionSlidingPill(container, pill, animate);
    }
  });
}

function initSlidingPills() {
  const groups = document.querySelectorAll('.nav-tabs, .segmented');
  for (const container of groups) {
    const pill = document.createElement('span');
    pill.className = 'sliding-pill';
    pill.setAttribute('aria-hidden', 'true');
    container.classList.add('has-sliding-pill');
    container.prepend(pill);
    slidingPillContainers.push({ container, pill });
    positionSlidingPill(container, pill, false);
  }
  window.addEventListener('resize', () => refreshAllSlidingPills(false), {
    passive: true,
  });
  if (document.fonts?.ready) {
    void document.fonts.ready.then(() => refreshAllSlidingPills(false));
  }
}

function initMagneticButtons() {
  if (prefersReducedMotion()) return;
  const targets = document.querySelectorAll('.btn-accent, .brand-mark');
  for (const el of targets) {
    el.addEventListener('pointermove', (event) => {
      const rect = el.getBoundingClientRect();
      const dx = (event.clientX - (rect.left + rect.width / 2)) * 0.16;
      const dy = (event.clientY - (rect.top + rect.height / 2)) * 0.2;
      const cx = Math.max(-5, Math.min(5, dx));
      const cy = Math.max(-4, Math.min(4, dy));
      el.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0)`;
    });
    el.addEventListener('pointerleave', () => {
      el.style.transform = '';
    });
  }
}

function initButtonRipples() {
  if (prefersReducedMotion()) return;
  document.addEventListener('click', (event) => {
    const btn = event.target?.closest?.('.btn');
    if (!btn || btn.disabled) return;
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const ripple = document.createElement('span');
    ripple.className = 'btn-ripple';
    ripple.style.width = `${size}px`;
    ripple.style.height = `${size}px`;
    ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
    btn.style.overflow = 'hidden';
    btn.append(ripple);
    ripple.addEventListener('animationend', () => ripple.remove(), {
      once: true,
    });
  });
}

function applyThemePreference(themeName) {
  let next = themeName;
  if (next === 'aurora' || next === 'velvet' || next === 'emerald') {
    next = 'dark';
  }
  if (next !== 'paper' && next !== 'dark') {
    next = 'paper';
  }
  document.documentElement.setAttribute('data-theme', next);
  document.documentElement.setAttribute('data-font-style', 'signature');
  try {
    localStorage.setItem('careerRadar.theme', next);
  } catch {
    // Ignore storage errors
  }
  for (const btn of themeChoiceBtns) {
    const active = btn.getAttribute('data-theme-choice') === next;
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  }
}

function initStyleStudio() {
  let savedTheme = 'paper';
  try {
    savedTheme = localStorage.getItem('careerRadar.theme') || 'paper';
  } catch {
    // Ignore storage errors
  }
  applyThemePreference(savedTheme);

  if (styleStudioBtn && styleStudioPopover) {
    styleStudioBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      const willOpen = styleStudioPopover.hidden;
      styleStudioPopover.hidden = !willOpen;
      styleStudioBtn.setAttribute('aria-expanded', String(willOpen));
    });

    document.addEventListener('click', (event) => {
      if (
        !styleStudioPopover.hidden &&
        !styleStudioPopover.contains(event.target) &&
        !styleStudioBtn.contains(event.target)
      ) {
        styleStudioPopover.hidden = true;
        styleStudioBtn.setAttribute('aria-expanded', 'false');
      }
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && !styleStudioPopover.hidden) {
        styleStudioPopover.hidden = true;
        styleStudioBtn.setAttribute('aria-expanded', 'false');
        styleStudioBtn.focus();
      }
    });
  }

  for (const btn of themeChoiceBtns) {
    btn.addEventListener('click', () => {
      applyThemePreference(btn.getAttribute('data-theme-choice'));
    });
  }
}

function initSpotlightEffect() {
  let rafId = null;
  let lastEvent = null;

  document.addEventListener(
    'pointermove',
    (event) => {
      const target = event.target?.closest?.('.spotlight-card, .job-card');
      if (!target) return;
      lastEvent = { target, x: event.clientX, y: event.clientY };
      if (rafId != null) return;
      rafId = requestAnimationFrame(() => {
        rafId = null;
        if (!lastEvent) return;
        const rect = lastEvent.target.getBoundingClientRect();
        lastEvent.target.style.setProperty(
          '--mouse-x',
          `${lastEvent.x - rect.left}px`
        );
        lastEvent.target.style.setProperty(
          '--mouse-y',
          `${lastEvent.y - rect.top}px`
        );
      });
    },
    { passive: true }
  );
}

function parseSkillsList(raw) {
  return raw
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function applySkillsInputValue(raw, persist = true) {
  userSkills = parseSkillsList(raw);
  if (clearSkillsBtn) {
    clearSkillsBtn.hidden = userSkills.length === 0;
  }
  if (persist) {
    try {
      localStorage.setItem('careerRadar.skills', raw);
    } catch {
      // Ignore storage errors
    }
  }
  for (const entry of jobEntries) {
    if (entry.dom) {
      entry.dom.rendered = false;
      syncCardDetails(entry);
    }
  }
  applyFilters();
}

function initMySkills() {
  if (!mySkillsInput) return;
  let saved = '';
  try {
    saved = localStorage.getItem('careerRadar.skills') || '';
  } catch {
    // Ignore storage errors
  }
  mySkillsInput.value = saved;
  applySkillsInputValue(saved, false);

  mySkillsInput.addEventListener('input', () => {
    applySkillsInputValue(mySkillsInput.value, true);
  });

  if (clearSkillsBtn) {
    clearSkillsBtn.addEventListener('click', () => {
      mySkillsInput.value = '';
      applySkillsInputValue('', true);
      mySkillsInput.focus();
    });
  }
}

function syncAlertsButton() {
  if (!watchNotifyBtn) return;
  const active =
    desktopAlertsEnabled &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted';
  watchNotifyBtn.classList.toggle('is-active', active);
  watchNotifyBtn.setAttribute('aria-pressed', String(active));
  watchNotifyBtn.textContent = active ? 'Alerts: ON' : 'Alerts: Off';
}

function initDesktopAlerts() {
  if (!watchNotifyBtn) return;
  try {
    desktopAlertsEnabled = localStorage.getItem('careerRadar.alerts') === '1';
  } catch {
    desktopAlertsEnabled = false;
  }
  syncAlertsButton();

  watchNotifyBtn.addEventListener('click', async () => {
    if (typeof Notification === 'undefined') {
      setStatus(
        'Browser desktop notifications are not supported in this browser.',
        'error'
      );
      return;
    }
    if (!desktopAlertsEnabled) {
      const perm =
        Notification.permission === 'granted'
          ? 'granted'
          : await Notification.requestPermission();
      if (perm !== 'granted') {
        setStatus(
          'Notification permission was not granted by the browser.',
          'error'
        );
        return;
      }
      desktopAlertsEnabled = true;
    } else {
      desktopAlertsEnabled = false;
    }
    try {
      localStorage.setItem(
        'careerRadar.alerts',
        desktopAlertsEnabled ? '1' : '0'
      );
    } catch {
      // Ignore storage errors
    }
    syncAlertsButton();
  });
}

function setAuthMode(mode) {
  authMode = mode === 'signup' ? 'signup' : 'login';
  const isSignup = authMode === 'signup';
  if (authTabLogin) {
    authTabLogin.classList.toggle('is-active', !isSignup);
    authTabLogin.setAttribute('aria-selected', String(!isSignup));
  }
  if (authTabSignup) {
    authTabSignup.classList.toggle('is-active', isSignup);
    authTabSignup.setAttribute('aria-selected', String(isSignup));
  }
  if (authNameField) authNameField.hidden = !isSignup;
  if (authPasswordInput) {
    authPasswordInput.setAttribute(
      'autocomplete',
      isSignup ? 'new-password' : 'current-password'
    );
  }
  if (authSubmitBtn) {
    authSubmitBtn.textContent = isSignup ? 'Create Account' : 'Sign In';
  }
  if (authErrorEl) {
    authErrorEl.hidden = true;
    authErrorEl.textContent = '';
  }
  refreshAllSlidingPills();
}

function enterSignedOutState() {
  currentUser = null;
  if (watchEventSource) {
    watchEventSource.close();
    watchEventSource = null;
  }
  stopActiveStream();
  manualViewActive = false;
  savedPortals = [];
  bookmarkMap = {};
  watchState = null;
  resetResultsState();

  if (mainWorkspace) mainWorkspace.hidden = true;
  if (mainNavTabs) mainNavTabs.hidden = true;
  if (toggleAdvancedBtn) toggleAdvancedBtn.hidden = true;
  if (accountPill) accountPill.hidden = true;
  if (logoutBtn) logoutBtn.hidden = true;
  if (authView) authView.hidden = false;
  refreshAllSlidingPills(false);
}

function enterSignedInWorkspace(user) {
  currentUser = user;
  if (authView) authView.hidden = true;
  if (mainWorkspace) mainWorkspace.hidden = false;
  if (mainNavTabs) mainNavTabs.hidden = false;
  if (toggleAdvancedBtn) toggleAdvancedBtn.hidden = false;
  if (accountPill) {
    accountPill.textContent = user.name || user.email;
    accountPill.hidden = false;
  }
  if (logoutBtn) logoutBtn.hidden = false;

  switchTab('retrieve');
  refreshAllSlidingPills(false);
  void loadBookmarks();
  void loadScrapers();
  void loadPortals();
  connectWatchEvents();
}

async function initAuthSession() {
  if (authTabLogin) {
    authTabLogin.addEventListener('click', () => setAuthMode('login'));
  }
  if (authTabSignup) {
    authTabSignup.addEventListener('click', () => setAuthMode('signup'));
  }
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } finally {
        enterSignedOutState();
      }
    });
  }
  if (authForm) {
    authForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (authErrorEl) {
        authErrorEl.hidden = true;
        authErrorEl.textContent = '';
      }
      const email = authEmailInput?.value.trim() || '';
      const password = authPasswordInput?.value || '';
      const name = authNameInput?.value.trim() || '';

      if (authSubmitBtn) authSubmitBtn.disabled = true;
      try {
        const endpoint =
          authMode === 'signup' ? '/api/auth/signup' : '/api/auth/login';
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            password,
            ...(authMode === 'signup' && name ? { name } : {}),
          }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Authentication failed.');
        }
        if (authPasswordInput) authPasswordInput.value = '';
        enterSignedInWorkspace(data.user);
      } catch (error) {
        if (authErrorEl) {
          authErrorEl.textContent =
            error instanceof Error ? error.message : String(error);
          authErrorEl.hidden = false;
        }
      } finally {
        if (authSubmitBtn) authSubmitBtn.disabled = false;
      }
    });
  }

  try {
    const res = await fetch('/api/auth/me');
    if (res.ok) {
      const data = await res.json();
      if (data.user) {
        enterSignedInWorkspace(data.user);
        return;
      }
    }
  } catch {
    // Fallback to login gate
  }
  enterSignedOutState();
}

setInterval(() => {
  if (watchState && !watchState.isSyncing && watchState.config?.enabled) {
    updateWatchBanner();
  }
}, 1000);

initStyleStudio();
initSlidingPills();
initSpotlightEffect();
initMagneticButtons();
initButtonRipples();
initMySkills();
initDesktopAlerts();
void initAuthSession();

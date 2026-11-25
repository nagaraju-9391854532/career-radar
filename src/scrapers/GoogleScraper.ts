import { cachedFetch } from '../cache.ts';
import { time } from '../utils.ts';
import { Scraper, type ListedJob, type ParsedUrl } from './Scraper.ts';

const BASE_URL =
  'https://www.google.com/about/careers/applications/jobs/results';
const PAGE_CONCURRENCY = 5;

type JobData = [
  id: string,
  title: string,
  applyUrl: string,
  responsibilities: [null, string],
  qualifications: [null, string],
  tenantPath: string,
  unknown: null,
  company: string,
  locale: string,
  locations: [string, string[], string, string | null, string, string][],
  description: [null, string],
  ...unknown: unknown[],
];

type ListPageData = [
  jobs: JobData[],
  null: null,
  total: number,
  pageSize: number,
];

function parseCallbackData(html: string, key: string): unknown {
  const callbackIdx = html.indexOf(`AF_initDataCallback({key: '${key}'`);
  if (callbackIdx === -1) throw new Error(`Missing ${key} callback in page`);
  const dataIdx = html.indexOf('data:', callbackIdx);
  if (dataIdx === -1) throw new Error(`Missing data field in ${key} callback`);
  const start = dataIdx + 'data:'.length;
  const end = html.indexOf(', sideChannel:', start);
  if (end === -1)
    throw new Error(`Missing sideChannel sentinel in ${key} callback`);
  return JSON.parse(html.slice(start, end));
}

function titleToSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default class GoogleScraper extends Scraper {
  static parseUrl(url: URL): ParsedUrl | null {
    if (url.hostname !== 'www.google.com') return null;
    const match = url.pathname.match(
      /^\/about\/careers\/applications\/jobs\/results\/?([^/]*)/
    );
    if (!match) return null;
    return { slug: 'google', jobId: match[1] || null };
  }

  private jobPostingsById = new Map<string, string>();

  override dispose(): void {
    this.jobPostingsById.clear();
  }

  jobUrl(id: string): string {
    return `${BASE_URL}/${id}`;
  }

  private async fetchListPage(
    page: number,
    testing: boolean
  ): Promise<ListPageData> {
    const url = page === 1 ? `${BASE_URL}/` : `${BASE_URL}/?page=${page}`;
    const html = await cachedFetch
      .call({ cache: !testing, cacheTTL: time.day }, url)
      .then((r) => r.text());

    return parseCallbackData(html, 'ds:1') as ListPageData;
  }

  private collectPageJobs(
    pageJobs: JobData[],
    jobs: ListedJob[],
    seenIds: Set<string>,
    cachePayloads: boolean
  ): void {
    for (const job of pageJobs) {
      const slug = `${job[0]}-${titleToSlug(job[1])}`;
      if (seenIds.has(slug)) continue;
      seenIds.add(slug);

      const locations = (job[9] ?? []).map((l) => l[0]);
      const location = locations.join(', ');
      const url = `${BASE_URL}/${slug}`;

      if (cachePayloads) {
        this.jobPostingsById.set(
          slug,
          JSON.stringify({
            data: job,
            title: job[1],
            location,
            url,
          })
        );
      }

      jobs.push({
        id: slug,
        title: job[1],
        location,
        url,
      });
    }
  }

  async getJobsList(testing = false): Promise<ListedJob[]> {
    const jobs: ListedJob[] = [];
    const seenIds = new Set<string>();

    const firstData = await this.fetchListPage(1, testing);
    const firstPageJobs = firstData[0] ?? [];
    const total = firstData[2] ?? firstPageJobs.length;
    const pageSize = firstData[3] || firstPageJobs.length || 20;

    if (testing) {
      this.collectPageJobs(firstPageJobs.slice(0, 1), jobs, seenIds, false);
      return jobs;
    }

    this.collectPageJobs(firstPageJobs, jobs, seenIds, true);

    const totalPages = Math.ceil(total / pageSize);
    for (let start = 2; start <= totalPages; start += PAGE_CONCURRENCY) {
      const batchPages: number[] = [];
      for (
        let p = start;
        p < start + PAGE_CONCURRENCY && p <= totalPages;
        p++
      ) {
        batchPages.push(p);
      }
      const pagesData = await Promise.all(
        batchPages.map((p) => this.fetchListPage(p, false))
      );
      for (const pageData of pagesData) {
        this.collectPageJobs(pageData[0] ?? [], jobs, seenIds, true);
      }
    }

    return jobs;
  }

  async getJobContent(id: string): Promise<string> {
    const cached = this.jobPostingsById.get(id);
    if (cached) return cached;

    const url = `${BASE_URL}/${id}`;
    const html = await cachedFetch
      .call({ cacheTTL: time.day }, url)
      .then((r) => r.text());

    const data = parseCallbackData(html, 'ds:0') as [JobData];
    const job = data[0];
    const locations = (job[9] ?? []).map((l) => l[0]);

    // the raw payload is a positional tuple, not an object with the keys
    // `readListingFields` looks for
    return JSON.stringify({
      data: job,
      title: job[1],
      location: locations.join(', '),
      url,
    });
  }
}

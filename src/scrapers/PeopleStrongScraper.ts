import { cachedFetch } from '../cache.ts';
import { time } from '../utils.ts';
import {
  JobNotFoundError,
  Scraper,
  type ListedJob,
  type ParsedUrl,
} from './Scraper.ts';

interface PeopleStrongListedJob {
  jobTitle?: string;
  jobCode?: string;
  jobDetailUrl?: string;
  locationHierarchy?: string;
  locationHierarchyComplete?: string;
}

interface PeopleStrongListResponse {
  totalRecords?: number;
  response?: PeopleStrongListedJob[];
}

interface PeopleStrongDetailResponse {
  response?: {
    jobTitle?: string;
    requisitionCode?: string;
    joiningLocation?: string;
    locationHierarchyComplete?: string;
    [key: string]: unknown;
  };
}

const PAGE_SIZE = 50;
const DETAIL_PARTS =
  'basic,organisational,descriprion,workflow,skill,qualification,certification,language,applied';

function formatLocation(
  shortLocation?: string | null,
  hierarchy?: string | null
): string {
  const trimmed = shortLocation?.trim();
  if (trimmed) return trimmed;
  if (!hierarchy) return '';
  const parts = hierarchy
    .split('>')
    .map((part) => part.trim())
    .filter((part) => part && part.toLowerCase() !== 'multiple');
  return parts.at(-1) ?? '';
}

function idFromDetailUrl(
  detailUrl: string | undefined,
  jobCode?: string
): string {
  if (detailUrl) {
    const parsed = URL.parse(detailUrl);
    const segment = parsed?.pathname.split('/').filter(Boolean).at(-1);
    if (segment) return segment;
  }
  return jobCode ? jobCode.replaceAll('/', '_') : '';
}

/**
 * Scraper for PeopleStrong Candidate Portal boards (`https://{slug}.peoplestrong.com`).
 */
export default class PeopleStrongScraper extends Scraper {
  static readonly boardDomains = ['peoplestrong.com'];

  static parseUrl(url: URL): ParsedUrl | null {
    const hostMatch = url.hostname.match(/^([^.]+)\.peoplestrong\.com$/i);
    if (!hostMatch) return null;

    const slug = hostMatch[1].toLowerCase();
    const detailMatch = url.pathname.match(/^\/job\/detail\/([^/]+)/i);
    return { slug, jobId: detailMatch?.[1] ?? null };
  }

  private get portalOrigin(): string {
    return this.companySlug.includes('.')
      ? `https://${this.companySlug}`
      : `https://${this.companySlug}.peoplestrong.com`;
  }

  private get apiBase(): string {
    return `${this.portalOrigin}/api/cp/rest/altone/cp`;
  }

  jobUrl(id: string): string {
    return `${this.portalOrigin}/job/detail/${id}`;
  }

  async getJobsList(testing = false): Promise<ListedJob[]> {
    const jobs: ListedJob[] = [];
    const seenIds = new Set<string>();
    const limit = testing ? 10 : PAGE_SIZE;
    let offset = 0;
    let total = Infinity;

    while (offset < total) {
      const res = (await cachedFetch
        .call(
          { cache: !testing, cacheTTL: time.day },
          `${this.apiBase}/jobs/v1?offset=${offset}&limit=${limit}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },
            body: '{}',
          }
        )
        .then((r) => r.json())) as PeopleStrongListResponse;

      const batch = Array.isArray(res.response) ? res.response : [];
      total =
        typeof res.totalRecords === 'number' ? res.totalRecords : batch.length;

      for (const item of batch) {
        const id = idFromDetailUrl(item.jobDetailUrl, item.jobCode);
        if (!id || !item.jobTitle || seenIds.has(id)) continue;
        seenIds.add(id);

        jobs.push({
          id,
          title: item.jobTitle,
          location: formatLocation(
            item.locationHierarchy,
            item.locationHierarchyComplete
          ),
          url: item.jobDetailUrl || this.jobUrl(id),
        });
      }

      if (testing || batch.length < limit) break;
      offset += batch.length;
    }

    return jobs;
  }

  async getJobContent(id: string): Promise<string> {
    const res = (await cachedFetch
      .call(
        { cacheTTL: time.day },
        `${this.apiBase}/job/${encodeURIComponent(id)}/v2?part=${DETAIL_PARTS}&isReqId=false`,
        {
          headers: { Accept: 'application/json' },
        }
      )
      .then((r) => r.json())) as PeopleStrongDetailResponse;

    const detail = res.response;
    if (!detail?.jobTitle && !detail?.requisitionCode) {
      throw new JobNotFoundError(id, this.companySlug);
    }

    return JSON.stringify({
      ...detail,
      title: detail.jobTitle ?? '',
      location: formatLocation(
        detail.joiningLocation,
        detail.locationHierarchyComplete
      ),
      absolute_url: this.jobUrl(id),
    });
  }
}

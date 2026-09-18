// Fetching + caching robots.txt per origin, with retries for the flaky network.
//
// Policy on fetch problems (RFC 9309 §2.3.1.4 / §2.3.1.3):
//   - 2xx        -> parse as usual
//   - 404 / 410  -> no robots.txt, everything allowed
//   - 401 / 403  -> treat as "all disallowed"
//   - other 4xx  -> treat as no robots.txt (allowed)
//   - 5xx / network error after retries -> unavailable: disallow (recorded as a failure),
//     never silently crawled.

import { parseRobotsTxt, selectRobotsGroup, decideRobotsAccess } from './robots.mjs';
import { firstLine, hostOf, originOf } from './util.mjs';

const UNAVAILABLE = { fetch: 'unavailable', rules: [], crawlDelay: null, allowed: false };

export class RobotsClient {
  constructor({ userAgent, productToken, throttle, timeoutMs = 15000, retries = 2, log = () => {} }) {
    this.userAgent = userAgent;
    this.productToken = productToken;
    this.throttle = throttle;
    this.timeoutMs = timeoutMs;
    this.retries = retries;
    this.log = log;
    this.cache = new Map();
  }

  // Dropped between the main run and the retry pass so robots.txt is re-fetched instead of
  // reusing a cached "unavailable" answer.
  clearCache() {
    this.cache.clear();
  }

  async info(origin) {
    if (this.cache.has(origin)) return this.cache.get(origin);
    const promise = this.#fetch(origin);
    this.cache.set(origin, promise);
    return promise;
  }

  async #fetch(origin) {
    const host = hostOf(origin);
    const robotsUrl = `${origin}/robots.txt`;
    let lastError = null;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      await this.throttle.wait(host);
      try {
        const res = await fetch(robotsUrl, {
          redirect: 'follow',
          headers: { 'user-agent': this.userAgent, accept: 'text/plain,*/*;q=0.8' },
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        const status = res.status;
        if (status >= 200 && status < 300) {
          const text = await res.text();
          const groups = parseRobotsTxt(text);
          const selected = selectRobotsGroup(groups, this.productToken);
          return {
            fetch: 'ok',
            status,
            url: robotsUrl,
            matchedAgent: selected.matchedAgent,
            rules: selected.rules,
            crawlDelay: selected.crawlDelay,
            sitemaps: [...text.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((m) => m[1]),
          };
        }
        if (status === 404 || status === 410) {
          const info = {
            fetch: 'absent',
            status,
            url: robotsUrl,
            matchedAgent: null,
            rules: [],
            crawlDelay: null,
            sitemaps: [],
          };
          if (this.throttle) this.throttle.setHostDelay(host, this.throttle.minDelayMs);
          return info;
        }
        if (status === 401 || status === 403) {
          return {
            fetch: 'forbidden',
            status,
            url: robotsUrl,
            matchedAgent: null,
            rules: [],
            crawlDelay: null,
            sitemaps: [],
            allDisallowed: true,
          };
        }
        if (status >= 500) {
          lastError = new Error(`robots.txt HTTP ${status}`);
        } else {
          return {
            fetch: 'absent',
            status,
            url: robotsUrl,
            matchedAgent: null,
            rules: [],
            crawlDelay: null,
            sitemaps: [],
          };
        }
      } catch (error) {
        lastError = error;
      }
      this.log(`  robots.txt fetch attempt ${attempt} failed (${firstLine(lastError.message)}${lastError.cause ? `; cause: ${lastError.cause.code ?? lastError.cause.message}` : ''})`);
    }

    return {
      ...UNAVAILABLE,
      status: null,
      url: robotsUrl,
      error: `${firstLine(lastError?.message ?? 'unknown robots.txt failure')}${lastError?.cause ? ` (${lastError.cause.code ?? lastError.cause.message})` : ''}`,
    };
  }

  // Returns { allowed, reason, rule, crawlDelaySeconds, robots }
  async check(url, { maxCrawlDelayMs = 30000 } = {}) {
    const origin = originOf(url);
    const host = hostOf(url);
    const info = await this.info(origin);

    if (info.fetch === 'unavailable') {
      return { allowed: false, reason: 'robots_unavailable', detail: info.error ?? null, robots: info };
    }
    if (info.allDisallowed) {
      return { allowed: false, reason: 'robots_forbidden', detail: `robots.txt HTTP ${info.status}`, robots: info };
    }

    const crawlDelaySeconds = info.crawlDelay ?? null;
    if (crawlDelaySeconds !== null) {
      const crawlDelayMs = Math.round(crawlDelaySeconds * 1000);
      if (crawlDelayMs > maxCrawlDelayMs) {
        return {
          allowed: false,
          reason: 'robots_crawl_delay_exceeds_limit',
          detail: `Crawl-delay ${crawlDelaySeconds}s > limit ${maxCrawlDelayMs / 1000}s`,
          crawlDelaySeconds,
          robots: info,
        };
      }
      this.throttle.setHostDelay(host, Math.max(crawlDelayMs, this.throttle.minDelayMs));
    }

    const decision = decideRobotsAccess(info, url);
    return {
      allowed: decision.allowed,
      reason: decision.allowed ? null : 'robots_disallowed',
      rule: decision.rule,
      detail: `${info.matchedAgent ?? 'no-match'} ${decision.rule ?? ''}`.trim(),
      crawlDelaySeconds,
      robots: { fetch: info.fetch, status: info.status ?? null, matchedAgent: info.matchedAgent ?? null, url: info.url },
    };
  }
}

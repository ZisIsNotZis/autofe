// Fetching + caching robots.txt per origin, with retries for the flaky network.
//
// Policy on fetch problems (RFC 9309 §2.3.1.4 / §2.3.1.3):
//   - 2xx        -> parse as usual
//   - 404 / 410  -> no robots.txt, everything allowed
//   - 401 / 403  -> treat as "all disallowed"
//   - other 4xx  -> treat as no robots.txt (allowed)
//   - 5xx / network error after retries -> unavailable: disallow (recorded as a failure),
//     never silently crawled.
//
// Redirects are followed manually and only while they stay on the same origin. robots.txt is
// defined per authority (scheme+host+port); following a cross-origin redirect would apply
// another host's rules to this host, so a cross-origin redirect is treated as unavailable and
// recorded instead of guessed at.

import { parseRobotsTxt, selectRobotsGroup, decideRobotsAccess } from './robots.mjs';
import { firstLine, hostOf, originOf, withTimeout } from './util.mjs';

const UNAVAILABLE = { fetch: 'unavailable', rules: [], crawlDelay: null, allowed: false };
const MAX_ROBOTS_REDIRECTS = 3;

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

  // Optional last-resort fetch through the browser's network stack (see browser.mjs).
  setBrowserFetch(fn) {
    this.browserFetch = fn;
  }

  async info(origin) {
    if (this.cache.has(origin)) return this.cache.get(origin);
    const promise = this.#fetch(origin);
    this.cache.set(origin, promise);
    return promise;
  }

  // One robots.txt request with manual same-origin redirect handling.
  async #request(origin) {
    const host = hostOf(origin);
    let url = `${origin}/robots.txt`;
    for (let hop = 0; hop <= MAX_ROBOTS_REDIRECTS; hop += 1) {
      await this.throttle.wait(host);
      const res = await fetch(url, {
        redirect: 'manual',
        headers: { 'user-agent': this.userAgent, accept: 'text/plain,*/*;q=0.8' },
        signal: AbortSignal.timeout(this.timeoutMs),
      });
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get('location');
        if (!location) return { status: res.status, text: null, redirectWithoutLocation: true, finalUrl: url };
        const target = new URL(location, url);
        if (target.origin !== originOf(origin)) {
          return { status: res.status, text: null, crossOriginRedirect: target.toString(), finalUrl: url };
        }
        url = target.toString();
        continue;
      }
      return { status: res.status, text: await res.text(), finalUrl: url, hops: hop };
    }
    return { status: null, text: null, tooManyRedirects: true, finalUrl: url };
  }

  async #fetch(origin) {
    const robotsUrl = `${origin}/robots.txt`;
    let lastError = null;

    for (let attempt = 1; attempt <= this.retries; attempt++) {
      try {
        const info = this.#interpret(await this.#request(origin), origin, robotsUrl, 'node');
        if (info) return info;
        lastError = new Error('robots.txt HTTP 5xx');
      } catch (error) {
        lastError = error;
      }
      this.log(`  robots.txt fetch attempt ${attempt} failed (${firstLine(lastError.message)}${lastError.cause ? `; cause: ${lastError.cause.code ?? lastError.cause.message}` : ''})`);
    }

    // Last resort: same request through the browser's network stack.
    if (this.browserFetch) {
      try {
        this.log('  robots.txt: retrying via the browser network stack');
        const res = await withTimeout(this.browserFetch(robotsUrl), this.timeoutMs + 10000, 'browser robots.txt fetch');
        const info = this.#interpret(res, origin, robotsUrl, 'browser');
        if (info) return info;
        lastError = new Error(`robots.txt HTTP ${res.status} via browser`);
      } catch (error) {
        lastError = error;
        this.log(`  robots.txt browser fetch failed (${firstLine(error.message)})`);
      }
    }

    return {
      ...UNAVAILABLE,
      status: null,
      url: robotsUrl,
      error: `${firstLine(lastError?.message ?? 'unknown robots.txt failure')}${lastError?.cause ? ` (${lastError.cause.code ?? lastError.cause.message})` : ''}`,
    };
  }

  // Maps a fetch result onto the robots policy branches. Returns null when the result means
  // "retry / fall back" (5xx).
  #interpret(res, origin, robotsUrl, via) {
    const status = res.status;
    if (res.crossOriginRedirect || (via === 'browser' && res.finalUrl && originOf(res.finalUrl) !== originOf(origin))) {
      const target = res.crossOriginRedirect ?? res.finalUrl;
      return {
        ...UNAVAILABLE,
        status,
        url: robotsUrl,
        fetchedVia: via,
        crossOriginRedirectTo: target,
        error: `robots.txt redirects cross-origin to ${target}`,
      };
    }
    if (res.tooManyRedirects) {
      return {
        ...UNAVAILABLE,
        status: null,
        url: robotsUrl,
        fetchedVia: via,
        error: `robots.txt exceeded ${MAX_ROBOTS_REDIRECTS} same-origin redirects`,
      };
    }
    if (status >= 200 && status < 300) {
      const text = res.text ?? '';
      const groups = parseRobotsTxt(text);
      const selected = selectRobotsGroup(groups, this.productToken);
      return {
        fetch: 'ok',
        status,
        url: robotsUrl,
        fetchedUrl: res.finalUrl,
        fetchedVia: via,
        matchedAgent: selected.matchedAgent,
        rules: selected.rules,
        crawlDelay: selected.crawlDelay,
        sitemaps: [...text.matchAll(/^\s*sitemap:\s*(\S+)/gim)].map((match) => match[1]),
      };
    }
    if (status === 404 || status === 410) {
      return {
        fetch: 'absent',
        status,
        url: robotsUrl,
        fetchedUrl: res.finalUrl,
        fetchedVia: via,
        matchedAgent: null,
        rules: [],
        crawlDelay: null,
        sitemaps: [],
      };
    }
    if (status === 401 || status === 403) {
      return {
        fetch: 'forbidden',
        status,
        url: robotsUrl,
        fetchedVia: via,
        matchedAgent: null,
        rules: [],
        crawlDelay: null,
        sitemaps: [],
        allDisallowed: true,
      };
    }
    if (status >= 500) return null;
    return {
      fetch: 'absent',
      status,
      url: robotsUrl,
      fetchedVia: via,
      matchedAgent: null,
      rules: [],
      crawlDelay: null,
      sitemaps: [],
    };
  }

  // Returns { allowed, reason, rule, crawlDelaySeconds, robots }
  async check(url, { maxCrawlDelayMs = 30000 } = {}) {
    const origin = originOf(url);
    const host = hostOf(url);
    const info = await this.info(origin);

    if (info.fetch === 'unavailable') {
      return {
        allowed: false,
        reason: info.crossOriginRedirectTo ? 'robots_cross_origin_redirect' : 'robots_unavailable',
        detail: info.error ?? null,
        robots: info,
      };
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
      robots: {
        fetch: info.fetch,
        status: info.status ?? null,
        matchedAgent: info.matchedAgent ?? null,
        url: info.url,
        fetchedUrl: info.fetchedUrl ?? null,
        fetchedVia: info.fetchedVia ?? null,
      },
    };
  }
}

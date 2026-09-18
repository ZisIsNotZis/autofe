// Per-host request pacing. Guarantees a minimum gap between any two requests to the
// same host (navigation, robots.txt fetch, retries all go through here).

import { sleep } from './util.mjs';

export class HostThrottle {
  constructor({ minDelayMs = 1500 } = {}) {
    this.minDelayMs = minDelayMs;
    this.perHost = new Map();
    this.lastRequestAt = new Map();
    this.totalWaitMs = 0;
    // Every paced request, in order — written to run-report.json as delay evidence.
    this.history = [];
  }

  setHostDelay(host, delayMs) {
    this.perHost.set(host, Math.max(delayMs, this.minDelayMs));
  }

  delayFor(host) {
    return this.perHost.get(host) ?? this.minDelayMs;
  }

  async wait(host) {
    const now = Date.now();
    const last = this.lastRequestAt.get(host);
    let waitedMs = 0;
    if (last !== undefined) {
      waitedMs = Math.max(0, last + this.delayFor(host) - now);
      if (waitedMs > 0) {
        this.totalWaitMs += waitedMs;
        await sleep(waitedMs);
      }
    }
    const at = Date.now();
    this.lastRequestAt.set(host, at);
    this.history.push({
      host,
      at: new Date(at).toISOString(),
      gapSincePreviousRequestMs: last === undefined ? null : at - last,
      waitedMs,
    });
  }
}

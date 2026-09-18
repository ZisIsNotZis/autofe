// robots.txt parsing + allow/deny decisions (RFC 9309 subset).
//
// Supported: user-agent groups (incl. several agents in one group), Allow/Disallow
// with `*` wildcards and `$` end-anchor, longest-match precedence, allow-wins-ties,
// Crawl-delay. Not supported (deliberately): Sitemap parsing, Request-rate.

const COMMENT = /#.*$/;

export function parseRobotsTxt(text) {
  const groups = [];
  let current = null;
  let sawRuleInCurrentGroup = false;

  for (const rawLine of String(text).split(/\r?\n/)) {
    const line = rawLine.replace(COMMENT, '').trim();
    if (!line) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const field = line.slice(0, colon).trim().toLowerCase();
    const value = line.slice(colon + 1).trim();

    if (field === 'user-agent') {
      if (!current || sawRuleInCurrentGroup) {
        current = { agents: [], rules: [], crawlDelay: null };
        groups.push(current);
        sawRuleInCurrentGroup = false;
      }
      if (value) current.agents.push(value.toLowerCase());
      continue;
    }

    if (!current) {
      current = { agents: ['*'], rules: [], crawlDelay: null };
      groups.push(current);
    }

    if (field === 'allow' || field === 'disallow') {
      sawRuleInCurrentGroup = true;
      // Empty `Disallow:` means "nothing disallowed"; empty `Allow:` is a no-op.
      if (!value) continue;
      current.rules.push({ type: field, pattern: value });
      continue;
    }

    if (field === 'crawl-delay') {
      sawRuleInCurrentGroup = true;
      const n = Number.parseFloat(value);
      if (Number.isFinite(n) && n >= 0) {
        current.crawlDelay = Math.max(current.crawlDelay ?? 0, n);
      }
    }
  }

  return groups;
}

// Pick the group whose agent token best matches our product token; fall back to `*`.
// Multiple groups for the same agent (or several `*` groups) are merged, per RFC 9309.
export function selectRobotsGroup(groups, productToken) {
  const token = String(productToken).toLowerCase();
  let bestToken = null;
  let bestGroups = [];

  for (const group of groups) {
    for (const agent of group.agents) {
      if (agent === '*') continue;
      if (!token.startsWith(agent) && !token.includes(agent)) continue;
      if (bestToken === null || agent.length > bestToken.length) {
        bestToken = agent;
        bestGroups = [group];
      } else if (agent.length === bestToken.length && !bestGroups.includes(group)) {
        bestGroups.push(group);
      }
    }
  }

  if (bestToken === null) {
    bestGroups = groups.filter((g) => g.agents.includes('*'));
    if (!bestGroups.length) return { matchedAgent: null, rules: [], crawlDelay: null };
  }

  const rules = bestGroups.flatMap((g) => g.rules);
  const delays = bestGroups.map((g) => g.crawlDelay).filter((d) => d !== null && d !== undefined);
  return {
    matchedAgent: bestToken ?? '*',
    rules,
    crawlDelay: delays.length ? Math.max(...delays) : null,
  };
}

function patternToRegExp(pattern) {
  const anchoredEnd = pattern.endsWith('$');
  const body = anchoredEnd ? pattern.slice(0, -1) : pattern;
  let source = '^';
  for (const ch of body) {
    if (ch === '*') source += '[\\s\\S]*';
    else source += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
  if (anchoredEnd) source += '$';
  return new RegExp(source);
}

function specificity(pattern) {
  return pattern.replace(/\*/g, '').length;
}

// `url` is matched on path + query, as RFC 9309 prescribes.
export function decideRobotsAccess({ rules, crawlDelay }, url) {
  const parsed = new URL(url);
  const target = `${parsed.pathname}${parsed.search}`;
  let winner = null;

  for (const rule of rules) {
    const re = patternToRegExp(rule.pattern);
    if (!re.test(target)) continue;
    const score = specificity(rule.pattern);
    if (
      winner === null ||
      score > winner.score ||
      (score === winner.score && rule.type === 'allow' && winner.type === 'disallow')
    ) {
      winner = { type: rule.type, pattern: rule.pattern, score };
    }
  }

  return {
    allowed: winner === null || winner.type === 'allow',
    rule: winner ? `${winner.type}: ${winner.pattern}` : null,
    crawlDelaySeconds: crawlDelay,
  };
}

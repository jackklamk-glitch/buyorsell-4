const DEFAULT_RULES = [
  { id: 'bos_breakout', field: 's_bos', op: '>', value: 70, severity: 'high', message: 'S_BOS crossed above 70' },
  { id: 'rsi_oversold', field: 'rsi14', op: '<', value: 30, severity: 'medium', message: 'RSI fell below 30' },
  { id: 'foreign_flow_positive', field: 'foreign_net_flow', op: 'crosses_above', value: 0, severity: 'medium', message: 'Foreign net flow turned positive' },
  { id: 'foreign_flow_negative', field: 'foreign_net_flow', op: 'crosses_below', value: 0, severity: 'medium', message: 'Foreign net flow turned negative' },
];

function evaluateRules(rows, previousRows = [], rules = DEFAULT_RULES) {
  const previous = new Map(previousRows.map((row) => [row.symbol, row]));
  const alerts = [];
  for (const row of rows || []) {
    const before = previous.get(row.symbol) || {};
    for (const rule of rules) {
      const currentValue = metric(row, rule.field);
      const previousValue = metric(before, rule.field);
      if (currentValue == null || !matches(rule, currentValue, previousValue)) continue;
      alerts.push({
        id: `${rule.id}:${row.symbol}:${row.dt || row.updatedAt || Date.now()}`,
        ruleId: rule.id,
        symbol: row.symbol,
        severity: rule.severity || 'medium',
        message: rule.message,
        value: currentValue,
        previousValue,
        signal: row.signal || null,
        s_bos: metric(row, 's_bos'),
        createdAt: new Date().toISOString(),
      });
    }
  }
  return alerts;
}

function metric(row, field) {
  if (!row) return null;
  const value = {
    s_bos: row.s_bos ?? row.sBos ?? row.bosScore,
    rsi14: row.rsi14 ?? row.ta?.rsi14,
    foreign_net_flow: row.foreign_net_flow ?? row.foreignNetFlow ?? row.foreignNetVolume ?? row.live?.foreignNetVolume,
    price_change_pct: row.priceChangePct ?? row.changePct ?? row.live?.changePct,
    volume: row.volume ?? row.totalVolume ?? row.live?.totalVolume,
  }[field];
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function matches(rule, current, previous) {
  const target = Number(rule.value);
  if (rule.op === '>') return current > target;
  if (rule.op === '>=') return current >= target;
  if (rule.op === '<') return current < target;
  if (rule.op === '<=') return current <= target;
  if (rule.op === '==') return current === target;
  if (rule.op === 'crosses_above') return previous != null && previous <= target && current > target;
  if (rule.op === 'crosses_below') return previous != null && previous >= target && current < target;
  return false;
}

async function dispatchWebhooks(alerts, channels = {}) {
  const results = [];
  if (!alerts.length || typeof fetch !== 'function') return results;
  const telegramUrl = channels.telegramUrl || process.env.TELEGRAM_ALERT_WEBHOOK_URL;
  const zaloUrl = channels.zaloUrl || process.env.ZALO_OA_WEBHOOK_URL;
  for (const [channel, url] of [['telegram', telegramUrl], ['zalo', zaloUrl]]) {
    if (!url) continue;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ channel, alerts }),
    }).catch((error) => ({ ok: false, status: 0, error }));
    results.push({ channel, ok: Boolean(res.ok), status: res.status || 0 });
  }
  return results;
}

module.exports = { DEFAULT_RULES, dispatchWebhooks, evaluateRules };

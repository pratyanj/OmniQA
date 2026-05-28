import type { Bug } from '@/types';
import { SEED_BUGS } from '@/data/seed';

/** Find bugs with similar titles (simple Jaccard token similarity) */
export function findDuplicates(title: string, bugs: Bug[], excludeId?: string): Bug[] {
  if (!title.trim()) return [];
  const tokens = new Set(title.toLowerCase().split(/\s+/).filter(t => t.length > 3));
  if (tokens.size === 0) return [];

  return bugs
    .filter(b => b.id !== excludeId)
    .map(b => {
      const bugTokens = new Set(b.title.toLowerCase().split(/\s+/).filter(t => t.length > 3));
      const intersection = [...tokens].filter(t => bugTokens.has(t)).length;
      const union = new Set([...tokens, ...bugTokens]).size;
      return { bug: b, score: union > 0 ? intersection / union : 0 };
    })
    .filter(x => x.score > 0.2)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(x => x.bug);
}

/** Suggest severity based on keywords in title/description */
export function suggestSeverity(title: string, description = ''): string | null {
  const text = (title + ' ' + description).toLowerCase();
  if (/crash|freeze|hang|unresponsive|data loss|corrupt|security|unauthorized/.test(text)) return 'critical';
  if (/error|fail|broken|not working|missing|incorrect/.test(text)) return 'high';
  if (/slow|delay|performance|timeout/.test(text)) return 'medium';
  if (/ui|alignment|display|cosmetic|color|font|layout/.test(text)) return 'low';
  return null;
}

/** Daily bug trend for last N days */
export function getDailyTrend(bugs: Bug[], days = 14) {
  const result = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toDateString();
    const created = bugs.filter(b => new Date(b.createdAt).toDateString() === dateStr).length;
    const resolved = bugs.filter(b =>
      b.resolvedAt && new Date(b.resolvedAt).toDateString() === dateStr
    ).length;
    result.push({
      date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      created,
      resolved,
    });
  }
  return result;
}

/** Bugs by severity for donut chart */
export function getBugsBySeverity(bugs: Bug[]) {
  const counts: Record<string, number> = {
    Critical: 0, High: 0, Medium: 0, Low: 0, Cosmetic: 0,
  };
  bugs
    .filter(b => !['closed', 'rejected', 'duplicate'].includes(b.status))
    .forEach(b => {
      const key = b.severity.charAt(0).toUpperCase() + b.severity.slice(1);
      counts[key] = (counts[key] ?? 0) + 1;
    });
  return Object.entries(counts).map(([name, value]) => ({ name, value })).filter(x => x.value > 0);
}

/** Bugs by developer */
export function getBugsByDeveloper(bugs: Bug[], getUserName: (id: string) => string) {
  const counts: Record<string, number> = {};
  bugs
    .filter(b => b.assignedTo && !['closed', 'rejected'].includes(b.status))
    .forEach(b => {
      const name = getUserName(b.assignedTo!);
      counts[name] = (counts[name] ?? 0) + 1;
    });
  return Object.entries(counts).map(([name, bugs]) => ({ name, bugs })).sort((a, b) => b.bugs - a.bugs);
}

/** Average fix time in hours for closed/verified bugs */
export function getAvgFixTime(bugs: Bug[]): number {
  const resolved = bugs.filter(b => b.resolvedAt && b.createdAt);
  if (!resolved.length) return 0;
  const totalHours = resolved.reduce((sum, b) => {
    const diff = new Date(b.resolvedAt!).getTime() - new Date(b.createdAt).getTime();
    return sum + diff / (1000 * 60 * 60);
  }, 0);
  return Math.round(totalHours / resolved.length);
}

export { SEED_BUGS };

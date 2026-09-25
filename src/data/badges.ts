import type { CollectionEntry } from 'astro:content';

export type Badge = { label: string; tone: 'award' | 'ongoing' | 'lead' };

export function projectBadges({ data }: CollectionEntry<'projects'>): Badge[] {
  const badges: Badge[] = [];
  if (data.award) badges.push({ label: `🏆 ${data.award}`, tone: 'award' });
  if (data.status === 'ongoing') badges.push({ label: '진행 중', tone: 'ongoing' });
  if (data.role?.includes('팀장') || data.role?.includes('PM')) badges.push({ label: data.role.includes('팀장') ? '팀장' : 'PM', tone: 'lead' });
  return badges;
}

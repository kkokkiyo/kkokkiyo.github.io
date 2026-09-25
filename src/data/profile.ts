// profile.json을 About, CV, 영어 페이지에서 쓰는 형태로 변환
import profile from './profile.json';

export type Item = { date?: string; name: string; nameEn?: string; note?: string };

export const skills: Record<string, string[]> = Object.fromEntries(profile.skills.map((s) => [s.category, s.items]));
export const awards: Item[] = profile.awards;
export const activities: Item[] = profile.activities;
export const certs: Item[] = profile.certs;
export const graduation = profile.graduation;

import { getCollection } from 'astro:content';
import home from './home.json';

// home.json 순서대로 대표 프로젝트 반환
export async function getFeaturedProjects() {
  const projects = await getCollection('projects', ({ data }) => !data.draft);
  return home.featured.map((slug) => projects.find((p) => p.id === slug)).filter((p) => p !== undefined);
}

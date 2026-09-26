// 페이지별 공유 이미지(1200×630) 생성
import fs from 'node:fs/promises';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { getCollection } from 'astro:content';
import type { APIRoute, GetStaticPaths } from 'astro';
import { SITE, CATEGORIES } from '../../consts';

const fonts = await Promise.all(
  (['Regular', 'Bold'] as const).map(async (w) => ({
    name: 'Pretendard',
    data: await fs.readFile(`${process.cwd()}/src/assets/fonts/Pretendard-${w}.otf`),
    weight: w === 'Bold' ? (700 as const) : (400 as const),
  })),
);

export const getStaticPaths: GetStaticPaths = async () => {
  const projects = await getCollection('projects', ({ data }) => !data.draft);
  const posts = await getCollection('blog', ({ data }) => !data.draft);
  return [
    { params: { slug: 'default' }, props: { title: SITE.tagline, kicker: SITE.affiliation } },
    { params: { slug: 'research' }, props: { title: 'Dot Pad 기반 콘텐츠 접근성 연구', kicker: 'Research' } },
    { params: { slug: 'playground' }, props: { title: '팩맨을 하거나 이미지를 핀으로 바꿔 보세요', kicker: 'Dot Pad Playground' } },
    ...projects.map((p) => ({
      params: { slug: `projects/${p.id}` },
      props: {
        title: p.data.title,
        kicker: p.data.award || [CATEGORIES[p.data.category], p.data.status === 'ongoing' && '진행 중'].filter(Boolean).join(', '),
        seed: p.id,
      },
    })),
    ...posts.map((p) => ({ params: { slug: `blog/${p.id}` }, props: { title: p.data.title, kicker: p.data.series || 'Blog', seed: p.id } })),
  ];
};

// 오른쪽 장식용 핀 격자 (seed가 있으면 좌우 대칭 무늬를 seed마다 다르게)
const DEFAULT_ON = [3, 4, 5, 12, 13, 14, 15, 16, 21, 22, 23, 24, 30, 31, 32, 41, 42, 51, 52, 53, 60, 61, 62, 63];
function pinPattern(seed?: string) {
  if (!seed) return Array.from({ length: 80 }, (_, i) => DEFAULT_ON.includes(i));
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  const rand = () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) ^ Math.imul(h ^ (h >>> 13), 3266489909)) >>> 0) / 4294967296;
  const half = Array.from({ length: 10 * 4 }, () => rand() < 0.42);
  return Array.from({ length: 80 }, (_, i) => {
    const row = Math.floor(i / 8), col = i % 8;
    return half[row * 4 + (col < 4 ? col : 7 - col)];
  });
}

const h = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } });

export const GET: APIRoute = async ({ props }) => {
  const { title, kicker, seed } = props as { title: string; kicker: string; seed?: string };
  const pins = pinPattern(seed);
  const svg = await satori(
    h('div', { width: 1200, height: 630, display: 'flex', background: '#09090b', color: '#fafafa', padding: 72, fontFamily: 'Pretendard' }, [
      h('div', { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, paddingRight: 48 }, [
        h('div', { fontSize: 30, color: '#60a5fa' }, kicker),
        h('div', { fontSize: title.length > 24 ? 60 : 72, fontWeight: 700, lineHeight: 1.2, wordBreak: 'keep-all' }, title),
        h('div', { fontSize: 28, color: '#a1a1aa' }, `${SITE.author}   kkokkiyo.github.io`),
      ]),
      h('div', { display: 'flex', flexWrap: 'wrap', width: 300, alignContent: 'center', gap: 14 },
        pins.map((on) => h('div', { width: 22, height: 22, borderRadius: 11, background: on ? '#fafafa' : '#3f3f46' })),
      ),
    ]) as never,
    { width: 1200, height: 630, fonts },
  );
  const png = new Resvg(svg).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};

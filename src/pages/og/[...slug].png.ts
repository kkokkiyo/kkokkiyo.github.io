// 페이지별 공유 이미지(1200×630) 생성
import fs from 'node:fs/promises';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { getCollection } from 'astro:content';
import type { APIRoute, GetStaticPaths } from 'astro';
import { SITE } from '../../consts';

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
    { params: { slug: 'playground' }, props: { title: '이미지를 60×40 촉각 핀으로 바꿔 보세요', kicker: 'Dot Pad Playground' } },
    ...projects.map((p) => ({ params: { slug: `projects/${p.id}` }, props: { title: p.data.title, kicker: p.data.award || 'Project' } })),
    ...posts.map((p) => ({ params: { slug: `blog/${p.id}` }, props: { title: p.data.title, kicker: p.data.series || 'Blog' } })),
  ];
};

// 오른쪽 장식용 핀 격자
const pins = Array.from({ length: 8 * 10 }, (_, i) => ({ on: [3, 4, 5, 12, 13, 14, 15, 16, 21, 22, 23, 24, 30, 31, 32, 41, 42, 51, 52, 53, 60, 61, 62, 63].includes(i) }));

const h = (type: string, style: Record<string, unknown>, children?: unknown) => ({ type, props: { style, children } });

export const GET: APIRoute = async ({ props }) => {
  const { title, kicker } = props as { title: string; kicker: string };
  const svg = await satori(
    h('div', { width: 1200, height: 630, display: 'flex', background: '#09090b', color: '#fafafa', padding: 72, fontFamily: 'Pretendard' }, [
      h('div', { display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, paddingRight: 48 }, [
        h('div', { fontSize: 30, color: '#60a5fa' }, kicker),
        h('div', { fontSize: title.length > 24 ? 60 : 72, fontWeight: 700, lineHeight: 1.2, wordBreak: 'keep-all' }, title),
        h('div', { fontSize: 28, color: '#a1a1aa' }, `${SITE.author} · kkokkiyo.github.io`),
      ]),
      h('div', { display: 'flex', flexWrap: 'wrap', width: 300, alignContent: 'center', gap: 14 },
        pins.map((p) => h('div', { width: 22, height: 22, borderRadius: 11, background: p.on ? '#fafafa' : '#3f3f46' })),
      ),
    ]) as never,
    { width: 1200, height: 630, fonts },
  );
  const png = new Resvg(svg).render().asPng();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};

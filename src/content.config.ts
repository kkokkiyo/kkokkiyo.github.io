import { defineCollection, reference } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const projects = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/projects' }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    // 영어 페이지용 제목과 요약
    titleEn: z.string().nullish(),
    summaryEn: z.string().nullish(),
    period: z.string(),
    category: z.enum(['accessibility', 'ai', 'systems', 'course']),
    status: z.enum(['done', 'ongoing']).default('done'),
    award: z.string().nullish(),
    cover: z.string().nullish(),
    coverAlt: z.string().nullish(),
    stack: z.array(z.string()),
    highlights: z.array(z.string()).default([]),
    role: z.string().nullish(),
    repo: z.url().nullish(),
    demo: z.url().nullish(),
    order: z.number().nullish().transform((v) => v ?? 99),
    draft: z.boolean().default(false),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    tags: z.array(z.string()).default([]),
    series: z.string().nullish(),
    cover: z.string().nullish(),
    coverAlt: z.string().nullish(),
    draft: z.boolean().default(false),
  }),
});

// 프로젝트별 연구 로그
const logs = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/logs' }),
  schema: z.object({
    date: z.coerce.date(),
    title: z.string(),
    project: reference('projects'),
  }),
});

// 본문이 있는 고정 페이지 (Research, 접근성, Playground)
const pages = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/pages' }),
  schema: z.looseObject({
    title: z.string(),
    description: z.string().nullish(),
  }),
});

// 직접 추가하는 페이지 (/<주소>/)
const custom = defineCollection({
  loader: glob({ pattern: '**/*.{md,mdx}', base: './src/content/custom' }),
  schema: z.object({
    title: z.string(),
    description: z.string().nullish(),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, blog, logs, pages, custom };

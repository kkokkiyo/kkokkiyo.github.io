export const SITE = {
  title: 'Lee Dongchan',
  description: 'AI로 시각 콘텐츠를 만질 수 있게 만드는 개발자, 이동찬의 포트폴리오와 블로그',
  author: '이동찬',
  tagline: 'AI로 시각 콘텐츠를 만질 수 있게 만드는 개발자',
  affiliation: '한양대학교 ERICA 컴퓨터학부',
  github: 'https://github.com/kkokkiyo',
  email: 'dear0923@hanyang.ac.kr',
};

export const NAV = [
  { href: '/projects/', label: 'Projects' },
  { href: '/research/', label: 'Research' },
  { href: '/playground/', label: 'Playground' },
  { href: '/blog/', label: 'Blog' },
  { href: '/about/', label: 'About' },
];

export const CATEGORIES = {
  accessibility: '접근성·촉각',
  ai: 'AI/ML·대회',
  systems: '시스템·XR',
  course: '수업',
} as const;

// giscus 댓글 설정 (비어 있으면 댓글 비활성화)
export const GISCUS = {
  repo: '',
  repoId: '',
  category: 'Comments',
  categoryId: '',
};

// GoatCounter 방문 통계 코드 (비어 있으면 비활성화)
export const GOATCOUNTER = '';

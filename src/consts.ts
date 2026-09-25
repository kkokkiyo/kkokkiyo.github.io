// site.json의 사이트 설정을 내보냄
import site from './data/site.json';

export const SITE = {
  title: site.title,
  description: site.description,
  author: site.author,
  tagline: site.tagline,
  affiliation: site.affiliation,
  github: site.github,
  email: site.email,
};

export const NAV = site.nav;
export const FOOTER_LINKS = site.footerLinks;
export const CATEGORIES = site.categories;
export const GISCUS = site.giscus;
export const GOATCOUNTER = site.goatcounter;

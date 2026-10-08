import data from '../generated/content.json';
import type { PublicWork, Media, Usage } from './schema';
export const works = data.works as PublicWork[];
export const media = data.media as Media[];
export const usages = data.usages as Usage[];
export const listed = works.filter((w) => w.visibility === 'listed');
export const featured = listed
  .filter((w) => w.featuredOrder)
  .sort((a, b) => a.featuredOrder! - b.featuredOrder!);
export const kindLabel: Record<string, string> = {
  talk: '발표',
  lecture: '강의',
  motion: '모션',
  note: '기록',
};
export const formatDate = (d: string) => d.replaceAll('-', '.');
export const formatDuration = (n?: number) =>
  n
    ? Math.floor(n / 60) + ':' + String(Math.floor(n % 60)).padStart(2, '0')
    : '영상';

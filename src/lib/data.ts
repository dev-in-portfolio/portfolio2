import { museum } from '../generated/museum';

export type Wing = { slug: string; name: string; description?: string };
export type Hall = { slug: string; name: string; wingSlug: string; description?: string };
export type Exhibit = { slug: string; title: string; hallSlug: string; wingSlug?: string; summary?: string; tags?: string[]; body?: string; images?: string[]; sources?: { title: string; url: string }[] };

export function getWings(): Wing[] {
  return museum.wings as Wing[];
}

export function getHalls(): Hall[] {
  return museum.halls as Hall[];
}

export function getExhibits(): Exhibit[] {
  return museum.exhibits as Exhibit[];
}

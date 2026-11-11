import { describe, expect, it } from 'vitest';
import { detectProfile } from '../src/core/profiles';
import { profileValues } from '../src/core/data/content';
import { c } from './helpers';

describe('profiles (GDD 6.1)', () => {
  const p = (...cards: ReturnType<typeof c>[]) => detectProfile(cards).id;
  it('single / dual / quad channel', () => {
    expect(p(c('cpu', 3), c('gpu', 7))).toBe('single');
    expect(p(c('cpu', 3), c('gpu', 3))).toBe('dual');
    expect(p(c('cpu', 3), c('gpu', 3), c('ram', 5), c('io', 5))).not.toBe('quadch'); // hetero beats it
    expect(p(c('cpu', 3), c('cpu', 3), c('ram', 5), c('ram', 5))).toBe('quadch');
  });
  it('heterogen beats dual channel', () => {
    expect(p(c('gpu', 7), c('cpu', 7), c('ram', 3), c('io', 9))).toBe('hetero');
  });
  it('triple, pipeline, special, full stack, quad core, optimized pipeline', () => {
    expect(p(c('cpu', 4), c('gpu', 4), c('ram', 4))).toBe('triple');
    expect(p(c('cpu', 4), c('gpu', 5), c('ram', 6), c('io', 7), c('cpu', 8))).toBe('pipeline');
    expect(p(c('cpu', 1), c('cpu', 3), c('cpu', 5), c('cpu', 7), c('cpu', 9))).toBe('special');
    expect(p(c('cpu', 4), c('gpu', 4), c('ram', 4), c('io', 9), c('cpu', 9))).toBe('fullstack');
    expect(p(c('cpu', 4), c('gpu', 4), c('ram', 4), c('io', 4))).toBe('quadcore');
    expect(p(c('gpu', 6), c('gpu', 7), c('gpu', 8), c('gpu', 9), c('gpu', 10))).toBe('optpipe');
  });
  it('pipeline found among more cards and with duplicates', () => {
    expect(p(c('cpu', 1), c('gpu', 2), c('ram', 3), c('io', 3), c('cpu', 4), c('gpu', 5))).toBe('pipeline');
  });
  it('profile 6-8 and 10 need 5 cards', () => {
    expect(p(c('cpu', 1), c('cpu', 2), c('cpu', 3), c('cpu', 4))).toBe('single');
  });
  it('driver levels', () => {
    expect(profileValues('pipeline', 2)).toEqual({ l: 60, t: 7 });
    expect(profileValues('single', 1)).toEqual({ l: 5, t: 1 });
    expect(profileValues('optpipe', 3)).toEqual({ l: 180, t: 16 });
  });
});

/// <reference types="jest" />
import { mockProviders, mockReviews } from '@/mocks/providers';

/** Returns the values that appear more than once in the list. */
function findDuplicates(values: string[]): string[] {
  const counts = new Map<string, number>();
  values.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

describe('Hire A Pro provider directory', () => {
  it('lists at least one professional', () => {
    expect(mockProviders.length).toBeGreaterThan(0);
  });

  it('has no duplicate professional names', () => {
    expect(findDuplicates(mockProviders.map((p) => p.name))).toEqual([]);
  });

  it('has no duplicate professional profile pictures', () => {
    expect(findDuplicates(mockProviders.map((p) => p.avatar))).toEqual([]);
  });

  it('has no duplicate professional ids, emails or phone numbers', () => {
    expect(findDuplicates(mockProviders.map((p) => p.id))).toEqual([]);
    expect(findDuplicates(mockProviders.map((p) => p.email))).toEqual([]);
    expect(findDuplicates(mockProviders.map((p) => p.phone ?? ''))).toEqual([]);
  });

  it('gives every professional a non-empty avatar url', () => {
    mockProviders.forEach((provider) => {
      expect(provider.avatar).toMatch(/^https?:\/\//);
    });
  });
});

describe('Hire A Pro reviews', () => {
  it('has no duplicate reviewer names', () => {
    expect(findDuplicates(mockReviews.map((r) => r.reviewerName))).toEqual([]);
  });

  it('has no duplicate reviewer profile pictures', () => {
    expect(findDuplicates(mockReviews.map((r) => r.reviewerAvatar ?? ''))).toEqual([]);
  });

  it('only references professionals that exist', () => {
    const providerIds = new Set(mockProviders.map((p) => p.id));
    mockReviews.forEach((review) => {
      expect(providerIds.has(review.providerId)).toBe(true);
    });
  });

  it('never reuses a professional photo for a reviewer', () => {
    const providerAvatars = new Set(mockProviders.map((p) => p.avatar));
    mockReviews.forEach((review) => {
      expect(providerAvatars.has(review.reviewerAvatar ?? '')).toBe(false);
    });
  });
});

export const requireLimit = (limit: number): number => {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError(`limit must be an integer >= 1, got ${limit}`);
  return limit;
};

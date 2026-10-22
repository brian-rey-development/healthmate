export const first = <T>(rows: readonly T[]): T | undefined => rows[0];

export const single = <T>(rows: readonly T[]): T => {
  const row = first(rows);
  if (row === undefined) throw new Error('Expected one row, got none');
  return row;
};

// For a conditional write with returning(). An empty result means the condition or a conflict stopped the write.
export const wroteRow = (rows: readonly unknown[]): boolean => rows.length > 0;

export const requireLimit = (limit: number): number => {
  if (!Number.isInteger(limit) || limit < 1) throw new RangeError(`limit must be an integer >= 1, got ${limit}`);
  return limit;
};

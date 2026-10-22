export const first = <T>(rows: readonly T[]): T | undefined => rows[0];

export const single = <T>(rows: readonly T[]): T => {
  const row = first(rows);
  if (row === undefined) throw new Error('Expected one row, got none');
  return row;
};

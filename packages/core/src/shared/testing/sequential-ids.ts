import type { IdGenerator } from '../ports/id-generator';

export const sequentialIds = (prefix = 'id'): IdGenerator => {
  let count = 0;
  return {
    next: () => {
      count += 1;
      return `${prefix}-${count}`;
    },
  };
};

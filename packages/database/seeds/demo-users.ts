export type DemoUser = {
  id: string;
  email: string;
  displayName: string;
};

export const DEMO_PASSWORD = 'demo-password-local-only';
export const DEMO_CREATED_AT = new Date('2026-01-01T00:00:00Z');

export const DEMO_USERS: readonly DemoUser[] = [
  { id: '00000000-0000-4000-8000-000000000001', email: 'ada@demo.healthmate.test', displayName: 'Ada Synthetic' },
  { id: '00000000-0000-4000-8000-000000000002', email: 'grace@demo.healthmate.test', displayName: 'Grace Synthetic' },
];

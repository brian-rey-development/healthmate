import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { assertLocalTarget, createDb, loadLocalEnv, requireEnv, users, type Database } from '../src/index';
import { DEMO_CREATED_AT, DEMO_PASSWORD, DEMO_USERS, type DemoUser } from './demo-users';

const ensureAuthUser = async (admin: SupabaseClient, user: DemoUser): Promise<boolean> => {
  const existing = await admin.auth.admin.getUserById(user.id);
  if (existing.data.user) return false;
  const { error } = await admin.auth.admin.createUser({
    id: user.id,
    email: user.email,
    password: DEMO_PASSWORD,
    email_confirm: true,
  });
  if (error) throw error;
  return true;
};

const ensureProfile = async (db: Database, user: DemoUser): Promise<void> => {
  await db
    .insert(users)
    .values({ id: user.id, displayName: user.displayName, createdAt: DEMO_CREATED_AT })
    .onConflictDoNothing({ target: users.id });
};

const connect = () => {
  loadLocalEnv();
  const databaseUrl = requireEnv('DATABASE_URL');
  const supabaseUrl = requireEnv('SUPABASE_URL');
  [databaseUrl, supabaseUrl].forEach(assertLocalTarget);
  const admin = createClient(supabaseUrl, requireEnv('SUPABASE_SECRET_KEY'), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return { admin, ...createDb(databaseUrl) };
};

const main = async (): Promise<void> => {
  const { admin, db, close } = connect();
  try {
    let created = 0;
    for (const user of DEMO_USERS) {
      if (await ensureAuthUser(admin, user)) created += 1;
      await ensureProfile(db, user);
    }
    console.info(`Demo users present: ${DEMO_USERS.length}, created this run: ${created}.`);
  } finally {
    await close();
  }
};

await main();

-- The trigger writes entry_history, which has RLS. SECURITY DEFINER lets it write whatever role updates entries.
-- No role except the owner can call it directly.
CREATE OR REPLACE FUNCTION "public"."copy_entry_to_history"() RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO "public"."entry_history" (
    "entry_id", "version", "source_message_id", "source_tool_use_id", "user_id", "subject_id", "kind", "value",
    "original_words", "start_date", "start_precision", "start_time", "end_date", "end_time", "time_zone", "recorded_at"
  ) VALUES (
    NEW."id", NEW."version", NEW."source_message_id", NEW."source_tool_use_id", NEW."user_id", NEW."subject_id", NEW."kind", NEW."value",
    NEW."original_words", NEW."start_date", NEW."start_precision", NEW."start_time", NEW."end_date", NEW."end_time", NEW."time_zone", NEW."updated_at"
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION "public"."copy_entry_to_history"() FROM PUBLIC, "anon", "authenticated";
--> statement-breakpoint
-- The api connects as the table owner. The Supabase data API roles get no access to any table.
REVOKE ALL ON ALL TABLES IN SCHEMA "public" FROM "anon", "authenticated";
--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA "public" FROM "anon", "authenticated";
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON TABLES FROM "anon", "authenticated";
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON SEQUENCES FROM "anon", "authenticated";
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA "public" REVOKE ALL ON FUNCTIONS FROM PUBLIC, "anon", "authenticated";

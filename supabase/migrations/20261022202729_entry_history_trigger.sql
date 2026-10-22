-- Copies each insert and update of entries into entry_history. The only writer of entry_history.
-- ADR-003 keeps writers outside core out of the database. This trigger is an exception, because it makes no domain decision and only copies a row.
-- recorded_at comes from updated_at, so history time comes from the app clock and not from the database.
CREATE FUNCTION "public"."copy_entry_to_history"() RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  INSERT INTO "public"."entry_history" (
    "entry_id", "version", "tool_call_id", "user_id", "subject_id", "kind", "value", "original_words",
    "start_date", "start_precision", "start_time", "end_date", "end_time", "time_zone", "recorded_at"
  ) VALUES (
    NEW."id", NEW."version", NEW."tool_call_id", NEW."user_id", NEW."subject_id", NEW."kind", NEW."value", NEW."original_words",
    NEW."start_date", NEW."start_precision", NEW."start_time", NEW."end_date", NEW."end_time", NEW."time_zone", NEW."updated_at"
  );
  RETURN NULL;
END;
$$;
--> statement-breakpoint
CREATE TRIGGER "entries_copy_to_history"
AFTER INSERT OR UPDATE ON "public"."entries"
FOR EACH ROW EXECUTE FUNCTION "public"."copy_entry_to_history"();

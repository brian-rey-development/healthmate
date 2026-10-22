-- Replaces the copy function after tool_call_id became source_message_id and source_tool_use_id.
CREATE OR REPLACE FUNCTION "public"."copy_entry_to_history"() RETURNS trigger
LANGUAGE plpgsql
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

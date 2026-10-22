DROP VIEW "public"."timeline_entries";--> statement-breakpoint
ALTER TABLE "entries" DROP CONSTRAINT "entries_tool_call_id_tool_calls_id_fk";
--> statement-breakpoint
ALTER TABLE "entry_history" DROP CONSTRAINT "entry_history_tool_call_id_tool_calls_id_fk";
--> statement-breakpoint
ALTER TABLE "entries" DROP CONSTRAINT "entries_tool_call_id_unique";--> statement-breakpoint
ALTER TABLE "entry_history" DROP CONSTRAINT "entry_history_tool_call_id_unique";--> statement-breakpoint
ALTER TABLE "entries" DROP COLUMN "tool_call_id";--> statement-breakpoint
ALTER TABLE "entry_history" DROP COLUMN "tool_call_id";--> statement-breakpoint
DROP TABLE "tool_calls";--> statement-breakpoint
CREATE VIEW "public"."timeline_entries" WITH (security_invoker = true) AS (select "entries"."id", "entries"."user_id", "entries"."subject_id", "entries"."kind", "entries"."value", "entries"."original_words", "entries"."start_date", "entries"."start_precision", "entries"."start_time", "entries"."end_date", "entries"."end_time", "entries"."time_zone", "entries"."version", "entries"."created_at", "entries"."updated_at", "subjects"."name" as "subject_name" from "entries" left join "subjects" on "entries"."subject_id" = "subjects"."id");--> statement-breakpoint
DROP TYPE "public"."tool_call_maker";--> statement-breakpoint
DROP TYPE "public"."tool_call_status";
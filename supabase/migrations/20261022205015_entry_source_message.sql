DROP VIEW "public"."timeline_entries";--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "source_message_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "entries" ADD COLUMN "source_tool_use_id" text;--> statement-breakpoint
ALTER TABLE "entry_history" ADD COLUMN "source_message_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "entry_history" ADD COLUMN "source_tool_use_id" text;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_source_message_id_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_history" ADD CONSTRAINT "entry_history_source_message_id_messages_id_fk" FOREIGN KEY ("source_message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_source_unique" UNIQUE NULLS NOT DISTINCT("source_message_id","source_tool_use_id");--> statement-breakpoint
ALTER TABLE "entry_history" ADD CONSTRAINT "entry_history_source_unique" UNIQUE NULLS NOT DISTINCT("source_message_id","source_tool_use_id");--> statement-breakpoint
CREATE VIEW "public"."timeline_entries" WITH (security_invoker = true) AS (select "entries"."id", "entries"."user_id", "entries"."subject_id", "entries"."kind", "entries"."value", "entries"."original_words", "entries"."start_date", "entries"."start_precision", "entries"."start_time", "entries"."end_date", "entries"."end_time", "entries"."time_zone", "entries"."source_message_id", "entries"."source_tool_use_id", "entries"."version", "entries"."created_at", "entries"."updated_at", "subjects"."name" as "subject_name" from "entries" left join "subjects" on "entries"."subject_id" = "subjects"."id");
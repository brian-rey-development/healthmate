DROP VIEW "public"."timeline_entries";--> statement-breakpoint
DROP INDEX "entries_user_start_idx";--> statement-breakpoint
DROP INDEX "entries_user_subject_start_idx";--> statement-breakpoint
DROP INDEX "conversations_user_created_idx";--> statement-breakpoint
DROP INDEX "messages_conversation_created_idx";--> statement-breakpoint
DROP INDEX "citations_entry_version_idx";--> statement-breakpoint
ALTER TABLE "entries" ALTER COLUMN "version" DROP DEFAULT;--> statement-breakpoint
CREATE INDEX "entries_user_start_id_idx" ON "entries" USING btree ("user_id","start_date" DESC NULLS FIRST,"id");--> statement-breakpoint
CREATE INDEX "conversations_user_channel_created_idx" ON "conversations" USING btree ("user_id","channel","created_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_created_id_idx" ON "messages" USING btree ("conversation_id","created_at","id");
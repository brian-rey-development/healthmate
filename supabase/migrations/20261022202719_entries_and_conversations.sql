CREATE TYPE "public"."channel" AS ENUM('telegram', 'web');--> statement-breakpoint
CREATE TYPE "public"."date_precision" AS ENUM('day', 'month', 'year');--> statement-breakpoint
CREATE TYPE "public"."kind" AS ENUM('note', 'symptom');--> statement-breakpoint
CREATE TYPE "public"."message_role" AS ENUM('user', 'assistant', 'tool');--> statement-breakpoint
CREATE TYPE "public"."tool_call_maker" AS ENUM('agent', 'person');--> statement-breakpoint
CREATE TYPE "public"."tool_call_status" AS ENUM('pending', 'confirmed', 'discarded', 'expired', 'done');--> statement-breakpoint
CREATE TABLE "subjects" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"kind" "kind" NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "subjects_id_kind_unique" UNIQUE("id","kind"),
	CONSTRAINT "subjects_kind_not_note" CHECK ("subjects"."kind" <> 'note')
);
--> statement-breakpoint
ALTER TABLE "subjects" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "entries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"subject_id" uuid,
	"kind" "kind" NOT NULL,
	"value" jsonb NOT NULL,
	"original_words" text NOT NULL,
	"start_date" date NOT NULL,
	"start_precision" date_precision NOT NULL,
	"start_time" time,
	"end_date" date,
	"end_time" time,
	"time_zone" text NOT NULL,
	"tool_call_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "entries_tool_call_id_unique" UNIQUE("tool_call_id"),
	CONSTRAINT "entries_subject_matches_kind" CHECK (("entries"."kind" = 'note') = ("entries"."subject_id" is null)),
	CONSTRAINT "entries_version_positive" CHECK ("entries"."version" >= 1),
	CONSTRAINT "entries_start_time_needs_day" CHECK ("entries"."start_time" is null or "entries"."start_precision" = 'day'),
	CONSTRAINT "entries_end_time_needs_end_date" CHECK ("entries"."end_time" is null or "entries"."end_date" is not null),
	CONSTRAINT "entries_end_after_start" CHECK ("entries"."end_date" is null or "entries"."end_date" >= "entries"."start_date")
);
--> statement-breakpoint
ALTER TABLE "entries" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "entry_history" (
	"entry_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"tool_call_id" text NOT NULL,
	"user_id" uuid NOT NULL,
	"subject_id" uuid,
	"kind" "kind" NOT NULL,
	"value" jsonb NOT NULL,
	"original_words" text NOT NULL,
	"start_date" date NOT NULL,
	"start_precision" date_precision NOT NULL,
	"start_time" time,
	"end_date" date,
	"end_time" time,
	"time_zone" text NOT NULL,
	"recorded_at" timestamp with time zone NOT NULL,
	CONSTRAINT "entry_history_entry_id_version_pk" PRIMARY KEY("entry_id","version"),
	CONSTRAINT "entry_history_tool_call_id_unique" UNIQUE("tool_call_id")
);
--> statement-breakpoint
ALTER TABLE "entry_history" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"channel" "channel" NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "conversations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" "message_role" NOT NULL,
	"content" jsonb NOT NULL,
	"transcript" text,
	"model" text,
	"prompt_version" text,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "messages" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "tool_calls" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"message_id" uuid,
	"name" text NOT NULL,
	"input" jsonb NOT NULL,
	"status" "tool_call_status" NOT NULL,
	"made_by" "tool_call_maker" NOT NULL,
	"decided_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "tool_calls_decided_unless_pending" CHECK (("tool_calls"."status" = 'pending') = ("tool_calls"."decided_at" is null)),
	CONSTRAINT "tool_calls_agent_has_message" CHECK (("tool_calls"."made_by" = 'agent') = ("tool_calls"."message_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "tool_calls" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "citations" (
	"message_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"version" integer NOT NULL,
	CONSTRAINT "citations_message_id_entry_id_version_pk" PRIMARY KEY("message_id","entry_id","version")
);
--> statement-breakpoint
ALTER TABLE "citations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_tool_call_id_tool_calls_id_fk" FOREIGN KEY ("tool_call_id") REFERENCES "public"."tool_calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entries" ADD CONSTRAINT "entries_subject_kind_fk" FOREIGN KEY ("subject_id","kind") REFERENCES "public"."subjects"("id","kind") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_history" ADD CONSTRAINT "entry_history_entry_id_entries_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entries"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry_history" ADD CONSTRAINT "entry_history_tool_call_id_tool_calls_id_fk" FOREIGN KEY ("tool_call_id") REFERENCES "public"."tool_calls"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_calls" ADD CONSTRAINT "tool_calls_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_message_id_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."messages"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "citations" ADD CONSTRAINT "citations_entry_version_fk" FOREIGN KEY ("entry_id","version") REFERENCES "public"."entry_history"("entry_id","version") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_seed_name_unique" ON "subjects" USING btree ("kind",lower("name")) WHERE "subjects"."user_id" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "subjects_private_name_unique" ON "subjects" USING btree ("user_id","kind",lower("name")) WHERE "subjects"."user_id" is not null;--> statement-breakpoint
CREATE INDEX "subjects_name_trgm" ON "subjects" USING gin ("name" extensions.gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "entries_user_start_idx" ON "entries" USING btree ("user_id","start_date");--> statement-breakpoint
CREATE INDEX "entries_user_subject_start_idx" ON "entries" USING btree ("user_id","subject_id","start_date");--> statement-breakpoint
CREATE INDEX "conversations_user_created_idx" ON "conversations" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "messages_conversation_created_idx" ON "messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "tool_calls_message_idx" ON "tool_calls" USING btree ("message_id");--> statement-breakpoint
CREATE INDEX "tool_calls_pending_idx" ON "tool_calls" USING btree ("user_id","created_at") WHERE "tool_calls"."status" = 'pending';--> statement-breakpoint
CREATE INDEX "citations_entry_version_idx" ON "citations" USING btree ("entry_id","version");--> statement-breakpoint
CREATE VIEW "public"."timeline_entries" WITH (security_invoker = true) AS (select "entries"."id", "entries"."user_id", "entries"."subject_id", "entries"."kind", "entries"."value", "entries"."original_words", "entries"."start_date", "entries"."start_precision", "entries"."start_time", "entries"."end_date", "entries"."end_time", "entries"."time_zone", "entries"."tool_call_id", "entries"."version", "entries"."created_at", "entries"."updated_at", "subjects"."name" as "subject_name" from "entries" left join "subjects" on "entries"."subject_id" = "subjects"."id");
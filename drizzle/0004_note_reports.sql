CREATE TABLE "note_reports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_id" uuid NOT NULL,
	"member_id" text NOT NULL,
	"kind" text NOT NULL,
	"reason" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "note_reports_post_member_kind_key" UNIQUE("post_id","member_id","kind"),
	CONSTRAINT "note_reports_kind_check" CHECK ("note_reports"."kind" in ('report', 'appeal')),
	CONSTRAINT "note_reports_reason_check" CHECK ("note_reports"."reason" is null or char_length("note_reports"."reason") <= 2000)
);
--> statement-breakpoint
ALTER TABLE "note_reports" ADD CONSTRAINT "note_reports_post_id_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "note_reports" ADD CONSTRAINT "note_reports_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "note_reports_member_idx" ON "note_reports" USING btree ("member_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "note_reports_unnotified_idx" ON "note_reports" USING btree ("created_at") WHERE "note_reports"."notified_at" is null and "note_reports"."resolved_at" is null;
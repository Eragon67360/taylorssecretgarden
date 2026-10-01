-- Moderators: the Members who may handle reports and appeals in the app (#166).
-- No grant here: swiftter_app's default privileges (db/roles/swiftter_app.sql)
-- already give it SELECT, INSERT, UPDATE and DELETE on every table that
-- neondb_owner, who runs the migrations, creates in `public` (docs/adr/0008).
CREATE TABLE "moderators" (
	"member_id" text PRIMARY KEY NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"granted_by" text
);
--> statement-breakpoint
ALTER TABLE "moderators" ADD CONSTRAINT "moderators_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderators" ADD CONSTRAINT "moderators_granted_by_members_id_fk" FOREIGN KEY ("granted_by") REFERENCES "public"."members"("id") ON DELETE set null ON UPDATE no action;
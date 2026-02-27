CREATE TABLE "morphic_ai_model_config" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"search_mode" varchar(256) NOT NULL,
	"model_type" varchar(256) NOT NULL,
	"model_id" varchar(191) NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "morphic_ai_model_config" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "morphic_ai_models" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"provider_id" varchar(191) NOT NULL,
	"name" varchar(256) NOT NULL,
	"model_id" varchar(256) NOT NULL,
	"is_enabled" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "morphic_ai_models" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "morphic_ai_providers" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"name" varchar(256) NOT NULL,
	"type" varchar(256) DEFAULT 'openai' NOT NULL,
	"base_url" text,
	"api_key" text,
	"is_enabled" integer DEFAULT 1 NOT NULL,
	"status" varchar(256) DEFAULT 'disabled',
	"last_error" text,
	"last_checked_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp
);

ALTER TABLE "morphic_ai_providers" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "morphic_chats" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"user_id" varchar(255) NOT NULL,
	"visibility" varchar(256) DEFAULT 'private' NOT NULL
);

ALTER TABLE "morphic_chats" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "morphic_feedback" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"user_id" varchar(255),
	"sentiment" varchar(256) NOT NULL,
	"message" text NOT NULL,
	"page_url" text NOT NULL,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "morphic_feedback" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "morphic_messages" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"chat_id" varchar(191) NOT NULL,
	"role" varchar(256) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp,
	"metadata" jsonb
);

ALTER TABLE "morphic_messages" ENABLE ROW LEVEL SECURITY;

CREATE TABLE "morphic_parts" (
	"id" varchar(191) PRIMARY KEY NOT NULL,
	"message_id" varchar(191) NOT NULL,
	"order" integer NOT NULL,
	"type" varchar(256) NOT NULL,
	"text_text" text,
	"reasoning_text" text,
	"file_media_type" varchar(256),
	"file_filename" varchar(1024),
	"file_url" text,
	"source_url_source_id" varchar(256),
	"source_url_url" text,
	"source_url_title" text,
	"source_document_source_id" varchar(256),
	"source_document_media_type" varchar(256),
	"source_document_title" text,
	"source_document_filename" varchar(1024),
	"source_document_url" text,
	"source_document_snippet" text,
	"tool_tool_call_id" varchar(256),
	"tool_state" varchar(256),
	"tool_error_text" text,
	"tool_search_input" json,
	"tool_search_output" json,
	"tool_fetch_input" json,
	"tool_fetch_output" json,
	"tool_question_input" json,
	"tool_question_output" json,
	"tool_todoWrite_input" json,
	"tool_todoWrite_output" json,
	"tool_todoRead_input" json,
	"tool_todoRead_output" json,
	"tool_dynamic_input" json,
	"tool_dynamic_output" json,
	"tool_dynamic_name" varchar(256),
	"tool_dynamic_type" varchar(256),
	"data_prefix" varchar(256),
	"data_content" json,
	"data_id" varchar(256),
	"provider_metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL
);

ALTER TABLE "morphic_parts" ENABLE ROW LEVEL SECURITY;

ALTER TABLE "morphic_ai_model_config" ADD CONSTRAINT "morphic_ai_model_config_model_id_morphic_ai_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."morphic_ai_models"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "morphic_ai_models" ADD CONSTRAINT "morphic_ai_models_provider_id_morphic_ai_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."morphic_ai_providers"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "morphic_messages" ADD CONSTRAINT "morphic_messages_chat_id_morphic_chats_id_fk" FOREIGN KEY ("chat_id") REFERENCES "public"."morphic_chats"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "morphic_parts" ADD CONSTRAINT "morphic_parts_message_id_morphic_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."morphic_messages"("id") ON DELETE cascade ON UPDATE no action;

CREATE INDEX "morphic_ai_model_config_mode_type_idx" ON "morphic_ai_model_config" USING btree ("search_mode","model_type");
CREATE INDEX "morphic_chats_user_id_idx" ON "morphic_chats" USING btree ("user_id");
CREATE INDEX "morphic_chats_user_id_created_at_idx" ON "morphic_chats" USING btree ("user_id","created_at" DESC NULLS LAST);
CREATE INDEX "morphic_chats_created_at_idx" ON "morphic_chats" USING btree ("created_at" DESC NULLS LAST);
CREATE INDEX "morphic_chats_id_user_id_idx" ON "morphic_chats" USING btree ("id","user_id");
CREATE INDEX "morphic_feedback_user_id_idx" ON "morphic_feedback" USING btree ("user_id");
CREATE INDEX "morphic_feedback_created_at_idx" ON "morphic_feedback" USING btree ("created_at");
CREATE INDEX "morphic_messages_chat_id_idx" ON "morphic_messages" USING btree ("chat_id");
CREATE INDEX "morphic_messages_chat_id_created_at_idx" ON "morphic_messages" USING btree ("chat_id","created_at");
CREATE INDEX "morphic_parts_message_id_idx" ON "morphic_parts" USING btree ("message_id");
CREATE INDEX "morphic_parts_message_id_order_idx" ON "morphic_parts" USING btree ("message_id","order");

CREATE POLICY "admins_manage_morphic_model_config" ON "morphic_ai_model_config" AS PERMISSIVE FOR ALL TO public USING (current_setting('app.current_user_id', true) IS NOT NULL) WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL);
CREATE POLICY "admins_manage_morphic_models" ON "morphic_ai_models" AS PERMISSIVE FOR ALL TO public USING (current_setting('app.current_user_id', true) IS NOT NULL) WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL);
CREATE POLICY "admins_manage_morphic_providers" ON "morphic_ai_providers" AS PERMISSIVE FOR ALL TO public USING (current_setting('app.current_user_id', true) IS NOT NULL) WITH CHECK (current_setting('app.current_user_id', true) IS NOT NULL);
CREATE POLICY "users_manage_own_morphic_chats" ON "morphic_chats" AS PERMISSIVE FOR ALL TO public USING (user_id = current_setting('app.current_user_id', true)) WITH CHECK (user_id = current_setting('app.current_user_id', true));
CREATE POLICY "public_morphic_chats_readable" ON "morphic_chats" AS PERMISSIVE FOR SELECT TO public USING (visibility = 'public');
CREATE POLICY "anyone_can_insert_morphic_feedback" ON "morphic_feedback" AS PERMISSIVE FOR INSERT TO public WITH CHECK (true);

CREATE POLICY "users_manage_morphic_chat_messages" ON "morphic_messages" AS PERMISSIVE FOR ALL TO public USING (EXISTS (
        SELECT 1 FROM "morphic_chats"
        WHERE "morphic_chats".id = chat_id
        AND "morphic_chats".user_id = current_setting('app.current_user_id', true)
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "morphic_chats"
        WHERE "morphic_chats".id = chat_id
        AND "morphic_chats".user_id = current_setting('app.current_user_id', true)
      ));

CREATE POLICY "public_morphic_chat_messages_readable" ON "morphic_messages" AS PERMISSIVE FOR SELECT TO public USING (EXISTS (
        SELECT 1 FROM "morphic_chats"
        WHERE "morphic_chats".id = chat_id
        AND "morphic_chats".visibility = 'public'
      ));

CREATE POLICY "users_manage_morphic_message_parts" ON "morphic_parts" AS PERMISSIVE FOR ALL TO public USING (EXISTS (
        SELECT 1 FROM "morphic_messages"
        INNER JOIN "morphic_chats" ON "morphic_chats".id = "morphic_messages".chat_id
        WHERE "morphic_messages".id = message_id
        AND "morphic_chats".user_id = current_setting('app.current_user_id', true)
      )) WITH CHECK (EXISTS (
        SELECT 1 FROM "morphic_messages"
        INNER JOIN "morphic_chats" ON "morphic_chats".id = "morphic_messages".chat_id
        WHERE "morphic_messages".id = message_id
        AND "morphic_chats".user_id = current_setting('app.current_user_id', true)
      ));

CREATE POLICY "public_morphic_chat_parts_readable" ON "morphic_parts" AS PERMISSIVE FOR SELECT TO public USING (EXISTS (
        SELECT 1 FROM "morphic_messages"
        INNER JOIN "morphic_chats" ON "morphic_chats".id = "morphic_messages".chat_id
        WHERE "morphic_messages".id = message_id
        AND "morphic_chats".visibility = 'public'
      ));

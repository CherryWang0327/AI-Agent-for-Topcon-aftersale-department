/*
 Navicat Premium Dump SQL

 Source Server         : Agentic_AI_FP
 Source Server Type    : PostgreSQL
 Source Server Version : 180003 (180003)
 Source Host           : localhost:5432
 Source Catalog        : postgres
 Source Schema         : public

 Target Server Type    : PostgreSQL
 Target Server Version : 180003 (180003)
 File Encoding         : 65001

 Date: 17/03/2026 15:18:23
*/


-- ----------------------------
-- Table structure for info_record
-- ----------------------------
DROP TABLE IF EXISTS "public"."info_record";
CREATE TABLE "public"."info_record" (
  "id" int8 NOT NULL DEFAULT nextval('info_record_id_seq'::regclass),
  "language" varchar(50) COLLATE "pg_catalog"."default",
  "customer_name" varchar(255) COLLATE "pg_catalog"."default",
  "appointment_start" timestamp(6),
  "appointment_end" timestamp(6),
  "service_address" text COLLATE "pg_catalog"."default",
  "google_map_link" text COLLATE "pg_catalog"."default",
  "request_details" text COLLATE "pg_catalog"."default",
  "current_condition" text COLLATE "pg_catalog"."default",
  "contact_person" varchar(100) COLLATE "pg_catalog"."default",
  "contact_number" varchar(50) COLLATE "pg_catalog"."default",
  "is_confirmed" bool DEFAULT false,
  "equipment_prepared_by_tpt" text COLLATE "pg_catalog"."default",
  "equipment_handover_plan" text COLLATE "pg_catalog"."default",
  "issued_date" text COLLATE "pg_catalog"."default",
  "issued_by" text COLLATE "pg_catalog"."default",
  "sales_representative_participation" text COLLATE "pg_catalog"."default",
  "sales_channel" text COLLATE "pg_catalog"."default",
  "request_details_source_lang" varchar(5) COLLATE "pg_catalog"."default",
  "request_details_en" text COLLATE "pg_catalog"."default",
  "request_details_ja" text COLLATE "pg_catalog"."default",
  "request_details_th" text COLLATE "pg_catalog"."default",
  "current_condition_source_lang" varchar(5) COLLATE "pg_catalog"."default",
  "current_condition_en" text COLLATE "pg_catalog"."default",
  "current_condition_ja" text COLLATE "pg_catalog"."default",
  "current_condition_th" text COLLATE "pg_catalog"."default"
)
;

-- ----------------------------
-- Checks structure for table info_record
-- ----------------------------
ALTER TABLE "public"."info_record" ADD CONSTRAINT "chk_appointment_time" CHECK (appointment_end > appointment_start);

-- ----------------------------
-- Primary Key structure for table info_record
-- ----------------------------
ALTER TABLE "public"."info_record" ADD CONSTRAINT "info_record_pkey" PRIMARY KEY ("id");

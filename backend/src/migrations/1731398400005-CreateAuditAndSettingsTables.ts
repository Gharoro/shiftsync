import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditAndSettingsTables1731398400005 implements MigrationInterface {
  name = 'CreateAuditAndSettingsTables1731398400005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "entity_type" character varying NOT NULL,
        "entity_id" uuid NOT NULL,
        "location_id" uuid,
        "action" character varying NOT NULL,
        "before_state" jsonb,
        "after_state" jsonb,
        "performed_by" uuid NOT NULL,
        "performed_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id"),
        CONSTRAINT "FK_audit_logs_performed_by" FOREIGN KEY ("performed_by") REFERENCES "users"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "settings" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "location_id" uuid,
        "key" character varying NOT NULL,
        "value" character varying NOT NULL,
        "updated_by" uuid NOT NULL,
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_settings_location_key" UNIQUE ("location_id", "key"),
        CONSTRAINT "PK_settings" PRIMARY KEY ("id"),
        CONSTRAINT "FK_settings_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id"),
        CONSTRAINT "FK_settings_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "settings"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}

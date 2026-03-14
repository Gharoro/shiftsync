import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateStaffProfileTables1731398400001 implements MigrationInterface {
  name = 'CreateStaffProfileTables1731398400001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "staff_profiles" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "notes" text,
        CONSTRAINT "UQ_staff_profiles_user_id" UNIQUE ("user_id"),
        CONSTRAINT "PK_staff_profiles" PRIMARY KEY ("id"),
        CONSTRAINT "FK_staff_profiles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "staff_desired_hours_history" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "desired_hours" integer NOT NULL,
        "effective_from" date NOT NULL,
        "effective_to" date,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_staff_desired_hours_history" PRIMARY KEY ("id"),
        CONSTRAINT "FK_staff_desired_hours_history_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "staff_skills" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "skill_id" uuid NOT NULL,
        CONSTRAINT "UQ_staff_skills_user_skill" UNIQUE ("user_id", "skill_id"),
        CONSTRAINT "PK_staff_skills" PRIMARY KEY ("id"),
        CONSTRAINT "FK_staff_skills_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_staff_skills_skill" FOREIGN KEY ("skill_id") REFERENCES "skills"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "location_certifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "location_id" uuid NOT NULL,
        "certified_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "is_active" boolean NOT NULL DEFAULT true,
        CONSTRAINT "UQ_location_certifications_user_location" UNIQUE ("user_id", "location_id"),
        CONSTRAINT "PK_location_certifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_location_certifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_location_certifications_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "manager_locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "location_id" uuid NOT NULL,
        "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "assigned_by" uuid NOT NULL,
        CONSTRAINT "UQ_manager_locations_user_location" UNIQUE ("user_id", "location_id"),
        CONSTRAINT "PK_manager_locations" PRIMARY KEY ("id"),
        CONSTRAINT "FK_manager_locations_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_manager_locations_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id"),
        CONSTRAINT "FK_manager_locations_assigned_by" FOREIGN KEY ("assigned_by") REFERENCES "users"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "manager_locations"`);
    await queryRunner.query(`DROP TABLE "location_certifications"`);
    await queryRunner.query(`DROP TABLE "staff_skills"`);
    await queryRunner.query(`DROP TABLE "staff_desired_hours_history"`);
    await queryRunner.query(`DROP TABLE "staff_profiles"`);
  }
}

import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSchedulingTables1731398400003 implements MigrationInterface {
  name = 'CreateSchedulingTables1731398400003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "shifts_status_enum" AS ENUM ('DRAFT', 'PUBLISHED')
    `);
    await queryRunner.query(`
      CREATE TYPE "assignments_status_enum" AS ENUM ('ACTIVE', 'CANCELLED')
    `);
    await queryRunner.query(`
      CREATE TABLE "shifts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "location_id" uuid NOT NULL,
        "start_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "end_time" TIMESTAMP WITH TIME ZONE NOT NULL,
        "required_skill_id" uuid NOT NULL,
        "headcount_needed" integer NOT NULL DEFAULT 1,
        "is_premium" boolean NOT NULL DEFAULT false,
        "status" "shifts_status_enum" NOT NULL DEFAULT 'DRAFT',
        "created_by" uuid NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_shifts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_shifts_location" FOREIGN KEY ("location_id") REFERENCES "locations"("id"),
        CONSTRAINT "FK_shifts_skill" FOREIGN KEY ("required_skill_id") REFERENCES "skills"("id"),
        CONSTRAINT "FK_shifts_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "assignments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "shift_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "assigned_by" uuid NOT NULL,
        "assigned_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "status" "assignments_status_enum" NOT NULL DEFAULT 'ACTIVE',
        CONSTRAINT "UQ_assignments_shift_user" UNIQUE ("shift_id", "user_id"),
        CONSTRAINT "PK_assignments" PRIMARY KEY ("id"),
        CONSTRAINT "FK_assignments_shift" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id"),
        CONSTRAINT "FK_assignments_user" FOREIGN KEY ("user_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_assignments_assigned_by" FOREIGN KEY ("assigned_by") REFERENCES "users"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "assignments"`);
    await queryRunner.query(`DROP TABLE "shifts"`);
    await queryRunner.query(`DROP TYPE "assignments_status_enum"`);
    await queryRunner.query(`DROP TYPE "shifts_status_enum"`);
  }
}

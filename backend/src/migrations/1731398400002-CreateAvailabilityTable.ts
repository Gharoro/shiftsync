import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAvailabilityTable1731398400002 implements MigrationInterface {
  name = 'CreateAvailabilityTable1731398400002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "availability_windows" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "day_of_week" integer,
        "start_time" character varying NOT NULL,
        "end_time" character varying NOT NULL,
        "location_timezone" character varying NOT NULL,
        "is_recurring" boolean NOT NULL,
        "exception_date" date,
        "is_available" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_availability_windows" PRIMARY KEY ("id"),
        CONSTRAINT "FK_availability_windows_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "availability_windows"`);
  }
}

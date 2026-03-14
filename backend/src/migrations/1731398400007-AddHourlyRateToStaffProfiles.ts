import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddHourlyRateToStaffProfiles1731398400007 implements MigrationInterface {
  name = 'AddHourlyRateToStaffProfiles1731398400007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "staff_profiles"
      ADD COLUMN "hourly_rate" decimal(10,2) NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "staff_profiles"
      DROP COLUMN "hourly_rate"
    `);
  }
}

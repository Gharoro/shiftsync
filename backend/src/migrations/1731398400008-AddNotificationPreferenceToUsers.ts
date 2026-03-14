import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationPreferenceToUsers1731398400008 implements MigrationInterface {
  name = 'AddNotificationPreferenceToUsers1731398400008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "users_notification_preference_enum" AS ENUM ('IN_APP', 'IN_APP_AND_EMAIL')
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN "notification_preference" "users_notification_preference_enum" NOT NULL DEFAULT 'IN_APP'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN "notification_preference"
    `);
    await queryRunner.query(`DROP TYPE "users_notification_preference_enum"`);
  }
}

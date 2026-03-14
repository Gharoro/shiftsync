import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateWorkflowTables1731398400004 implements MigrationInterface {
  name = 'CreateWorkflowTables1731398400004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "swap_requests_status_enum" AS ENUM (
        'PENDING_STAFF', 'PENDING_MANAGER', 'APPROVED', 'REJECTED', 'CANCELLED', 'EXPIRED'
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "swap_requests" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "requester_id" uuid NOT NULL,
        "shift_id" uuid NOT NULL,
        "target_shift_id" uuid,
        "target_user_id" uuid,
        "status" "swap_requests_status_enum" NOT NULL DEFAULT 'PENDING_STAFF',
        "rejection_reason" text,
        "cancelled_by" uuid,
        "override_reason" text,
        "expires_at" TIMESTAMP WITH TIME ZONE NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_swap_requests" PRIMARY KEY ("id"),
        CONSTRAINT "FK_swap_requests_requester" FOREIGN KEY ("requester_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_swap_requests_shift" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id"),
        CONSTRAINT "FK_swap_requests_target_shift" FOREIGN KEY ("target_shift_id") REFERENCES "shifts"("id"),
        CONSTRAINT "FK_swap_requests_target_user" FOREIGN KEY ("target_user_id") REFERENCES "users"("id"),
        CONSTRAINT "FK_swap_requests_cancelled_by" FOREIGN KEY ("cancelled_by") REFERENCES "users"("id")
      )
    `);
    await queryRunner.query(`
      CREATE TABLE "notifications" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid NOT NULL,
        "title" character varying NOT NULL,
        "body" text NOT NULL,
        "type" character varying NOT NULL,
        "is_read" boolean NOT NULL DEFAULT false,
        "related_entity_type" character varying,
        "related_entity_id" uuid,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_notifications" PRIMARY KEY ("id"),
        CONSTRAINT "FK_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id")
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "notifications"`);
    await queryRunner.query(`DROP TABLE "swap_requests"`);
    await queryRunner.query(`DROP TYPE "swap_requests_status_enum"`);
  }
}

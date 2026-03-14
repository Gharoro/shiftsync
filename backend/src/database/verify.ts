import 'dotenv/config';
import { DataSource } from 'typeorm';
import type {
  RoleCount,
  ShiftStatusRow,
  MultiLocStaffRow,
  PremiumShiftRow,
  DesiredHoursRow,
} from './verify.types';

async function runVerify(): Promise<void> {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_NAME ?? 'shiftsync',
    synchronize: false,
    logging: false,
    ssl: true,
  });

  await dataSource.initialize();
  const qr = dataSource.createQueryRunner();
  await qr.connect();

  try {
    console.log('=== ShiftSync Verification Report ===\n');

    const usersByRole = (await qr.query(
      `SELECT role, COUNT(*) as count FROM users GROUP BY role ORDER BY role`,
    )) as RoleCount[];
    console.log('Users by role:');
    for (const r of usersByRole) {
      console.log(`  ${r.role}: ${r.count}`);
    }

    const locCount = (await qr.query(
      `SELECT COUNT(*) as count FROM locations`,
    )) as { count: string }[];
    console.log(`\nLocations: ${locCount[0].count}`);

    const skillCount = (await qr.query(
      `SELECT COUNT(*) as count FROM skills`,
    )) as { count: string }[];
    console.log(`Skills: ${skillCount[0].count}`);

    const shiftsByStatus = (await qr.query(
      `SELECT status, location_id, COUNT(*) as count FROM shifts GROUP BY status, location_id ORDER BY status, location_id`,
    )) as ShiftStatusRow[];
    console.log('\nShifts by status and location:');
    for (const r of shiftsByStatus) {
      console.log(`  ${r.status} @ ${r.location_id}: ${r.count}`);
    }

    const assignCount = (await qr.query(
      `SELECT COUNT(*) as count FROM assignments WHERE status = 'ACTIVE'`,
    )) as { count: string }[];
    console.log(`\nActive assignments: ${assignCount[0].count}`);

    const availCount = (await qr.query(
      `SELECT COUNT(*) as count FROM availability_windows`,
    )) as { count: string }[];
    console.log(`Availability windows: ${availCount[0].count}`);

    const settingsCount = (await qr.query(
      `SELECT COUNT(*) as count FROM settings`,
    )) as { count: string }[];
    console.log(`Settings: ${settingsCount[0].count}`);

    const multiLocStaff = (await qr.query(`
      SELECT u.id, u.full_name, COUNT(lc.location_id) as loc_count
      FROM users u
      JOIN location_certifications lc ON lc.user_id = u.id AND lc.is_active = true
      WHERE u.role = 'STAFF'
      GROUP BY u.id, u.full_name
      HAVING COUNT(lc.location_id) > 1
      ORDER BY loc_count DESC
    `)) as MultiLocStaffRow[];
    console.log('\nStaff certified at multiple locations:');
    for (const r of multiLocStaff) {
      console.log(`  ${r.full_name}: ${r.loc_count} locations`);
    }

    const premiumShifts = (await qr.query(`
      SELECT s.id, l.name as location_name, s.start_time, s.is_premium
      FROM shifts s
      JOIN locations l ON l.id = s.location_id
      WHERE s.is_premium = true
      ORDER BY s.start_time
    `)) as PremiumShiftRow[];
    console.log('\nPremium shifts:');
    for (const r of premiumShifts) {
      console.log(`  ${r.id} @ ${r.location_name}: ${String(r.start_time)}`);
    }

    const desiredHours = (await qr.query(`
      SELECT u.full_name, sdhh.desired_hours, sdhh.effective_from, sdhh.effective_to
      FROM staff_desired_hours_history sdhh
      JOIN users u ON u.id = sdhh.user_id
      ORDER BY u.full_name, sdhh.effective_from
    `)) as DesiredHoursRow[];
    console.log('\nDesired hours history per staff:');
    for (const r of desiredHours) {
      console.log(
        `  ${r.full_name}: ${r.desired_hours}h from ${String(r.effective_from)} to ${r.effective_to ?? 'current'}`,
      );
    }

    console.log('\n=== Verification complete ===');
  } catch (err) {
    console.error('Verify failed:', err);
    process.exit(1);
  } finally {
    await qr.release();
    await dataSource.destroy();
    process.exit(0);
  }
}

void runVerify();

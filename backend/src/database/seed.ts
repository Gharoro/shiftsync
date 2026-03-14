import 'dotenv/config';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { ShiftStatus } from '../common/enums/shift-status.enum';

const SKILL_BARTENDER = uuidv4();
const SKILL_LINE_COOK = uuidv4();
const SKILL_SERVER = uuidv4();
const SKILL_HOST = uuidv4();
const SKILL_SUPERVISOR = uuidv4();

const LOC_DOWNTOWN = uuidv4();
const LOC_MIDTOWN = uuidv4();
const LOC_WEST_SIDE = uuidv4();
const LOC_BEVERLY = uuidv4();

const USER_ADMIN = uuidv4();
const USER_MANAGER_1 = uuidv4();
const USER_MANAGER_2 = uuidv4();
const USER_STAFF_1 = uuidv4();
const USER_STAFF_2 = uuidv4();
const USER_STAFF_3 = uuidv4();
const USER_STAFF_4 = uuidv4();
const USER_STAFF_5 = uuidv4();
const USER_STAFF_6 = uuidv4();
const USER_STAFF_7 = uuidv4();
const USER_STAFF_8 = uuidv4();

const PASSWORD_HASH = bcrypt.hashSync('password123', 10);

async function runSeed(): Promise<void> {
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
    console.log('Clearing tables...');
    await qr.query('TRUNCATE TABLE settings CASCADE');
    await qr.query('TRUNCATE TABLE audit_logs CASCADE');
    await qr.query('TRUNCATE TABLE notifications CASCADE');
    await qr.query('TRUNCATE TABLE swap_requests CASCADE');
    await qr.query('TRUNCATE TABLE assignments CASCADE');
    await qr.query('TRUNCATE TABLE shifts CASCADE');
    await qr.query('TRUNCATE TABLE availability_windows CASCADE');
    await qr.query('TRUNCATE TABLE staff_desired_hours_history CASCADE');
    await qr.query('TRUNCATE TABLE staff_profiles CASCADE');
    await qr.query('TRUNCATE TABLE staff_skills CASCADE');
    await qr.query('TRUNCATE TABLE location_certifications CASCADE');
    await qr.query('TRUNCATE TABLE manager_locations CASCADE');
    await qr.query('TRUNCATE TABLE skills CASCADE');
    await qr.query('TRUNCATE TABLE locations CASCADE');
    await qr.query('TRUNCATE TABLE users CASCADE');

    console.log('Inserting skills...');
    await qr.query(
      `INSERT INTO skills (id, name) VALUES 
        ('${SKILL_BARTENDER}', 'bartender'),
        ('${SKILL_LINE_COOK}', 'line_cook'),
        ('${SKILL_SERVER}', 'server'),
        ('${SKILL_HOST}', 'host'),
        ('${SKILL_SUPERVISOR}', 'supervisor')`,
    );

    console.log('Inserting locations...');
    await qr.query(
      `INSERT INTO locations (id, name, address, timezone) VALUES 
        ('${LOC_DOWNTOWN}', 'Coastal Eats Downtown', '123 Main St', 'America/New_York'),
        ('${LOC_MIDTOWN}', 'Coastal Eats Midtown', '456 Park Ave', 'America/New_York'),
        ('${LOC_WEST_SIDE}', 'Coastal Eats West Side', '789 Sunset Blvd', 'America/Los_Angeles'),
        ('${LOC_BEVERLY}', 'Coastal Eats Beverly', '321 Rodeo Dr', 'America/Los_Angeles')`,
    );

    console.log('Inserting users...');
    await qr.query(
      `INSERT INTO users (id, email, password_hash, full_name, role) VALUES 
        ('${USER_ADMIN}', 'admin@coastaleats.com', '${PASSWORD_HASH}', 'Admin User', 'ADMIN'),
        ('${USER_MANAGER_1}', 'manager1@coastaleats.com', '${PASSWORD_HASH}', 'Manager One', 'MANAGER'),
        ('${USER_MANAGER_2}', 'manager2@coastaleats.com', '${PASSWORD_HASH}', 'Manager Two', 'MANAGER'),
        ('${USER_STAFF_1}', 'staff1@coastaleats.com', '${PASSWORD_HASH}', 'Staff Eastern One', 'STAFF'),
        ('${USER_STAFF_2}', 'staff2@coastaleats.com', '${PASSWORD_HASH}', 'Staff Eastern Two', 'STAFF'),
        ('${USER_STAFF_3}', 'staff3@coastaleats.com', '${PASSWORD_HASH}', 'Staff Pacific One', 'STAFF'),
        ('${USER_STAFF_4}', 'staff4@coastaleats.com', '${PASSWORD_HASH}', 'Staff Pacific Two', 'STAFF'),
        ('${USER_STAFF_5}', 'staff5@coastaleats.com', '${PASSWORD_HASH}', 'Staff All Locations One', 'STAFF'),
        ('${USER_STAFF_6}', 'staff6@coastaleats.com', '${PASSWORD_HASH}', 'Staff All Locations Two', 'STAFF'),
        ('${USER_STAFF_7}', 'staff7@coastaleats.com', '${PASSWORD_HASH}', 'Staff Single Host', 'STAFF'),
        ('${USER_STAFF_8}', 'staff8@coastaleats.com', '${PASSWORD_HASH}', 'Staff Single Line Cook', 'STAFF')`,
    );

    console.log('Inserting manager locations...');
    await qr.query(
      `INSERT INTO manager_locations (id, user_id, location_id, assigned_by) VALUES 
        ('${uuidv4()}', '${USER_MANAGER_1}', '${LOC_DOWNTOWN}', '${USER_ADMIN}'),
        ('${uuidv4()}', '${USER_MANAGER_1}', '${LOC_MIDTOWN}', '${USER_ADMIN}'),
        ('${uuidv4()}', '${USER_MANAGER_2}', '${LOC_WEST_SIDE}', '${USER_ADMIN}'),
        ('${uuidv4()}', '${USER_MANAGER_2}', '${LOC_BEVERLY}', '${USER_ADMIN}')`,
    );

    console.log('Inserting staff profiles...');
    const staffIds = [
      USER_STAFF_1,
      USER_STAFF_2,
      USER_STAFF_3,
      USER_STAFF_4,
      USER_STAFF_5,
      USER_STAFF_6,
      USER_STAFF_7,
      USER_STAFF_8,
    ];
    for (const uid of staffIds) {
      const hourlyRate = (12 + Math.random() * 23).toFixed(2);
      await qr.query(
        `INSERT INTO staff_profiles (id, user_id, hourly_rate) VALUES ('${uuidv4()}', '${uid}', ${hourlyRate})`,
      );
    }

    console.log('Inserting staff desired hours history...');
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().split('T')[0];
    for (const uid of staffIds) {
      const hours = 20 + Math.floor(Math.random() * 21);
      await qr.query(
        `INSERT INTO staff_desired_hours_history (id, user_id, desired_hours, effective_from, effective_to) VALUES 
          ('${uuidv4()}', '${uid}', ${hours}, '${thirtyDaysAgoStr}', NULL)`,
      );
    }

    console.log('Inserting staff skills...');
    await qr.query(
      `INSERT INTO staff_skills (id, user_id, skill_id) VALUES 
        ('${uuidv4()}', '${USER_STAFF_1}', '${SKILL_SERVER}'),
        ('${uuidv4()}', '${USER_STAFF_1}', '${SKILL_HOST}'),
        ('${uuidv4()}', '${USER_STAFF_2}', '${SKILL_SERVER}'),
        ('${uuidv4()}', '${USER_STAFF_2}', '${SKILL_HOST}'),
        ('${uuidv4()}', '${USER_STAFF_3}', '${SKILL_BARTENDER}'),
        ('${uuidv4()}', '${USER_STAFF_3}', '${SKILL_LINE_COOK}'),
        ('${uuidv4()}', '${USER_STAFF_4}', '${SKILL_BARTENDER}'),
        ('${uuidv4()}', '${USER_STAFF_4}', '${SKILL_LINE_COOK}'),
        ('${uuidv4()}', '${USER_STAFF_5}', '${SKILL_SERVER}'),
        ('${uuidv4()}', '${USER_STAFF_5}', '${SKILL_BARTENDER}'),
        ('${uuidv4()}', '${USER_STAFF_5}', '${SKILL_SUPERVISOR}'),
        ('${uuidv4()}', '${USER_STAFF_6}', '${SKILL_SERVER}'),
        ('${uuidv4()}', '${USER_STAFF_6}', '${SKILL_BARTENDER}'),
        ('${uuidv4()}', '${USER_STAFF_6}', '${SKILL_SUPERVISOR}'),
        ('${uuidv4()}', '${USER_STAFF_7}', '${SKILL_HOST}'),
        ('${uuidv4()}', '${USER_STAFF_8}', '${SKILL_LINE_COOK}')`,
    );

    console.log('Inserting location certifications...');
    await qr.query(
      `INSERT INTO location_certifications (id, user_id, location_id) VALUES 
        ('${uuidv4()}', '${USER_STAFF_1}', '${LOC_DOWNTOWN}'),
        ('${uuidv4()}', '${USER_STAFF_1}', '${LOC_MIDTOWN}'),
        ('${uuidv4()}', '${USER_STAFF_2}', '${LOC_DOWNTOWN}'),
        ('${uuidv4()}', '${USER_STAFF_2}', '${LOC_MIDTOWN}'),
        ('${uuidv4()}', '${USER_STAFF_3}', '${LOC_WEST_SIDE}'),
        ('${uuidv4()}', '${USER_STAFF_3}', '${LOC_BEVERLY}'),
        ('${uuidv4()}', '${USER_STAFF_4}', '${LOC_WEST_SIDE}'),
        ('${uuidv4()}', '${USER_STAFF_4}', '${LOC_BEVERLY}'),
        ('${uuidv4()}', '${USER_STAFF_5}', '${LOC_DOWNTOWN}'),
        ('${uuidv4()}', '${USER_STAFF_5}', '${LOC_MIDTOWN}'),
        ('${uuidv4()}', '${USER_STAFF_5}', '${LOC_WEST_SIDE}'),
        ('${uuidv4()}', '${USER_STAFF_5}', '${LOC_BEVERLY}'),
        ('${uuidv4()}', '${USER_STAFF_6}', '${LOC_DOWNTOWN}'),
        ('${uuidv4()}', '${USER_STAFF_6}', '${LOC_MIDTOWN}'),
        ('${uuidv4()}', '${USER_STAFF_6}', '${LOC_WEST_SIDE}'),
        ('${uuidv4()}', '${USER_STAFF_6}', '${LOC_BEVERLY}'),
        ('${uuidv4()}', '${USER_STAFF_7}', '${LOC_DOWNTOWN}'),
        ('${uuidv4()}', '${USER_STAFF_8}', '${LOC_WEST_SIDE}')`,
    );

    console.log('Inserting availability windows...');
    const days = [0, 1, 2, 3, 4, 5, 6];
    const timeSlots = [
      ['08:00', '16:00'],
      ['14:00', '22:00'],
      ['09:00', '17:00'],
      ['16:00', '00:00'],
      ['10:00', '18:00'],
    ];
    for (let i = 0; i < staffIds.length; i++) {
      const uid = staffIds[i];
      const tz = i < 4 ? 'America/New_York' : 'America/Los_Angeles';
      const staffDays = days.slice(0, 5 + (i % 2));
      for (const day of staffDays) {
        const [start, end] = timeSlots[i % timeSlots.length];
        await qr.query(
          `INSERT INTO availability_windows (id, user_id, day_of_week, start_time, end_time, location_timezone, is_recurring, exception_date, is_available) VALUES 
            ('${uuidv4()}', '${uid}', ${day}, '${start}', '${end}', '${tz}', true, NULL, true)`,
        );
      }
    }
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const inWeek = new Date();
    inWeek.setDate(inWeek.getDate() + 7);
    await qr.query(
      `INSERT INTO availability_windows (id, user_id, day_of_week, start_time, end_time, location_timezone, is_recurring, exception_date, is_available) VALUES 
        ('${uuidv4()}', '${USER_STAFF_1}', NULL, '08:00', '16:00', 'America/New_York', false, '${tomorrow.toISOString().split('T')[0]}', false),
        ('${uuidv4()}', '${USER_STAFF_3}', NULL, '14:00', '22:00', 'America/Los_Angeles', false, '${inWeek.toISOString().split('T')[0]}', false)`,
    );

    console.log('Inserting shifts...');
    const shiftIds: string[] = [];
    const locs = [LOC_DOWNTOWN, LOC_MIDTOWN, LOC_WEST_SIDE, LOC_BEVERLY];
    const skillList = [
      SKILL_SERVER,
      SKILL_BARTENDER,
      SKILL_LINE_COOK,
      SKILL_HOST,
      SKILL_SUPERVISOR,
    ];
    for (let d = 0; d < 14; d++) {
      const date = new Date();
      date.setDate(date.getDate() + d);
      const dayOfWeek = date.getDay();
      const isFriSat = dayOfWeek === 5 || dayOfWeek === 6;
      for (let s = 0; s < 2; s++) {
        const loc = locs[d % 4];
        const skill = skillList[s % 5];
        const start = new Date(date);
        start.setHours(14 + s * 4, 0, 0, 0);
        const end = new Date(start);
        end.setHours(end.getHours() + 8, 0, 0, 0);
        const isPremium = isFriSat && start.getHours() >= 16;
        const status = d % 3 === 0 ? ShiftStatus.DRAFT : ShiftStatus.PUBLISHED;
        const id = uuidv4();
        shiftIds.push(id);
        await qr.query(
          `INSERT INTO shifts (id, location_id, start_time, end_time, required_skill_id, headcount_needed, is_premium, status, created_by) VALUES 
            ('${id}', '${loc}', '${start.toISOString()}', '${end.toISOString()}', '${skill}', 1, ${isPremium}, '${status}', '${USER_MANAGER_1}')`,
        );
      }
    }
    for (let i = 0; i < 6; i++) {
      const date = new Date();
      date.setDate(date.getDate() + (i % 2 === 0 ? 5 : 6));
      const start = new Date(date);
      start.setHours(18, 0, 0, 0);
      const end = new Date(start);
      end.setHours(2, 0, 0, 0);
      end.setDate(end.getDate() + 1);
      const id = uuidv4();
      shiftIds.push(id);
      await qr.query(
        `INSERT INTO shifts (id, location_id, start_time, end_time, required_skill_id, headcount_needed, is_premium, status, created_by) VALUES 
          ('${id}', '${locs[i % 4]}', '${start.toISOString()}', '${end.toISOString()}', '${skillList[i % 5]}', 1, true, '${i % 2 === 0 ? ShiftStatus.DRAFT : ShiftStatus.PUBLISHED}', '${USER_MANAGER_1}')`,
      );
    }

    console.log('Inserting assignments...');
    const certifiedStaffByLoc: Record<string, string[]> = {
      [LOC_DOWNTOWN]: [
        USER_STAFF_1,
        USER_STAFF_2,
        USER_STAFF_5,
        USER_STAFF_6,
        USER_STAFF_7,
      ],
      [LOC_MIDTOWN]: [USER_STAFF_1, USER_STAFF_2, USER_STAFF_5, USER_STAFF_6],
      [LOC_WEST_SIDE]: [
        USER_STAFF_3,
        USER_STAFF_4,
        USER_STAFF_5,
        USER_STAFF_6,
        USER_STAFF_8,
      ],
      [LOC_BEVERLY]: [USER_STAFF_3, USER_STAFF_4, USER_STAFF_5, USER_STAFF_6],
    };
    const staffSkillsMap: Record<string, string[]> = {
      [USER_STAFF_1]: [SKILL_SERVER, SKILL_HOST],
      [USER_STAFF_2]: [SKILL_SERVER, SKILL_HOST],
      [USER_STAFF_3]: [SKILL_BARTENDER, SKILL_LINE_COOK],
      [USER_STAFF_4]: [SKILL_BARTENDER, SKILL_LINE_COOK],
      [USER_STAFF_5]: [SKILL_SERVER, SKILL_BARTENDER, SKILL_SUPERVISOR],
      [USER_STAFF_6]: [SKILL_SERVER, SKILL_BARTENDER, SKILL_SUPERVISOR],
      [USER_STAFF_7]: [SKILL_HOST],
      [USER_STAFF_8]: [SKILL_LINE_COOK],
    };
    const shiftData: { id: string; locationId: string; skillId: string }[] = [];
    for (const id of shiftIds.slice(0, 12)) {
      const result = (await qr.query(
        `SELECT location_id, required_skill_id FROM shifts WHERE id = '${id}'`,
      )) as { location_id: string; required_skill_id: string }[];
      const row = result[0];
      if (row) {
        shiftData.push({
          id,
          locationId: row.location_id,
          skillId: row.required_skill_id,
        });
      }
    }
    let assigned = 0;
    for (const sd of shiftData) {
      const candidates = certifiedStaffByLoc[sd.locationId] || [];
      for (const staffId of candidates) {
        if (assigned >= 10) break;
        const hasSkill = (staffSkillsMap[staffId] || []).includes(sd.skillId);
        if (hasSkill) {
          await qr.query(
            `INSERT INTO assignments (id, shift_id, user_id, assigned_by, status) VALUES 
              ('${uuidv4()}', '${sd.id}', '${staffId}', '${USER_MANAGER_1}', 'ACTIVE')`,
          );
          assigned++;
          break;
        }
      }
    }

    console.log('Inserting settings...');
    const settings = [
      ['schedule_edit_cutoff_hours', '48'],
      ['week_start_day', '0'],
      ['daily_hours_warning_threshold', '8'],
      ['daily_hours_hard_block', '12'],
      ['weekly_hours_warning_threshold', '35'],
      ['weekly_hours_hard_block', '40'],
      ['consecutive_days_warning', '6'],
      ['consecutive_days_hard_block', '7'],
      ['max_pending_swap_requests', '3'],
      ['drop_request_expiry_hours', '24'],
    ];
    for (const [key, value] of settings) {
      await qr.query(
        `INSERT INTO settings (id, location_id, key, value, updated_by) VALUES 
          ('${uuidv4()}', NULL, '${key}', '${value}', '${USER_ADMIN}')`,
      );
    }

    console.log('Seed completed successfully.');
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  } finally {
    await qr.release();
    await dataSource.destroy();
    process.exit(0);
  }
}

void runSeed();

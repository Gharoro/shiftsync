# ShiftSync Brief Documentation

## Overview

ShiftSync is a multi-location staff scheduling platform built for Coastal Eats, a restaurant group operating 4 locations across 2 time zones. It handles shift scheduling, staff assignments, swap/drop workflows, overtime tracking, and fairness analytics.

---

## Getting Started

### Backend

```bash
cd shiftsync-backend
cp .env.example .env
npm install
npm run migration:run
npm run seed
npm run start:dev
```

Backend runs on `http://localhost:7070` or any port you set in your .env

### Frontend

```bash
cd shiftsync-frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:5173`

---

## Test Accounts

All accounts use the default password: `Password1234!`

## Visit `http://localhost:5173/test-accounts` to see all accounts with their full details including assigned locations and skills.

## Locations

| Name                   | Timezone            |
| ---------------------- | ------------------- |
| Coastal Eats Downtown  | America/New_York    |
| Coastal Eats Midtown   | America/New_York    |
| Coastal Eats West Side | America/Los_Angeles |
| Coastal Eats Beverly   | America/Los_Angeles |

---

## Features by Role

### Admin

- Create, update, and deactivate all users
- View and edit all global and location-specific settings
- View and export audit logs for any date range and location
- Full visibility across all locations

### Manager

- Create, edit, publish, and unpublish shifts at assigned locations
- Assign and unassign staff to shifts with full constraint validation
- Preview assignment impact before committing
- Approve or reject swap and drop requests
- View weekly overtime dashboard per location
- View fairness analytics and premium shift distribution
- View live on-duty dashboard

### Staff

- View published schedule across all certified locations
- Request shift swaps with specific colleagues
- Create drop requests to offer shifts for grabs
- Browse and claim available drop requests
- View and manage notifications

---

## Configurable Settings

The following settings can be adjusted by an Admin via the Settings page. Defaults are shown:

| Key                            | Default    | Description                                                    |
| ------------------------------ | ---------- | -------------------------------------------------------------- |
| schedule_edit_cutoff_hours     | 48         | Hours before shift start that a published shift becomes locked |
| week_start_day                 | 0 (Sunday) | Day the work week begins                                       |
| daily_hours_warning_threshold  | 8          | Daily hours that trigger a warning                             |
| daily_hours_hard_block         | 12         | Daily hours that block assignment                              |
| weekly_hours_warning_threshold | 35         | Weekly hours that trigger a warning                            |
| weekly_hours_hard_block        | 40         | Weekly hours that block assignment                             |
| consecutive_days_warning       | 6          | Consecutive days that trigger a warning                        |
| consecutive_days_hard_block    | 7          | Consecutive days that require manager override                 |
| max_pending_swap_requests      | 3          | Maximum pending swap/drop requests per staff member            |
| drop_request_expiry_hours      | 24         | Hours before shift start that an unclaimed drop expires        |

---

## Intentional Ambiguities — Documented Decisions

**1. What happens to historical data when a staff member is de-certified from a location?**
De-certification sets `is_active` to false on the LocationCertification record. All historical assignments for that location are preserved untouched, they are an accurate record of work that actually happened. The staff member cannot be assigned to new shifts at that location going forward. If re-certified later, a new LocationCertification record is created preserving the gap in history.

**2. How should "desired hours" interact with availability windows?**
They are independent concepts and do not override each other. Availability windows define when a staff member can work. Desired hours define how much they want to work. The system warns but never blocks based on desired hours alone. The fairness analytics surface the variance between desired and actual hours so managers can make informed decisions.

**3. When calculating consecutive days, does a 1-hour shift count the same as an 11-hour shift?**
Yes. Any shift of any duration on a calendar day counts as a day worked. The consecutive days rule exists to protect staff from fatigue across days, not within a single day, that concern is already covered by the daily hours hard block. Introducing hour thresholds for consecutive day counting would create unpredictable behaviour.

**4. If a shift is edited after swap approval but before it occurs, what should happen?**
The swap has already been approved and assignments already updated. The edit applies to the shift with its new assignments. Both newly assigned staff members are notified of the change. The swap is not reversed, reversing an approved swap requires separate managerial action. This mirrors how a real workplace handles it.

**5. How should the system handle a location that spans a timezone boundary?**
The system assigns exactly one IANA timezone per location. A restaurant operates on one timezone regardless of where its state line sits. The assigned timezone reflects where the majority of staff report and where the operational day is defined. A location physically straddling a timezone boundary must have its timezone manually confirmed by the admin at setup time.

---

## Known Limitations

- **No email delivery** — notifications are in-app only. Email notification preference is stored but emails are not sent. Given more time this would integrate a mail provider such as SendGrid.
- **No password reset** — all created users default to `Password1234!` as their initial password. Given more time this would be replaced with a proper onboarding flow including email invites and a password reset mechanism.
- **No mobile optimization** — the UI is built for desktop browsers. A responsive mobile layout would be implemented given more time.
- **No file upload** — staff profile photos and document uploads are not supported.
- **Single timezone per location** — locations that physically span a timezone boundary must be manually assigned one timezone by the admin. The system does not handle split-timezone locations automatically.
- **Overtime cost calculation assumes straight time** — regular hours are calculated at 1x the hourly rate and overtime hours at 1.5x. Local labor laws may vary and are not accounted for beyond the configurable thresholds.
- **No pagination** — all list endpoints return full result sets. For large datasets pagination would be required in production.
- **Cron job granularity** — drop request expiry runs every 15 minutes. In production this would run more frequently or be triggered by an event-driven mechanism.

---

## Assumptions

- All users are created by an Admin. There is no public self-registration.
- A manager can be assigned to one or more locations but cannot self-assign to locations.
- Staff desired hours are set at the time of account creation and tracked historically. Changes to desired hours create a new history record with an effective date.
- Premium shifts are defined as Friday and Saturday evening shifts. Managers can also manually flag any shift as premium.
- The work week begins on Sunday by default and is configurable via settings.
- Hourly rates are optional. Overtime cost projections show null for staff without a rate configured.
- Swap requests between staff at different locations are supported as long as both parties pass all constraint checks for the new shift.

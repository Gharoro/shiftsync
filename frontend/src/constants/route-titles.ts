export const ROUTE_TITLES: Record<string, string> = {
  '/admin': 'Admin',
  '/admin/users': 'Users',
  '/admin/settings': 'Settings',
  '/admin/audit-log': 'Audit Log',
  '/manager': 'Manager',
  '/manager/schedule': 'Schedule',
  '/manager/swap-approvals': 'Swap Approvals',
  '/manager/overtime': 'Overtime',
  '/manager/fairness': 'Fairness',
  '/manager/on-duty': 'On Duty',
  '/staff': 'Staff',
  '/staff/schedule': 'My Schedule',
  '/staff/swap-requests': 'Swap Requests',
  '/staff/drops': 'Available Drops',
};

export function getPageTitle(pathname: string): string {
  return ROUTE_TITLES[pathname] ?? pathname.split('/').filter(Boolean).pop() ?? 'ShiftSync';
}

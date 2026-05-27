import type { User } from './types';

/** Matches admin `userType`: 0 = general client, 1 = accountant. */
export const USER_TYPE_GENERAL_CLIENT = 0;
export const USER_TYPE_ACCOUNTANT = 1;

/**
 * Whether Reports should show the client picker dropdown.
 * - Accountant portal: user.role === 'accountant'
 * - Client portal: user.role === 'client' but backend marks them as accountant (userType 1 or isAccountant)
 */
export function canSelectReportClient(user: User | null | undefined): boolean {
  if (!user) return false;
  if (user.role === 'accountant') return true;
  if (user.role === 'client') {
    if (user.isAccountant === true) return true;
    if (user.userType === USER_TYPE_ACCOUNTANT) return true;
    return false;
  }
  return false;
}

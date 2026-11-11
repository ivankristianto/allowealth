/** The inferred session user type drops plugin fields, so read the twoFactor plugin's flag by key. */
export function isTwoFactorEnabled(user: object | null | undefined): boolean {
  return user != null && 'twoFactorEnabled' in user && Boolean(user.twoFactorEnabled);
}

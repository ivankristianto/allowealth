# Profile Page UX Polish - Manual Test Plan

**PR:** #262
**Branch:** `ux-profile`
**Date:** 2026-02-22

## Overview

Four UX polish changes on `/profile`: removal of the unused Short Bio field, centering the avatar above the form, adding a phone number format hint, and adding an icon+subtitle heading to the password change card. Tests verify the visual layout, field removal, form submission without bio, and heading consistency.

## Prerequisites

- Local dev server running at `http://localhost:4323`
- Test credentials: `demo@example.com` / `demo123456789`
- Seed data loaded (demo user exists with profile data)

---

## Test Steps

### 1. Bio Field Removal

**Services under test:** UserMetaService (`getUserSettings`), Profile API (`GET /api/user/profile`, `PUT /api/user/profile`)

> **Critical:** Removing a field from the form and API. Must verify no regression in other profile fields.

| Step | Action                                                                         | Expected Result                                                                                 |
| ---- | ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| 1.1  | Navigate to `http://localhost:4323/profile` and log in                         | Profile page loads successfully                                                                 |
| 1.2  | Scan the "Public Profile" card for a "Short Bio" label or textarea             | No "Short Bio" label or textarea is present anywhere on the page                                |
| 1.3  | Open browser DevTools Network tab, reload the page                             | `GET /api/user/profile` response JSON does NOT contain a `bio` field                            |
| 1.4  | Change the Full Name field to "Test Name Update", click "Save Profile Changes" | Toast shows "Profile updated successfully!", request body in Network tab does NOT contain `bio` |
| 1.5  | Reload the page                                                                | Name shows "Test Name Update" (change persisted), still no bio field                            |
| 1.6  | Restore the original name, click "Save Profile Changes"                        | Toast confirms success, name restored                                                           |

### 2. Avatar Layout - Centered Above Form

**Components under test:** `ManageAccountForms.astro`

| Step | Action                                                                           | Expected Result                                                                          |
| ---- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| 2.1  | On `/profile`, observe the avatar (circular initials) position                   | Avatar is horizontally centered within the card, ABOVE the form fields (not to the left) |
| 2.2  | Check that "Change Photo" link appears below the avatar circle                   | "Change Photo" is centered below the avatar                                              |
| 2.3  | Verify Full Name, Email, and Phone Number fields are full-width below the avatar | All form fields span the full width of the card (no side-by-side with avatar)            |
| 2.4  | Resize browser to mobile width (375px)                                           | Avatar remains centered, form fields stack naturally, no horizontal overflow             |
| 2.5  | Resize browser to tablet width (768px)                                           | Layout still centered, fields full-width                                                 |
| 2.6  | Resize browser back to desktop (1280px+)                                         | Layout unchanged — avatar centered, fields full-width below                              |

### 3. Phone Number Format Hint

**Components under test:** `ManageAccountForms.astro`

| Step | Action                                                                    | Expected Result                                                              |
| ---- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| 3.1  | On `/profile`, locate the Phone Number field                              | Field is visible with existing value or empty                                |
| 3.2  | Check for helper text below the Phone Number input                        | Text reads "Include country code, e.g. +62 812 3456 7890" in small gray text |
| 3.3  | Compare hint style with the Email field's helper text                     | Both use the same text size, color, and spacing (consistent styling)         |
| 3.4  | Enter a phone number like "+1 555 123 4567", click "Save Profile Changes" | Profile saves successfully (no validation error — hint only, no enforcement) |
| 3.5  | Reload the page                                                           | Phone number persists as entered                                             |

### 4. Password Card Heading Consistency

**Components under test:** `PasswordChangeForm.astro`

| Step | Action                                                            | Expected Result                                                                                                                                             |
| ---- | ----------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1  | On `/profile`, scroll to the "Change Password" section            | Card is visible below the profile card                                                                                                                      |
| 4.2  | Check the heading area of the password card                       | Shows a Lock icon badge (same style as the User icon in the profile card) followed by "Change Password" title and "Security" subtitle in uppercase tracking |
| 4.3  | Compare the heading layout with the "Public Profile" card heading | Both cards use the same pattern: colored icon badge on left, title + uppercase subtitle on right                                                            |
| 4.4  | Verify the description text is still present                      | "Update your password. You'll need to enter your current password to make changes." appears below the heading                                               |
| 4.5  | Enter valid current and new passwords, submit the form            | Password change still works correctly (heading change didn't break form functionality)                                                                      |

### 5. Profile Form Functional Regression

**Services under test:** Profile API (`PUT /api/user/profile`), UserService (`updateProfile`)

> **Critical:** Ensure remaining fields (name, email, phone) still save correctly after bio removal.

| Step | Action                                               | Expected Result                                              |
| ---- | ---------------------------------------------------- | ------------------------------------------------------------ |
| 5.1  | On `/profile`, change Full Name to "Regression Test" | Field updates                                                |
| 5.2  | Change Phone Number to "+62 999 888 7777"            | Field updates                                                |
| 5.3  | Click "Save Profile Changes"                         | Toast shows "Profile updated successfully!"                  |
| 5.4  | Reload the page                                      | Name shows "Regression Test", phone shows "+62 999 888 7777" |
| 5.5  | Restore original values and save                     | Original values restored successfully                        |

---

## Summary Checklist

| #   | Area             | Key Assertion                                                | Pass |
| --- | ---------------- | ------------------------------------------------------------ | ---- |
| 1   | Bio Removal      | No bio field in UI or API responses                          | [ ]  |
| 2   | Avatar Layout    | Avatar centered above full-width form fields                 | [ ]  |
| 3   | Phone Hint       | Format hint text visible below phone input                   | [ ]  |
| 4   | Password Heading | Lock icon + "Security" subtitle matches profile card pattern | [ ]  |
| 5   | Regression       | Name, email, phone still save and persist correctly          | [ ]  |

**Critical paths:** Steps 1 and 5 are highest priority (data integrity after field removal).

## Automated Test Coverage

| Suite                    | Tests | File                                                  |
| ------------------------ | ----- | ----------------------------------------------------- |
| Profile API email change | 3     | `src/__tests__/api/user/profile-email-change.test.ts` |
| User Meta Service        | ~15   | `src/services/user-meta.service.test.ts`              |

Tests will be updated in Task 6 of the implementation plan to remove `bio` references.

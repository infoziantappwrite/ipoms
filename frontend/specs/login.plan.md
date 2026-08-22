# Login Flow Test Plan

## Application Overview

`/login` is iPOMS's single entry point for staff sign-in (Module 01/08). It's
an email+password form (email auto-completes to `@infoziant.com`), a
"remember this device for 30 days" checkbox, and a "Forgot password?" link.
Auth is enforced server-side with three gates worth testing at the UI level:
malformed/wrong-domain email is rejected before any DB lookup, an unknown
email returns a direct "no account" message (internal tool — enumeration is
an accepted trade-off, see `CLAUDE.md` §2), and 3 consecutive wrong
passwords are allowed before the 4th locks the account and — for a
non-admin coordinator — auto-triggers an email OTP unlock flow, swapping the
login form for a 6-digit code entry screen. Each test below creates its own
disposable `@infoziant.com` coordinator via the public signup endpoint (see
`tests/helpers.ts`) so failed-attempt/lockout tests never collide with each
other or risk locking a real staff account.

## Test Scenarios

### 1. Sign-in

**Seed:** `tests/seed.spec.ts`

#### 1.1. successful-login-redirects-to-dashboard

**File:** `tests/login/successful-login-redirects-to-dashboard.spec.ts`

**Steps:**
  1. Create a fresh test coordinator account via the signup API.
  2. Type the account's email into "Official Email Address".
  3. Type the account's password into "Password".
  4. Click "Sign-In".
    - expect: page navigates to `/dashboard`
    - expect: a "Good evening" (or similar time-of-day) greeting heading is visible, containing the account's first name

#### 1.2. wrong-password-shows-attempts-remaining

**File:** `tests/login/wrong-password-shows-attempts-remaining.spec.ts`

**Steps:**
  1. Create a fresh test coordinator account via the signup API.
  2. Type the account's email into "Official Email Address".
  3. Type an incorrect password into "Password".
  4. Click "Sign-In".
    - expect: page stays on `/login`
    - expect: an alert reading "Incorrect password. 2 attempts remaining before your account is locked." is visible

#### 1.3. unknown-email-shows-no-account-message

**File:** `tests/login/unknown-email-shows-no-account-message.spec.ts`

**Steps:**
  1. Type a syntactically valid but non-existent `@infoziant.com` address into "Official Email Address".
  2. Type any password into "Password".
  3. Click "Sign-In".
    - expect: an alert reading "No iPOMS account exists for this email address." is visible

#### 1.4. wrong-domain-email-is-rejected

**File:** `tests/login/wrong-domain-email-is-rejected.spec.ts`

**Steps:**
  1. Type an email at a non-Infoziant domain (e.g. `someone@gmail.com`) into "Official Email Address".
  2. Type any password into "Password".
  3. Click "Sign-In".
    - expect: an alert reading "Use your Infoziant address — it must end in @infoziant.com." is visible

#### 1.5. account-locks-after-four-failed-attempts

**File:** `tests/login/account-locks-after-four-failed-attempts.spec.ts`

**Steps:**
  1. Create a fresh test coordinator account via the signup API.
  2. Submit the login form with a wrong password (1st failure).
    - expect: alert reads "Incorrect password. 2 attempts remaining before your account is locked."
  3. Submit again with a wrong password (2nd failure).
    - expect: alert reads "Incorrect password. 1 attempt remaining before your account is locked."
  4. Submit again with a wrong password (3rd failure).
    - expect: alert reads "Incorrect password. One more failed attempt will lock your account."
  5. Submit again with a wrong password (4th failure — exceeds the allowance).
    - expect: the page automatically switches to the unlock screen — heading "Verify & Unlock Account" is visible
    - expect: a 6-digit verification code input is visible

#### 1.6. forgot-password-opens-otp-request-screen

**File:** `tests/login/forgot-password-opens-otp-request-screen.spec.ts`

**Steps:**
  1. Click "Forgot password?".
    - expect: heading changes to "Reset your password"
    - expect: a "Send Verification Code" button is visible

#### 1.7. remember-me-checkbox-is-sent-to-login-api

**File:** `tests/login/remember-me-checkbox-is-sent-to-login-api.spec.ts`

**Steps:**
  1. Create a fresh test coordinator account via the signup API.
  2. Confirm "Remember this device for 30 days" is checked by default.
  3. Type the account's email and password.
  4. Intercept the `POST /api/v1/auth/login` request while clicking "Sign-In".
    - expect: the intercepted request body's `remember_me` field is `true`

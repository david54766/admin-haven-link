

# Resend API Key, Platform Admin Account, and Password Reset Setup

## Overview
Three tasks: (1) prompt you to enter the Resend API key, (2) create a platform_admin user account via an edge function so you can log in to `/platform`, (3) update the ForgotPassword and ResetPassword pages to remove the old "Classroom Panda" logo import and use clean, branded "Childcare Staff Training" styling instead.

## Step 1: Update Resend API Key
- Use the secrets tool to prompt you to enter your Resend API key value.

## Step 2: Create Platform Admin Account
- Create an edge function `seed-platform-admin` that:
  - Creates a user via `auth.admin.createUser` with a specified email/password
  - Creates a profile with `status: 'approved'` and no tenant_id
  - Assigns `platform_admin` role in `user_roles`
- Run it once to create your account (e.g., your email + a temp password)
- After creation, you log in at `/login` and get redirected to `/platform`

**Credentials** (you'll set these when I ask): I'll ask you for the email and password you want.

## Step 3: Test Welcome Email
- After Resend key is set and platform admin is created, test creating a tenant from the Platform Dashboard — the `create-tenant-account` edge function already sends a welcome email via Resend.

## Step 4: Custom Password Reset Pages
Both `ForgotPassword.tsx` and `ResetPassword.tsx` currently import `logo from '@/assets/logo.png'` (old Classroom Panda branding). Update both to:
- Remove the logo import
- Replace the logo `<img>` with a text-based header using the GraduationCap icon + "Childcare Staff Training" (matching the Landing page style)
- Keep the gradient background blobs and card layout
- Remove `brand-red`/`brand-purple`/`brand-blue` gradient text and use `text-primary` instead

## Files Changed

| Action | File |
|--------|------|
| Create | `supabase/functions/seed-platform-admin/index.ts` |
| Modify | `src/pages/ForgotPassword.tsx` — remove logo, use text branding |
| Modify | `src/pages/ResetPassword.tsx` — remove logo, use text branding |


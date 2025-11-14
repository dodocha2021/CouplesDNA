# First Login Onboarding Questionnaire - Implementation Guide

## 📋 Overview

A 6-step onboarding questionnaire for first-time users to provide personalized relationship insights.

## ✅ What's Been Implemented

### 1. Database Migration
**File**: `supabase/migrations/20251114000001_add_onboarding_fields_to_profiles.sql`

**New Fields Added to `profiles` table**:
- `relationship_status` (TEXT) - Current relationship status
- `gender` (TEXT) - User gender
- `relationship_duration` (TEXT) - How long in current relationship
- `consultation_focus` (JSONB) - Topics of interest (1-3 selections)
- `primary_challenge` (TEXT) - Open-ended main challenge
- `profile_completed` (BOOLEAN) - Completion status
- `profile_completed_at` (TIMESTAMPTZ) - Completion timestamp

### 2. Onboarding Dialog Component
**File**: `components/onboarding/FirstLoginOnboardingDialog.tsx`

**Features**:
- ✅ 6-step wizard with progress indicator
- ✅ Step 1: Welcome message + Relationship Status (4 options, no "single" options)
- ✅ Step 2: Gender (4 options)
- ✅ Step 3: Age Range (5 options)
- ✅ Step 4: Relationship Duration (conditional - only for "In a relationship" or "Married")
- ✅ Step 5: Consultation Focus (multi-select 1-3 topics, 8 options)
- ✅ Step 6: Primary Challenge (optional text, max 200 chars)
- ✅ Form validation with error messages
- ✅ Previous/Next navigation with slide animations
- ✅ Exit warning dialog (only if user has started filling)
- ✅ Success page with "Get Started" button
- ✅ Direct Supabase integration for data saving

### 3. Dashboard Integration
**File**: `components/layout/DashboardLayout.tsx`

**Features**:
- ✅ Automatic popup on first login (when `profile_completed = false`)
- ✅ Forced display for existing users who haven't completed it
- ✅ Profile refresh after completion

### 4. Profile Incomplete Banner
**File**: `components/dashboard/ProfileIncompleteBanner.tsx`

**Features**:
- ✅ Displays at top of dashboard if profile not completed
- ✅ "Profile Incomplete →" text with complete button
- ✅ Dismissible (session-based - reappears on new login)
- ✅ Clicking "Complete Now" opens questionnaire

### 5. Settings Page Integration
**File**: `components/content/SettingsContent.tsx`

**Features**:
- ✅ New "Personal Profile Questionnaire" card in Profile tab
- ✅ Displays completed questionnaire data with nice formatting
- ✅ "Edit Profile" button to reopen questionnaire
- ✅ Shows topics as tags, relationship duration, main challenge
- ✅ Prompts incomplete users to complete questionnaire

## 🚀 Deployment Steps

### Step 1: Run Database Migration

```bash
# Option A: Using Supabase CLI (if connected)
cd /home/user/CouplesDNA
supabase db push

# Option B: Manually in Supabase Dashboard
# 1. Go to your Supabase project dashboard
# 2. Navigate to SQL Editor
# 3. Copy and run the content of:
#    supabase/migrations/20251114000001_add_onboarding_fields_to_profiles.sql
```

### Step 2: Install Dependencies (if needed)

```bash
npm install
# or
yarn install
```

### Step 3: Build and Test

```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

## 🧪 Testing Checklist

### Test Case 1: New User First Login
1. ✅ Create new account via signup
2. ✅ Login and navigate to dashboard
3. ✅ Questionnaire should popup automatically
4. ✅ Fill all 6 steps and submit
5. ✅ Success message appears
6. ✅ Dashboard loads without banner

### Test Case 2: Incomplete Profile (Skip Scenario)
1. ✅ New user logs in
2. ✅ Close questionnaire (see exit warning)
3. ✅ Confirm exit
4. ✅ "Profile Incomplete" banner appears at top
5. ✅ Click dismiss (X button)
6. ✅ Banner disappears
7. ✅ Logout and login again
8. ✅ Questionnaire pops up again (forced)

### Test Case 3: Banner Complete Flow
1. ✅ User with incomplete profile sees banner
2. ✅ Click "Complete Now →"
3. ✅ Questionnaire opens
4. ✅ Complete and submit
5. ✅ Banner disappears permanently

### Test Case 4: Settings Edit Flow
1. ✅ User with completed profile
2. ✅ Go to Settings → Profile tab
3. ✅ See questionnaire data displayed
4. ✅ Click "Edit Profile" button
5. ✅ Questionnaire opens with previous data
6. ✅ Make changes and resubmit
7. ✅ Settings page updates with new data

### Test Case 5: Conditional Logic
1. ✅ In Step 1, select "In a relationship"
2. ✅ Step 4 (Duration) should appear
3. ✅ Go back to Step 1, change to "Post-breakup"
4. ✅ Step 4 should be skipped
5. ✅ Step counter adjusts (5 steps instead of 6)

### Test Case 6: Validation
1. ✅ Try clicking "Next" without selecting option
2. ✅ Error message appears: "Please select an option"
3. ✅ In Step 5, try selecting 4 topics
4. ✅ 4th checkbox should be disabled
5. ✅ Try selecting 0 topics
6. ✅ Error: "Please select at least 1 option"

### Test Case 7: Form Persistence (User Experience)
1. ✅ Fill Steps 1-3
2. ✅ Click close button (X)
3. ✅ Exit warning appears
4. ✅ Click "Exit Anyway"
5. ✅ Data is NOT saved (as per requirement)
6. ✅ Reopen questionnaire
7. ✅ Form is empty (starts fresh)

## 📊 Database Verification

After migration, verify in Supabase:

```sql
-- Check new columns exist
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'profiles'
AND column_name IN (
  'relationship_status',
  'gender',
  'relationship_duration',
  'consultation_focus',
  'primary_challenge',
  'profile_completed',
  'profile_completed_at'
);

-- Check a completed profile
SELECT
  id,
  relationship_status,
  gender,
  age_range,
  relationship_duration,
  consultation_focus,
  primary_challenge,
  profile_completed,
  profile_completed_at
FROM profiles
WHERE profile_completed = true
LIMIT 1;
```

## 🎨 UI/UX Features

### Progress Indicator
```
Step 1 of 6: ●○○○○○
```

### Welcome Message (Step 1)
```
👋 Welcome to CouplesDNA

To provide you with more personalized relationship insights,
please take 2 minutes to tell us about yourself.
```

### Success Message
```
✓ Submission Successful!

Thank you for completing your profile.
Let's start your journey.

[Get Started]
```

### Banner (Dashboard Top)
```
ℹ Profile Incomplete  [Complete Now →]  [✕]
```

## 🔧 Troubleshooting

### Issue: Questionnaire doesn't popup
**Solution**: Check `profile_completed` field in database:
```sql
UPDATE profiles SET profile_completed = false WHERE id = 'user-id';
```

### Issue: "Profile Incomplete" banner always shows
**Solution**: Clear session storage:
```javascript
sessionStorage.removeItem('profile_banner_dismissed');
```

### Issue: Migration fails
**Solution**: Check if columns already exist:
```sql
ALTER TABLE profiles DROP COLUMN IF EXISTS relationship_status;
-- Then run migration again
```

### Issue: Consultation focus not saving
**Solution**: Ensure JSONB column type:
```sql
ALTER TABLE profiles ALTER COLUMN consultation_focus TYPE JSONB USING consultation_focus::jsonb;
```

## 📝 Notes

- All text is in English as requested
- No API endpoints needed (direct Supabase integration)
- Data is NOT auto-saved during filling (must submit to save)
- Banner reappears on new session if profile incomplete
- Existing users (old accounts) will see forced popup on next login
- Migration is reversible if needed

## 🎯 Success Criteria

- ✅ New users complete questionnaire on first login
- ✅ Data saved correctly to profiles table
- ✅ Settings page shows and allows editing
- ✅ Banner prompts incomplete users
- ✅ All validation working correctly
- ✅ Smooth UX with animations
- ✅ Mobile responsive design

## 🔄 Future Enhancements (Not Implemented)

- [ ] Analytics tracking for completion rate
- [ ] A/B testing different questionnaire flows
- [ ] Export questionnaire data to CSV
- [ ] Admin view of aggregated responses
- [ ] Multi-language support
- [ ] Progressive web app offline support

---

**Implementation Date**: November 14, 2025
**Status**: ✅ Complete and Ready for Testing

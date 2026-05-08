# Referral Command Center — Next Steps

## What changed in this pilot-ready pass

- Added edit mode for referrals
- Added delete action for local demo data
- Added CSV export
- Added created/updated timestamps in referral cards
- Added response-time input
- Added starter Supabase schema with RLS policies

## Recommended build sequence

1. **Supabase setup**
   - Create Supabase project
   - Run `supabase-schema.sql`
   - Create one test facility
   - Add auth users and profile rows
   - In the app, open the **Supabase** section and paste Project URL, anon key, and facility ID
   - Click **Save + Connect**, then **Sign in**

2. **Frontend migration**
   - Move from static HTML/localStorage to Next.js or React/Vite
   - Replace localStorage reads/writes with Supabase queries
   - Keep the same workflow and UI while changing the data layer

3. **Pilot safeguards**
   - Use patient initials only
   - No DOB, MRN, SSN, uploaded clinical docs, or detailed PHI
   - Add user roles: admissions, DON, administrator, corporate/viewer
   - Keep audit events for status changes and deletes

4. **Automation**
   - Email daily leadership report at 4 PM
   - Alert pending > 1 hour
   - Alert follow-up due
   - Alert Medicare/MA referral received
   - Alert lost referral missing reason

5. **Validation**
   - Run 20 fake referrals through the workflow
   - Ask admissions/DON/admin what is confusing or missing
   - Track whether it catches missed follow-ups and explains lost referrals

## Do not add yet

- PCC integration
- Hospital portal scraping
- Automatic acceptance decisions
- Full document upload / PHI storage
- Billing predictions

# Connect Referral Command Center to Supabase

The app now supports two modes:

1. **Local demo mode** — uses browser localStorage.
2. **Supabase connected mode** — reads/writes the `referrals` table.

## Steps

1. Create a Supabase project.
2. Open Supabase → SQL Editor.
3. Run `supabase-schema.sql`.
4. Create one facility row:

```sql
insert into facilities (name) values ('Chatsworth Park Healthcare Center') returning id;
```

5. Copy the returned facility `id`.
6. In Supabase → Authentication → Users, create a user for yourself.
7. Copy that user's auth UUID, then create a profile row:

```sql
insert into profiles (id, facility_id, full_name, role)
values ('AUTH_USER_UUID_HERE', 'FACILITY_UUID_HERE', 'Ryan', 'administrator');
```

8. In Supabase → Project Settings → API, copy:
   - Project URL
   - anon public key

9. Open the app → Supabase section.
10. Paste:
   - Supabase Project URL
   - anon public key
   - facility ID
   - email/password
11. Click **Save + Connect**.
12. Click **Sign in**.

After that, new referrals, edits, deletes, and status changes write to Supabase instead of localStorage.

## Important

Do not use real PHI yet. This is a pilot implementation. Use patient initials and fake/test referral data until HIPAA/BAA/security review is complete.

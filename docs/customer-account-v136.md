# V136 Customer Account and Loyalty

- Guest browsing and booking remain available without authentication.
- Customer authentication is separate from admin authentication.
- Supported customer OAuth entry points: Google, Facebook and Apple. Provider buttons require the matching Supabase provider credentials to be enabled before production use.
- Email/password follows the current Supabase project rule: minimum 10 characters, lowercase, uppercase and digit. The application additionally checks passwords against HIBP Pwned Passwords using k-anonymity.
- Completed rental bookings earn loyalty points once through an idempotent ledger entry.
- Existing bookings can be linked to a verified customer by email or by an authorized operations user in the admin customer center.
- Raw card PAN/CVV data is never stored. Public customer payment rows contain safe display metadata only; provider token references are isolated in the private schema.

# Google Groups ticket invitations

Organizers can select an approved event in **Attendees**, preview the user
members of a Google Group, and send each eligible member a private invitation.
The invitation is for one ticket; the attendee must sign in or register with
the invited email address and complete the normal checkout. The ticket and its
unique QR code are issued only after payment succeeds (or under the existing
free-ticket rules for a free event).

The application reads group membership through the Google Workspace Admin SDK.
It does not treat a message sent to a group alias as individual tickets, does
not expand nested groups, and does not send attendees' ticket QR codes to the
group address. The feature supports up to 1,000 user members per batch.

## Google Workspace setup

An administrator must configure Google Workspace before organizers can use
group lookup:

1. Enable the **Admin SDK API** in the Google Cloud project used by the
   service account.
2. Enable domain-wide delegation for that service account.
3. In the Workspace Admin console, authorize its OAuth client ID for this
   read-only scope:
   `https://www.googleapis.com/auth/admin.directory.group.member.readonly`
4. Configure a Workspace administrator email address to impersonate. The
   administrator must be permitted to read the target group's members.
5. Store the service account JSON on the API server only. Prefer the base64
   environment variable in deployment systems; never put the key in frontend
   configuration or source control.

Required API environment variables:

| Variable | Description |
| --- | --- |
| `GOOGLE_SERVICE_ACCOUNT_JSON_B64` | Base64-encoded service-account JSON. |
| `GOOGLE_ADMIN_IMPERSONATE_EMAIL` | Workspace administrator email used for domain-wide delegation. |
| `FRONTEND_URL` | Public frontend origin used to construct invitation links. |
| `EMAIL_USER`, `EMAIL_PASS` | Existing Gmail/Nodemailer sender configuration. |

Alternatively, local development may use `GOOGLE_SERVICE_ACCOUNT_JSON` with the
raw JSON value instead of `GOOGLE_SERVICE_ACCOUNT_JSON_B64`. Configure only one
of these service-account variables. Existing database and Stripe environment
variables must also be configured as for the rest of the API.

## Database migration

Apply the migration once to the API database before deploying the feature:

```sh
mysql --host="$DB_HOST" --user="$DB_USER" --password --database="$DB_NAME" < migrations/add_bulk_ticket_invitations.sql
```

The command prompts for the database password when needed. Back up the
database and verify the target database before applying schema changes.
The group whitelist import reuses the existing `users`, `white_list`, and
`tickets` tables. Ensure the existing `fix_whitelist_add_by.sql` migration has
been applied so `white_list.add_by` references `users.id`.

## Organizer workflow

1. Open the organizer dashboard's **Attendees** page and select an event.
2. Enter the Google Group email and select **ดูตัวอย่างสมาชิก**.
3. Review members marked as already ticketed, already invited, or eligible.
4. Confirm sending. The API sends separate invitation emails to eligible
   personal email addresses.
5. Review delivery results. Failed invitation emails and failed paid-ticket
   emails can be retried without creating a second ticket.

Invitations expire after seven days. A member must use the same email address
as the invitation, and each invitation can purchase one ticket. Normal event
capacity, zone, seat, Stripe, and booking-limit checks still apply.

## API examples

Organizer endpoints require the existing authenticated `token` header.

Preview a group roster:

```sh
curl -X POST "$API_URL/organizer/7/events/42/bulk-ticket-batches/preview" \
  -H "Content-Type: application/json" \
  -H "token: $AUTH_TOKEN" \
  -d '{"group_email":"event-staff@kmitl.ac.th"}'
```

Create invitations after reviewing the preview:

```sh
curl -X POST "$API_URL/organizer/7/events/42/bulk-ticket-batches" \
  -H "Content-Type: application/json" \
  -H "token: $AUTH_TOKEN" \
  -d '{"group_email":"event-staff@kmitl.ac.th"}'
```

The response includes `batch_id`, `total_records`, `invitations_created`,
`skipped_duplicates`, `email_failures`, and each invitation's delivery status.
Retrieve a batch with:

```text
GET /organizer/7/events/42/bulk-ticket-batches/{batchId}
```

Retry a failed invitation or paid-ticket email with:

```text
POST /organizer/7/events/42/bulk-ticket-invitations/{invitationId}/retry
```

The public invitation validation endpoint accepts the token in a POST body,
not in the API URL:

```sh
curl -X POST "$API_URL/events/42/bulk-ticket-invitations/validate" \
  -H "Content-Type: application/json" \
  -d '{"token":"<token-from-invitation-link>"}'
```

The frontend includes the validated invitation token in the normal checkout
request. It is matched to the authenticated attendee on the server.

Run the focused API unit tests with:

```sh
cd api && npm test
```

## Example member-list CSV

The organizer UI currently reads membership directly from the configured
Google Group; it does not upload CSV files. If an administrator prepares or
imports the group's membership outside the application, a simple email list
can use this format:

```csv
email
alice@example.edu
bob@example.edu
```

Only active user members with valid email addresses are included. Duplicate
addresses are collapsed, and members who already have a valid ticket or active
invitation are skipped.

## Group whitelist CSV import

An organizer owner can upload a CSV from an event's **Whitelist** section.
Use the `email,name` headers; `name` is split into the existing first-name and
last-name fields. Existing accounts are added without changing their profile.
New accounts receive an email OTP and use the **Forgot password** page to set
their password; the import never sends a password. Each successfully added
member also receives the same free, no-seat whitelist ticket as a manual
whitelist addition.

The API accepts up to 500 member rows and an 80 KB CSV. Invalid records and
duplicate email addresses are reported per row; users already on that event's
whitelist are skipped. A failed account-setup email does not roll back the
whitelist; that user can request a password reset from the sign-in page.

Example:

```csv
email,name
alice@example.edu,Alice Smith
bob@example.edu,Bob
```

Import the CSV text:

```sh
curl -X POST "$API_URL/organizer/7/events/42/whitelist/import" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $AUTH_TOKEN" \
  --data-binary '{"csv":"email,name\nalice@example.edu,Alice Smith\n"}'
```

The response includes totals for added members, newly created accounts,
skipped rows, failures, account email failures, and individual row statuses.

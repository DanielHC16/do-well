# ADR 0008: Separation of Identity, Workspace Preference, and Server-Owned Capabilities

## Context

DO-WELL is a neighborhood gig marketplace where participants may both offer and perform neighborhood work. Previously, client-side UI modes were handled via local AsyncStorage preferences, while administrative capabilities and moderation workflows were undefined. Furthermore, confusion arose between account types (worker vs. employer) and security roles.

In a marketplace:
1. A single individual often switches between posting gigs ("employer" mode) and taking gigs ("worker" mode).
2. The database strictly enforces that an individual cannot apply to, accept, or complete their own gig.
3. Administrator authority must be strictly server-controlled, auditable, and immutable to client tampering, without relying on client-side email string matching or privileged secret keys in the mobile binary.

## Decision

We decouple user identity, workspace preference, and administrative capability into three distinct, non-overlapping architectural layers:

```text
Supabase Auth Identity (User UID)
  ├── Marketplace Workspace Preference: "worker" | "employer" (Self-service preference)
  └── Server-Owned Capability: "user" | "admin" (PostgreSQL-owned, RLS-enforced)
```

1. **Identity Layer**: Exactly one Supabase Auth identity (`auth.users.id`) and corresponding application profile (`public.profiles`). Supported authentication flows include Google browser OAuth and email/password.
2. **Workspace Preference**: A self-service user preference (`preferred_mode: 'worker' | 'employer'`) stored in `public.profiles.preferred_mode`. Users update this freely via the authenticated RPC `set_preferred_mode(p_mode)`. This governs navigation defaults and initial view, but grants no special permissions and cannot bypass RLS.
3. **Capability Layer**: Server-owned roles stored in `public.account_roles(user_id, role, granted_at, granted_by)`. Administrative privileges are checked via `private.is_admin(auth.uid())` inside PostgreSQL security definer functions. Client queries/mutations to `account_roles` are denied by RLS. Standard users query their own capabilities only via `get_my_capabilities()`.
4. **Operator Bootstrap**: Administrative capabilities are granted solely via operator-level SQL migrations or Supabase dashboard executions using stable Auth UUIDs. Client code never checks email addresses to grant access.
5. **Audit Trail**: Every privileged moderation action (resolving reports, content takedowns) is logged to an immutable `public.admin_actions` table with caller ID and timestamp.

## Consequences

### Positive
- Strict separation of concerns between UX preferences and security authorization.
- Eliminates the vulnerability of client-side role manipulation.
- Prevents identity conflation: one user can switch workspaces seamlessly without losing history.
- Maintains compliance with zero-dollar budget and leak-free secrets policy (no service-role keys in mobile app).
- Enforces multi-principal integrity: a full marketplace transaction requires two distinct authenticated identities.

### Negative / Trade-offs
- Demonstrating a complete transaction end-to-end requires two distinct accounts (or two concurrent client sessions) rather than switching a single user back and forth.
- Admin role provisioning requires an explicit operator step after user signup.


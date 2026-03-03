# Authentication

This document explains how authentication and session handling work in Voxora.

## Identity provider and session authority

- Supabase Auth is the identity authority.
- Session state is stored in auth cookies.
- User profile data is mirrored in `public.profiles`.
- RLS policies rely on `auth.uid()` for authorization.

## User lifecycle

- A user registers through the auth UI.
- Supabase creates `auth.users` row.
- Trigger function creates matching `public.profiles` row.
- User signs in and receives session cookies.
- Session cookies are read by server and browser clients.

## Auth routes in app

- `auth/login` page for sign-in.
- `auth/register` page for sign-up.
- `auth/callback` route for code exchange.
- `auth/signout` route for logout.

## Callback behavior

- Callback route reads `code` from query string.
- Exchanges code for session with Supabase server client.
- Redirects authenticated user to dashboard.
- Redirect still occurs if code is missing.

## Supabase client split

- `lib/supabase/server` is request-scoped.
- `lib/supabase/client` is browser-scoped.
- Server client binds to cookie store from request context.
- Browser client stores auth state in local or session storage.

## Why server client is created per request

- Each request carries different auth cookies.
- Request-scoped client prevents cross-user session leakage.
- Client creation is lightweight until a query executes.
- This is the expected SSR pattern for Supabase.

## Access control model

- App checks user session before sensitive actions.
- API routes validate ownership of target resources.
- Database RLS enforces final data isolation barrier.
- Ownership checks use `user_id` and `owner_id` patterns.

## Tables protected by RLS

- `profiles`
- `agents`
- `agent_templates`
- `template_knowledge`
- `knowledge_base`
- `knowledge_chunks`
- `calls`
- `call_analytics`

## Route-level auth expectations

- LiveKit token route requires user session.
- Voice websocket route requires user session.
- Call analyze route requires user session.
- Knowledge ingest route requires user session.
- Deepgram token route currently does not enforce auth.

## Template visibility rules

- System templates are visible to all users.
- Public marketplace templates are visible to all users.
- Private templates are visible only to template owner.
- Template knowledge follows parent template access policy.

## Common session issues

- Callback URL mismatch between app and auth config.
- Missing cookie propagation in server context.
- Mixed usage of server and browser Supabase clients.
- Expired session from long idle browser tabs.
- Invalid environment values for Supabase URL or anon key.

## Security practices

- Never expose service role key to browser code.
- Keep provider API keys server-side.
- Restrict dangerous routes with auth and rate limits.
- Validate ownership even if RLS exists.
- Log auth failures without leaking sensitive data.


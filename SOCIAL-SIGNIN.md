# Google and Microsoft sign-in

The code is complete on both sides. What is missing is configuration: neither
provider has an application registered, and no client ids are set. Until they
are, the buttons **do not render at all** — `SocialSignInButtons` returns `null`
when both client ids are absent, so nothing appears and nothing errors.

That is the whole gap. Nothing below requires a code change.

## How it works, briefly

Both providers hand the browser an OIDC **ID token**. The frontend posts it to
`POST /api/auth/google` or `/api/auth/microsoft`, and the backend verifies it
before trusting a single field — signature against the provider's published
keys, audience equal to our own client id, and (for Microsoft) issuer matching
the token's own tenant. Nothing in the browser is security-relevant on its own.

Relevant files:

| Concern | File |
| --- | --- |
| Token verification | `atg_backend/modules/auth/federated-identity.service.js` |
| Account lookup, linking, creation | `socialLogin` in `atg_backend/modules/auth/auth.service.js` |
| Routes | `atg_backend/modules/auth/auth.routes.js` |
| Buttons | `atg_frontend/src/components/ui/SocialSignInButtons.tsx` |
| Tests | `atg_backend/tests/unit/socialLogin.test.js`, `federatedIdentity.test.js` |

## 1. Register the applications

### Google

Google Cloud Console → **APIs & Services → Credentials → Create OAuth client ID
→ Web application**.

The frontend uses Google Identity Services, which returns the ID token straight
to the page. It needs **Authorized JavaScript origins**, not redirect URIs:

```
https://atgapply.atgconcordia.com
https://atgapplyv2.remoraj4.workers.dev
http://localhost:5173
```

Leave *Authorized redirect URIs* empty. Copy the client id
(`…apps.googleusercontent.com`).

Configure the OAuth consent screen too, or sign-in fails for anyone outside your
own organisation.

### Microsoft

Entra admin centre → **App registrations → New registration**.

- Supported account types: *Accounts in any organizational directory and
  personal Microsoft accounts*, unless you intend to pin a single tenant.
- Platform: **Single-page application** — not "Web". MSAL runs in the browser,
  and the Web platform type will reject the request.
- Redirect URIs — MSAL uses `window.location.origin`, so these are exact origins
  with no path:

```
https://atgapply.atgconcordia.com
https://atgapplyv2.remoraj4.workers.dev
http://localhost:5173
```

Copy the **Application (client) ID**. Copy the **Directory (tenant) ID** only if
you want to restrict sign-in to that one tenant.

No client secret is needed for either provider. This flow never uses one.

## 2. Set the variables

Six variables across two platforms. The two halves are independent: the frontend
ones decide whether a button renders, the backend ones decide whether its token
is accepted. Setting only one half produces a button that always fails.

**Cloudflare — frontend, build time.** Workers &amp; Pages → `atgapplyv2` →
Settings → **Build** → Variables and Secrets. Redeploy after saving.

| Variable | Value |
| --- | --- |
| `VITE_GOOGLE_CLIENT_ID` | Google client id |
| `VITE_MICROSOFT_CLIENT_ID` | Entra application (client) id |
| `VITE_MICROSOFT_TENANT_ID` | Entra tenant id, or leave unset for any account |

> **These must be set on Cloudflare, not in GitHub Actions secrets.**
> `.github/workflows/deploy.yml` also builds the frontend and reads
> `secrets.VITE_GOOGLE_CLIENT_ID`, but that build is a merge gate and is thrown
> away — it even points `VITE_API_URL` at `placeholder.invalid`. Production is
> built by Cloudflare's own git integration. Setting the GitHub secrets alone
> changes nothing that ships, which is an easy hour to lose.

Vite inlines these at build time, so a **redeploy is required** for a change to
take effect. Client ids are public by design — they ship in the bundle — so
these are ordinary variables, not secrets.

**Vercel — backend, runtime.** Project `atg-applyv2` → Settings → Environment
Variables. Redeploy after saving.

| Variable | Value |
| --- | --- |
| `GOOGLE_CLIENT_ID` | The same Google client id |
| `MICROSOFT_CLIENT_ID` | The same Entra application id |
| `MICROSOFT_TENANT_ID` | Optional; pins sign-in to one tenant |

The backend values must match the frontend ones exactly. They *are* the audience
check — a mismatch means every token is rejected, which is the correct
behaviour, not a bug to work around.

A provider left unconfigured on the backend answers
`400 "… sign-in is not configured on this server"` rather than degrading to a
weaker check. That is deliberate: an earlier Google implementation fell back to
an unauthenticated lookup when its client id was missing, which skipped the
audience check entirely and would have accepted a token minted for any other
Google app. `tests/unit/federatedIdentity.test.js` holds that line.

## 3. Verify

1. Load the sign-in page. The button for each configured provider appears; an
   unconfigured provider shows nothing at all.
2. Sign in with a fresh account → a `candidate` user is created with no
   password, and `provider` / `externalId` populated.
3. Sign in again → resolves by `(provider, externalId)`, no new row.
4. Sign in with a provider account whose address matches an existing password
   account → the two link, and both sign-in methods then work for that user.

If a Google button appears to do nothing on click, that is expected in several
ordinary cases — One Tap is suppressed when the user dismissed it earlier, in
private windows, or behind an ad blocker. The component detects this and swaps
in Google's own rendered button. If *that* does not appear either, the origin is
almost certainly missing from Authorized JavaScript origins.

## Account linking, and why an unverified address is refused

A social sign-in links to an existing account **only when the provider says the
email address is verified**. Otherwise anyone who could assert an arbitrary
address at an IdP could claim someone else's account here.

This has one visible consequence worth knowing before support asks:

- **Work/school Microsoft accounts** are treated as verified — the address is
  controlled by that tenant's directory.
- **Personal Microsoft accounts** (tenant `9188040d-…`) are not, because a
  consumer account's address is self-asserted. A personal account that does not
  already exist here is refused with a message telling the user to sign up with
  a password instead. This is intended, not a misconfiguration.

Google reports `email_verified` directly, so it needs no such rule.

A soft-deleted account holding the address gives `403` with a message pointing
at support, rather than an opaque failure on the unique constraint.

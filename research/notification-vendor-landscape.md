# Notification vendor landscape for Cadence

Researched 2026-11-13. All prices are **as seen 2026-11-13** on the linked pricing page and will drift. These are facts and trade-offs only. No vendor is recommended; that is a later human decision.

**Scope.** In Cadence a **Notification** is a message sent because something happened that concerns the recipient. Promotional broadcasts (**Announcements**) are a separate scope that hasn't been decided. Channels are open: email, in-app feed, web push and SMS are all candidates. The stack is React Router v7 (framework mode), TypeScript, Drizzle on one SQLite file, and a Node server.

**Method.** Every claim comes from primary sources: vendor docs, vendor pricing pages, the official SDK repos, the npm registry (queried with `npm view` on 2026-11-13), and W3C, MDN and WebKit. Some claims came from a search-result summary of vendor docs pages rather than a full page fetch; those are marked *(search summary)*. Anything I couldn't confirm is marked **Unverified**.

---

## 1. Transactional email APIs

### Resend

- **SDK.** Package `resend`, v6.38.0, last modified 2026-11-12. Ships its own types (`./dist/index.d.mts`) and requires Node >= 20. Repo: [github.com/resend/resend-node](https://github.com/resend/resend-node). It declares `@react-email/render` as a peer dependency (from `npm view resend`).
- **React Email.** Resend maintains React Email (the [resend/react-email](https://github.com/resend/react-email) repo). `emails.send()` accepts a `react:` parameter, which works on Node only and is passed as a function call rather than JSX. The same page documents idempotency keys, which expire after 24 hours, and a default rate limit of 10 req/s per team ([send-with-nodejs](https://resend.com/docs/send-with-nodejs)).
  - Packaging change: npm marks `@react-email/components` (1.0.12) as deprecated. The current manual-setup docs install `react-email` and import components from it directly, e.g. `import { Button, Html } from "react-email"` ([react.email manual setup](https://react.email/docs/getting-started/manual-setup)).
- **In-app feed component.** None. Resend only does email.
- **Preferences and unsubscribe.**
  - **Transactional sends:** Resend does not add `List-Unsubscribe` itself. You set the header through the API ([add unsubscribe to transactional](https://resend.com/docs/dashboard/emails/add-unsubscribe-to-transactional-emails)). The same page says bulk mail needs a URL `List-Unsubscribe`, `List-Unsubscribe-Post: List-Unsubscribe=One-Click`, an endpoint that returns 200/202 on POST, and processing within 48 h. Its example sets only `List-Unsubscribe`.
  - **Broadcasts and Automations:** Resend handles the unsubscribe flow automatically when the email contains its unsubscribe placeholder ([managing unsubscribe list](https://resend.com/docs/dashboard/contacts/managing-unsubscribe-list)). **Topics** let a contact opt out of particular kinds of mail. A transactional email that carries a `topic_id` the contact has opted out of is not sent. Transactional email without a `topic_id` is still delivered (same page).
  - Unverified: that Broadcasts add `List-Unsubscribe-Post` automatically. A search summary said so, but the fetched page didn't state it.
- **Suppression list.** Hard bounces and complaints are added automatically, and you can add entries manually. The list is **team-wide**, covering all domains and subdomains and both transactional and Broadcast mail. There is a full API (bulk operations of up to 100) and webhooks `suppression.added` / `suppression.removed`. Gmail/Google Workspace may not report complaints ([email suppressions](https://resend.com/docs/dashboard/emails/email-suppressions)).
- **Marketing/broadcast.** Built in: Broadcasts sent to Segments, with Topics ([broadcasts intro](https://resend.com/docs/dashboard/broadcasts/introduction)). Marketing is priced separately by contact count. The fetched page didn't say whether broadcasts should use a separate domain (Unverified).
- **Push/SMS.** None.
- **Pricing** ([resend.com/pricing](https://resend.com/pricing), as seen 2026-11-13):
  - Transactional Free: $0 for 3,000 emails/mo, capped at **100/day**, 3 domains, no overage.
  - Transactional Pro: $20/mo for 50k emails, no daily cap, $0.90 per extra 1k.
  - Marketing Free: 1,000 contacts. Marketing Pro starts at $40/mo for 5,000 contacts, and marketing sends are not metered per email.
- **Dev/testing.** There is no sandbox mode. Use the test addresses `delivered@`, `bounced@` (SMTP 550 5.1.1), `complained@` and `suppressed@resend.dev`. `+label` works on all of them except `suppressed@`. **Test sends count against your quota** ([send test emails](https://resend.com/docs/dashboard/emails/send-test-emails)). `onboarding@resend.dev` is the testing-only sender ([send-with-nodejs](https://resend.com/docs/send-with-nodejs)).

### Postmark

- **SDK.** Package `postmark`, v5.1.1, last modified 2026-11-10. Bundled types (`./dist/index.d.ts`), Node >= 18. Repo: [github.com/ActiveCampaign/postmark.js](https://github.com/ActiveCampaign/postmark.js) (`npm view postmark`).
- **React Email.** Not native. React Email documents a Postmark integration in which you render components to an HTML string with `render` ([react.email integrations](https://react.email/docs/integrations/overview)).
- **In-app feed component.** None.
- **Preferences and unsubscribe.**
  - **Broadcast streams** require an unsubscribe link. By default Postmark manages unsubscribes and **automatically adds RFC 8058-compliant `List-Unsubscribe` and `List-Unsubscribe-Post` headers**. While Postmark manages them you can't edit those headers. Managing unsubscribes yourself requires support approval ([List-Unsubscribe header article](https://postmarkapp.com/support/article/1299-how-to-include-a-list-unsubscribe-header)).
  - **Transactional streams:** unsubscribe links and headers are optional. Postmark passes through any custom `List-Unsubscribe` header you add (same article).
  - The `{{{ pm:unsubscribe }}}` placeholder positions the link. An unsubscribe suppresses the address **only on that stream** ([how to add an unsubscribe link](https://postmarkapp.com/support/article/1208-how-to-add-an-unsubscribe-link)).
  - Postmark manages no lists. You keep your lists outside Postmark and sync them with the unsubscribe webhook ([message streams](https://postmarkapp.com/message-streams)).
- **Suppression.** Hard bounces are added to the suppression list. This is demonstrated by the bounce-testing domain behaviour ([generate fake bounces](https://postmarkapp.com/developer/user-guide/sandbox-mode/generate-fake-bounces), *search summary*).
- **Marketing/broadcast.** Supported through separate **Broadcast message streams**. Transactional and broadcast traffic "never intersect … including IP ranges", with dedicated IP pools for each. Postmark recommends different From domains as best practice but doesn't require a separate domain ([message streams](https://postmarkapp.com/message-streams)). The pricing page says transactional and marketing "never mix" ([pricing](https://postmarkapp.com/pricing)).
- **Push/SMS.** None.
- **Pricing** ([postmarkapp.com/pricing](https://postmarkapp.com/pricing), as seen 2026-11-13):
  - Free: 100 emails/mo with no overage.
  - Basic: $15/mo for 10k emails, then $1.80 per 1k.
  - Pro: $16.50/mo for 10k emails, then $1.30 per 1k.
  - The stream counts per plan on the comparison table are ambiguous.
- **Dev/testing.**
  - Pass the server token `POSTMARK_API_TEST` to send without delivering ([send email with API](https://postmarkapp.com/developer/user-guide/send-email-with-api)).
  - **Sandbox-mode servers** process messages but never deliver them. They **do count toward monthly volume** ([sandbox mode](https://postmarkapp.com/developer/user-guide/sandbox-mode)).
  - Fake bounces: send to `hardbounce@bounce-testing.postmarkapp.com` and similar, or set the `X-PM-Bounce-Type` header. Spam complaints can't be simulated and fall back to a hard bounce. The older name `blackhole.postmarkapp.com` still appears in legacy docs ([generate fake bounces](https://postmarkapp.com/developer/user-guide/sandbox-mode/generate-fake-bounces), *search summary*).

### Amazon SES

- **SDK.** Package `@aws-sdk/client-sesv2`, v3.1168.0, last modified 2026-11-12. Typed (`dist-types`). Part of [aws-sdk-js-v3](https://github.com/aws/aws-sdk-js-v3) (`npm view`). It is a generated low-level client, not an email-specific developer experience.
- **React Email.** Not native. React Email documents an AWS SES integration that renders to HTML ([react.email integrations](https://react.email/docs/integrations/overview)).
- **In-app feed component.** None.
- **Preferences and unsubscribe.**
  - **Subscription management:** pass `ListManagementOptions` (contact list plus topic) and SES adds `List-Unsubscribe` and `List-Unsubscribe-Post` headers and hosts an unsubscribe and preference landing page. It also blocks future sends to opted-out contacts.
  - Conditions: you must place the `{{amazonSESUnsubscribeUrl}}` placeholder, the email must have a single recipient, and you must use Easy DKIM.
  - Leave `ListManagementOptions` out for transactional mail that shouldn't be unsubscribable ([subscription management](https://docs.aws.amazon.com/ses/latest/dg/sending-email-subscription-management.html)).
  - Limits: **one contact list per AWS account**, with at most 20 topics ([list management](https://docs.aws.amazon.com/ses/latest/dg/sending-email-list-management.html)).
- **Suppression.**
  - The account-level list covers bounces and/or complaints and is per Region. Only hard bounces are added. Gmail doesn't send complaint data to SES. Configuration sets can override the list.
  - In the sandbox you can't bulk-import suppressions or use `PutSuppressedDestination` ([suppression list](https://docs.aws.amazon.com/ses/latest/dg/sending-email-suppression-list.html)).
- **Marketing/broadcast.** The contact lists and topics above make topic-based bulk sending possible, but there is no campaign UI. When you request production access you declare your mail type as Marketing or Transactional ([request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)).
- **Push/SMS.** Not part of SES. AWS sells them as separate services, which weren't researched here.
- **Pricing** ([aws.amazon.com/ses/pricing](https://aws.amazon.com/ses/pricing/), as seen 2026-11-13):
  - À la carte: $0.10 per 1,000 emails, plus $0.12/GB of attachments.
  - New AWS customers get up to $200 in Free Tier credits for 6 months. There is no SES-specific perpetual free quota on the page.
  - Optional extras: Virtual Deliverability Manager at $0.07 per 1k, dedicated IPs at $24.95/mo per IP.
- **Dev/testing.**
  - **Sandbox:** all new accounts start there, per Region. You can send only to verified addresses or the simulator, at most 200 messages/24 h and 1 msg/s. AWS aims to respond to production-access requests within 96 h ([request production access](https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html)).
  - **Mailbox simulator:** `success@`, `bounce@`, `ooto@`, `complaint@` and `suppressionlist@simulator.amazonses.com`, with `+label` support. It works while in the sandbox and doesn't affect quota or reputation, but **it is billed like normal mail** ([mailbox simulator](https://docs.aws.amazon.com/ses/latest/dg/send-an-email-from-console.html)).

---

## 2. Multi-channel orchestrators

All three are **BYO-provider for email, SMS and push**: they orchestrate the messages, and a provider such as Resend, Postmark, SES or Twilio delivers them. The in-app feed is the only channel they deliver natively.

### Knock

- **SDK.**
  - Server: `@knocklabs/node`, v1.41.1, last modified 2026-11-10, typed. Repo: [knocklabs/knock-node](https://github.com/knocklabs/knock-node).
  - React: `@knocklabs/react`, v0.15.1, last modified 2026-11-06, typed. Repo: [knocklabs/javascript](https://github.com/knocklabs/javascript) (`npm view`).
  - React Email: Knock does not advertise an integration. It has its own templating, and I found no React Email support (Unverified).
- **In-app feed.** Prebuilt real-time components: `KnockProvider`, `KnockFeedProvider`, `NotificationIconButton`, `NotificationFeedPopover`, `NotificationFeed` and `NotificationCell`. By default anyone with the feed ID can read a feed. For production, enable "enhanced security mode" and pass a signed `userToken` ([React feed](https://docs.knock.app/in-app-ui/react/feed)). The library has no out-of-the-box toast component; the docs build toasts with react-hot-toast plus `useKnockFeed` ([toasts](https://docs.knock.app/in-app-ui/react/toasts), *search summary*).
- **Preferences.**
  - A `PreferenceSet` can opt a user out by channel type, category or workflow, and Knock evaluates it before sending ([preferences concept](https://docs.knock.app/concepts/preferences)).
  - Knock hosts a **preference page** per user behind a signed URL (default preference set only). Alternatively you build a custom center with the preferences API or the `usePreferences` hook ([preferences overview](https://docs.knock.app/preferences/overview), [React preferences](https://docs.knock.app/in-app-ui/react/preferences)).
  - **Commercial unsubscribe:** applies to workflows and broadcasts toggled "Commercial". Knock "adds required unsubscribe headers" plus a one-click link, and unsubscribed users keep receiving transactional messages ([commercial unsubscribe](https://docs.knock.app/preferences/commercial-unsubscribe)). The page doesn't name the headers, so `List-Unsubscribe-Post` specifically is Unverified.
- **Marketing/broadcast.** **Broadcasts** are one-time cross-channel sends to an audience, all users, or an uploaded CSV ([broadcasts](https://docs.knock.app/concepts/broadcasts)).
- **Push/SMS.** BYO. Documented providers include Twilio and Telnyx for SMS and APNs and FCM for push ([integrations overview](https://docs.knock.app/integrations/overview)), plus OneSignal and Expo. Email providers include Resend ([Knock + Resend](https://docs.knock.app/integrations/email/resend)) and SES.
  - Web push: the documented route goes **through FCM**, using Firebase's VAPID key and a `firebase-messaging-sw.js` service worker ([web push via FCM tutorial](https://docs.knock.app/tutorials/sending-web-push-notifications-with-fcm), *search summary*).
  - I found no direct VAPID/`web-push` provider (Unverified).
- **Pricing** ([knock.app/pricing](https://knock.app/pricing), as seen 2026-11-13):
  - Free: up to 10,000 messages/mo.
  - Starter: **$250/mo** for 50k messages, then $0.005 each.
  - Billing is per message delivered to one user on one channel. Workflow triggers aren't billed.
  - The in-app feed, preferences and unlimited environments are on both tiers.
- **Dev/testing.**
  - Every environment has isolated data and separate API keys ([environments](https://docs.knock.app/concepts/environments)).
  - **Channel sandbox mode** (all channels except in-app): messages are rendered but never sent to the provider, get status "Not sent", and **don't count toward usage**. The workflow test runner can force sandbox mode, as can `settings.sandbox_mode` on the API ([message statuses](https://docs.knock.app/send-notifications/message-statuses), [testing workflows](https://docs.knock.app/send-notifications/testing-workflows), *search summary*).
  - The built-in **Knock test email channel** sends only to Knock account members, at most 100 emails/mo, and is not for production ([Knock test channel](https://docs.knock.app/integrations/email/knock-test)).

### Novu

- **SDK.**
  - Server: `@novu/api`, v3.19.1, last modified 2026-09-02, typed. Repo: [novuhq/novu-ts](https://github.com/novuhq/novu-ts) ([TypeScript SDK docs](https://docs.novu.co/platform/sdks/server/typescript)).
  - **`@novu/node` is deprecated**: npm says support ended on 2025-03-20 (`npm view @novu/node deprecated`).
  - React Inbox: `@novu/react`, v3.19.2. Code-first workflows: `@novu/framework`, v2.14.0.
  - React Email: **documented** for Framework code-first email steps, which render React Email to HTML ([Novu React Email](https://docs.novu.co/framework/content/react-email), *search summary*).
- **In-app feed.** `<Inbox />` from `@novu/react` (React >= 18) is built from Bell, Notifications, InboxContent and a **Preferences** modal. It keeps the unread count live. Updating an existing subscriber needs HMAC (`subscriberHash`) ([Inbox overview](https://docs.novu.co/platform/inbox/overview)).
- **Preferences.** Subscribers control workflows and channels through the Inbox Preferences UI ([Inbox overview](https://docs.novu.co/platform/inbox/overview)). I didn't verify that Novu handles email `List-Unsubscribe` or RFC 8058 (Unverified).
- **Marketing/broadcast.** Not researched in depth. The pricing page shows only workflow-run limits (Unverified).
- **Push/SMS.** BYO through the Integration Store ([integrations overview](https://docs.novu.co/platform/integrations/overview)). Push providers include FCM, APNs, OneSignal, Pusher Beams and Pushpad, and FCM, OneSignal and Pusher Beams reach web clients ([push](https://docs.novu.co/platform/integrations/push), *search summary*). New cloud accounts get demo email and SMS integrations limited to **300 notifications/mo each**; demo email goes only to your own account's address. **Demo integrations exist only in Novu Cloud**, not in self-hosted or local setups ([demo providers](https://docs.novu.co/platform/integrations/demo-providers)).
- **Pricing** ([novu.co/pricing](https://novu.co/pricing), as seen 2026-11-13):
  - Free: 10,000 workflow runs/mo, 5 workflows, 2 environments (Dev/Prod), 24 h activity retention, 3 team members.
  - Pro: from $30/mo for 30k+ runs and 20 workflows, then $1.20 per 1k runs.
  - The pricing page lists self-hosting only under Enterprise. Free self-hosting of the community edition is described below.
- **Dev/testing and self-host.**
  - The core is **MIT-licensed**; an `enterprise` folder is under a commercial license ([GitHub README](https://github.com/novuhq/novu)).
  - Docker Compose self-host: a setup script runs `docker compose up -d` and the dashboard comes up at `localhost:4000`. It needs **MongoDB and Redis** containers. The community compose file has no S3/LocalStack, so attachments fail until storage is configured, and there's no Helm chart ([deploy with Docker](https://docs.novu.co/community/self-hosting-novu/deploy-with-docker)).
  - Some cloud-only features are unavailable when self-hosted ([self-hosting overview](https://docs.novu.co/community/self-hosting-novu/overview)).
  - Integrations are scoped per environment ([integrations](https://docs.novu.co/platform/concepts/integrations), *search summary*).
  - This would add a second datastore stack (Mongo and Redis) alongside Cadence's single SQLite file.

### Courier

- **SDK.**
  - Server: `@trycourier/courier`, v10.0.0, last modified 2026-10-29, described as "The official TypeScript library for the Courier API". Repo: [trycourier/courier-node](https://github.com/trycourier/courier-node).
  - React: `@trycourier/courier-react`, v9.3.5, last modified 2026-11-09. Repo: [trycourier/courier-web](https://github.com/trycourier/courier-web). The older `@trycourier/react-inbox` is deprecated (`npm view`).
  - React Email: no documented integration found (Unverified).
- **In-app feed.**
  - `CourierInbox` plus the `useCourier` hook, themeable, for React 18+ (`@trycourier/courier-react-17` covers React 17).
  - Real-time, with read and archive state synced across devices. Toasts are included.
  - Authentication: your backend issues a JWT and the client calls `signIn({ userId, jwt })` ([Inbox overview](https://www.courier.com/docs/platform/inbox/inbox-overview)).
  - Inbox is the one channel that needs no provider ([integrations overview](https://www.courier.com/docs/integrations/overview)).
- **Preferences.**
  - A hosted per-user preference page and an embeddable preference center. Each Subscription Topic is `REQUIRED`, `OPTED_IN` or `OPTED_OUT`.
  - **One-click headers:** turn on "Unsubscribe Headers" for a topic and Courier adds `List-Unsubscribe` and `List-Unsubscribe-Post: List-Unsubscribe=One-Click`. However, **"SendGrid is the only provider Courier emits these headers on today."** On other providers you set them through a provider override ([hosted preference page](https://www.courier.com/docs/platform/preferences/hosted-page/)).
- **Marketing/broadcast.** The pricing page lists "Journeys and broadcasts" on the free Developer tier ([pricing](https://www.courier.com/pricing)). The broadcasts docs page returned 404, so the details are Unverified.
- **Push/SMS.** BYO. Push: FCM, APNs, Expo, OneSignal. The page says "web" is covered, but no native browser VAPID provider is listed. SMS: Twilio, Vonage, Bird, Plivo, Sinch ([integrations overview](https://www.courier.com/docs/integrations/overview)).
- **Pricing** ([courier.com/pricing](https://www.courier.com/pricing), as seen 2026-11-13):
  - Developer: free up to 10k sends/mo.
  - Business: **$0.005 per send, with every send billed including the first 10k**.
  - Custom environments are Enterprise-only, and test-environment sends count the same as production sends.
- **Dev/testing.**
  - Every workspace starts with **Production and Test** environments, with Published (`pk_`) and Draft (`dk_`) keys. The Test environment comes with a testing email provider that delivers only to your sign-up address. Provider credentials are configured per environment ([environments & API keys](https://courier.com/docs/platform/workspaces/environments-api-keys)).
  - A search summary mentioned an Enterprise-only "mock" key type. The fetched page doesn't mention it, so it is **Unverified**.

---

## 3. Push and SMS

### Standard web push (Push API, VAPID, `web-push`)

- **Spec.**
  - The W3C Push API is a **Working Draft dated 12 Nov 2026**. `PushManager` and `PushSubscription` are `[SecureContext]`, so they need HTTPS.
  - `applicationServerKey` is a P-256 key used with **VAPID (RFC 8292)**. User agents may require `userVisibleOnly: true` ([W3C Push API](https://www.w3.org/TR/push-api/)).
  - An active service worker is required. MDN marks the API Baseline "Widely available" since March 2023. Firefox applies a push quota to pushes that don't show a notification. The endpoint is a secret capability URL ([MDN Push API](https://developer.mozilla.org/en-US/docs/Web/API/Push_API)).
- **iOS/iPadOS.**
  - Web push arrived in **16.4, and only for web apps added to the Home Screen**.
  - The permission request must follow direct user interaction.
  - No Apple Developer Program membership is needed. The Badging API is supported ([WebKit blog](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)).
  - macOS Safari supports push and VAPID from Safari 16 on macOS 13 ([web-push README](https://github.com/web-push-libs/web-push)).
- **`web-push` npm package.**
  - v4.0.0, published **2026-11-06**. Requires Node >= 16. Now `"type": "module"`: the changelog says "migrate package to ESM" ([releases](https://github.com/web-push-libs/web-push/releases)). The previous release was 3.6.7 in Jan 2024.
  - **No bundled types.** `@types/web-push` 3.6.4 exists but was written for 3.x, so check that it still fits 4.0.
  - API: `generateVAPIDKeys()`, `setVapidDetails()`, `sendNotification()` ([README](https://github.com/web-push-libs/web-push)).
- **Pricing.** No vendor. Browser push services deliver at no charge (the `web-push` README describes no vendor). Cadence would store subscriptions itself (a Drizzle table) and prune expired endpoints.
- **Dev/testing.** No vendor sandbox. You test against real browsers over HTTPS or `localhost`, which is covered by the secure-context rule in the W3C spec.

### Twilio (SMS, Verify)

- **SDK.** Package `twilio`, v6.3.0, last modified 2026-11-06. Bundled types (`./index.d.ts`), Node >= 20. Repo: [twilio/twilio-node](https://github.com/twilio/twilio-node) (`npm view`).
- **SMS pricing (US)** ([twilio.com/en-us/sms/pricing/us](https://www.twilio.com/en-us/sms/pricing/us), as seen 2026-11-13):
  - $0.0083 per segment (long code or toll-free), **plus carrier fees** of about $0.0035–$0.005 per message.
  - Numbers cost $1.15/mo (long code) or $2.15/mo (toll-free).
  - US A2P 10DLC registration fees apply; the amounts are on a linked page that I didn't fetch.
  - Non-US rates are on per-country pages (not fetched).
- **Verify pricing** ([verify pricing](https://www.twilio.com/en-us/verify/pricing)): $0.05 per *successful* verification plus channel fees ($0.0083 per US SMS).
- **Dev/testing.**
  - **Test credentials** work only with Messages, Calls, IncomingPhoneNumbers and Lookup v2. They are free and don't touch real numbers ([test credentials](https://www.twilio.com/docs/iam/test-credentials)).
  - Magic numbers: From `+15005550006` is valid. To `+15005550001` is invalid, `…002` can't route, `…003` has no international permission, `…004` is blocked, and `…009` can't receive SMS.
  - **Verify does not accept test credentials**; other resources return 403 (same page). Twilio's blog also says there's no free Verify sandbox ([Twilio blog](https://www.twilio.com/en-us/blog/test-verify-no-rate-limits), *search summary*).
  - Trial accounts can send only to verified numbers, prefix messages with "Sent from your Twilio trial account", and get one number ([Twilio trial help](https://help.twilio.com/articles/223136107-How-does-Twilio-s-Free-Trial-work-)).

### Orchestrators' own SMS and push

None of the three delivers SMS or push natively. All are BYO (see §2).
- **Knock:** documented web push route goes through FCM.
- **Courier:** lists FCM, APNs, Expo and OneSignal.
- **Novu:** lists FCM, APNs, OneSignal, Pusher Beams and Pushpad. It also has cloud-only demo SMS (300/mo).
- I found **no orchestrator with a first-class raw VAPID/`web-push` provider** (Unverified for all three). If Cadence wants web push without Firebase, it either sends it itself or uses a custom webhook step.

---

## 4. Trade-offs that bear on channel choice

1. **The in-app feed is the only channel the orchestrators deliver themselves.** Building the in-app feed is the main reason to use Knock, Novu or Courier. Each still needs a separate email provider (Resend, Postmark or SES) and a separate SMS provider (Twilio and others). Choosing "email only" removes most of an orchestrator's value. Choosing "in-app plus email" is where they compete with a homegrown Drizzle `notifications` table plus a React Router loader.
2. **Web push on iOS requires the PWA to be installed on the Home Screen** (iOS 16.4+). Mobile Safari users who haven't installed the app can't get push at all. That limits web push as a primary channel for students on iPhones. Desktop Chrome, Firefox and Safari 16+ do support it.
3. **SMS has real per-message costs and US registration overhead** (carrier fees and A2P 10DLC). There's also no free sandbox for Verify. For a course platform, SMS is mostly relevant to OTP or security, and Twilio prices that as a separate product (Verify).
4. **The Notification vs Announcement split maps onto vendor structure.**
   - Postmark forces it: separate Broadcast streams on separate IP pools, with unsubscribes scoped per stream.
   - Resend prices marketing separately by contact count, uses Topics, and its suppression list is team-wide across both kinds of mail.
   - SES uses one contact list per account with up to 20 topics.
   - Knock and Courier have a "commercial" or broadcast concept with transactional mail exempt from unsubscribe.
   - Leaving Announcements undecided keeps several of these options open. Choosing a vendor first would partly decide that question.
5. **RFC 8058 one-click handling differs a lot.**
   - Automatic: Postmark Broadcast streams, SES with `ListManagementOptions`, Resend Broadcasts (header specifics Unverified), and Knock commercial workflows (headers not named).
   - Courier emits the headers **only through SendGrid**.
   - For pure transactional Notifications every vendor leaves the headers to you. Under Gmail and Yahoo bulk-sender rules they are mandatory only for bulk/marketing mail.
6. **Local dev without real sends.**
   - Free and non-counting: Postmark `POSTMARK_API_TEST`, Twilio test credentials, and Knock sandbox mode (which doesn't count toward usage).
   - Still counted or billed: Resend test addresses (count against the 100/day free cap), Postmark sandbox servers (count toward volume), the SES simulator (billed), and Courier test-environment sends.
   - Novu self-hosted gives fully offline dev, but you run Mongo and Redis, and demo providers aren't available in that setup.
7. **Fit with the stack.** Every SDK above ships types except `web-push`, which relies on DefinitelyTyped and has just moved to ESM-only 4.0. Resend has the closest React Email integration. Postmark and SES need a `render()` step. Novu has the only documented React Email path among the orchestrators.
8. **Pricing cliffs at small scale.** Knock goes from free (10k messages) to $250/mo. Courier bills every send at $0.005 once you leave free (10k sends ≈ $50). Novu Pro starts at $30/mo. Resend's free tier caps at 100 emails/day. Postmark's free tier is 100 emails/mo. SES costs about $0.10 per 1k after credits.
9. **Data residency and state.** Orchestrators keep users, preferences and feed history in their cloud. Self-hosting Novu, or building feed and preferences in SQLite, keeps that data local.

---

## 5. Summary comparison

| Vendor | Official TS SDK (npm, version 2026-11-13) | React Email | Hosted in-app feed (React) | Preferences / unsubscribe | Marketing / broadcast | Push / SMS | Free tier → first paid (as seen 2026-11-13) | Dev testing without real sends |
|---|---|---|---|---|---|---|---|---|
| **Resend** | `resend` 6.38.0, typed | Native (`react:` param) | — | Topics and contact unsubscribe for Broadcasts; transactional `List-Unsubscribe` is DIY; team-wide suppression | Broadcasts and Segments, priced by contacts | — | 3k/mo, 100/day → $20/mo for 50k | `*@resend.dev` test addresses (count toward quota) |
| **Postmark** | `postmark` 5.1.1, typed | Via `render()` | — | Auto RFC 8058 on Broadcast streams; per-stream unsubscribe; no list management | Separate Broadcast streams and IP pools | — | 100/mo → $15/mo for 10k | `POSTMARK_API_TEST`; sandbox servers (count toward volume); bounce-testing domain |
| **Amazon SES** | `@aws-sdk/client-sesv2`, typed | Via `render()` | — | `ListManagementOptions` adds headers and a hosted page; 1 list, 20 topics; account suppression | Contact lists and topics, no campaign UI | — (other AWS services) | $200 new-account credits → $0.10 per 1k | Sandbox (verified recipients only, 200/day); mailbox simulator (billed) |
| **Knock** | `@knocklabs/node` 1.41.1, `@knocklabs/react` 0.15.1 | Not found | Yes (popover feed; signed token) | Preference sets, hosted page, commercial unsubscribe | Broadcasts | BYO (Twilio, Telnyx, APNs, FCM…); web push via FCM | 10k messages → $250/mo for 50k | Channel sandbox mode (not billed); test email channel (account members only) |
| **Novu** | `@novu/api` 3.19.1 (`@novu/node` deprecated), `@novu/react` 3.19.2 | Yes (Framework) | Yes (`<Inbox/>` with Preferences) | Workflow and channel prefs in Inbox; RFC 8058 Unverified | Unverified | BYO (FCM, APNs, OneSignal, Pusher Beams, Pushpad); cloud demo SMS 300/mo | 10k runs → $30/mo | Dev environment; demo providers (cloud only); MIT self-host via Docker (Mongo and Redis) |
| **Courier** | `@trycourier/courier` 10.0.0, `@trycourier/courier-react` 9.3.5 | Not found | Yes (`CourierInbox`, toasts; JWT) | Hosted and embeddable preference center, topics; one-click headers **SendGrid only** | Journeys and broadcasts (details Unverified) | BYO (Twilio, Vonage…; FCM, APNs, OneSignal) | 10k sends → $0.005 per send (all sends billed) | Test environment with a test email provider (sign-up address only); mock keys Unverified |
| **Web push** (`web-push`) | `web-push` 4.0.0 (ESM, no bundled types; `@types/web-push` 3.6.4) | n/a | n/a (build your own) | Browser permission; you store subscriptions | n/a | Web push only; iOS 16.4+ **Home Screen only** | No vendor cost | Real browsers on HTTPS or localhost |
| **Twilio** | `twilio` 6.3.0, typed | n/a | — | Not researched (SMS STOP handling) | n/a | SMS, Verify | Trial (verified numbers only) → US SMS $0.0083 + carrier fees; Verify $0.05 | Test credentials and magic numbers (not Verify) |

---

## Open / unverified items

- Whether Resend Broadcasts emit `List-Unsubscribe-Post` automatically, and Resend's guidance on separate marketing domains.
- The exact headers Knock's commercial unsubscribe emits.
- Novu's email unsubscribe and RFC 8058 handling, and its broadcast features.
- Courier's broadcast docs (the page returned 404) and the "mock" key tier.
- Whether any orchestrator supports raw VAPID web push without FCM or OneSignal.
- Twilio non-US SMS rates and the A2P 10DLC fee amounts.
- Whether `@types/web-push` 3.6.4 matches the `web-push` 4.0.0 ESM API.

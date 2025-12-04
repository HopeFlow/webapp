# Under refactor

DO NOT FORK THIS REPOSITORY YET. FEATURES DESCRIBED HERE ARE NOT YET COMPLETE.

# HopeFlow

HopeFlow is a referral-based social search platform that transforms traditional
search into a collaborative, network-powered activity. Users create and share
"quests" to find people, objects, or information, leveraging their extended
social networks for answers and connections.

## Key Features

- **Quests:** Users (Starters) create quests with details, rewards, and share
  them with their network. Contributors can reflow (share) quests or submit
  answers.
- **Reflow Tree:** Every quest share forms a trackable referral tree, enabling
  transparent reward distribution and social proof.
- **Dual Rewards:** Both monetary (in-app credits) and spiritual (goodwill)
  rewards are supported, allowing for transactional and altruistic
  participation.
- **Authentication:** Secure registration and login via email (OTP) or social
  providers (Google, Facebook) using Clerk. Profile images and names are
  validated for quality and security.
- **Session Management:** Users can view and manage active sessions, with secure
  logout and device management.
- **Quest Management:** Starters can edit, cancel, or manage quests, including
  adding secret questions, managing comments, and viewing the reflow tree and
  reward distribution.
- **Notifications:** Real-time browser and email notifications for key events,
  with customizable settings.
- **Reporting:** Contributors can report quests for ToS violations or unfair
  results, with admin review.
- **Drafts:** Admins can prepare quest drafts for easy onboarding and testing.
- **Web-Only:** Responsive design, English language, and no native mobile apps.

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone <repo-url>
   cd hopeflow
   ```
2. **Install dependencies:**
   ```bash
   pnpm install
   ```
3. **Configure environment:**
   - Set up Clerk credentials for authentication.
   - Configure Stripe for reward payments.
   - Set environment variables as needed (see `.env.example` if available).
4. **Run the development server:**
   ```bash
   pnpm dev
   ```
5. **Access the app:** Open [http://localhost:3000](http://localhost:3000) in
   your browser.

## Project Structure

- `src/` — Main application code (pages, components, logic)
- `realtime/` — WebSocket server and real-time communication logic
- `public/` — Static assets (images, fonts)
- `db/` — Database schema and helpers
- `eslint-plugin-hopeflow/` — Custom ESLint rules for the project

## Core Concepts

- **Quest:** A request to find someone, something, or information.
- **Reflow:** Sharing a quest through a unique, trackable link.
- **Contributor:** A user who reflows or answers a quest.
- **Starter:** The original quest creator.
- **Node:** A position in the reflow tree structure.

## Reward Distribution (Recursive Half Split Rule)

- Winner gets 50% of the reward.
- The contributor who referred the winner gets 25%.
- Each contributor in the winning branch gets half the amount their descendant
  gets, recursively.

## Contributing

1. Fork the repository and create your branch.
2. Make your changes and add tests as needed.
3. Run lint and tests:
   ```bash
   pnpm lint
   pnpm test
   ```
4. Submit a pull request with a clear description.

## License

See [LICENSE](LICENSE) for details.

## Server Actions and Hooks

We wrap every Next.js Server Action with one of two helpers:
`defineServerAction` or `createApiEndpoint`.

- `defineServerAction`: use this for server actions that you call manually. It
  simply wraps your handler so we can later layer in logging and error checks,
  while keeping the handler signature unchanged.
- `createApiEndpoint`: use this when you also want an auto-generated TanStack
  Query hook. It forwards to `defineServerAction`, but requires a `uniqueKey`
  (namespaced with `::`) plus a `type: "query" | "mutation"` so the hook
  generator knows how to scaffold the client API.

### Defining server actions

```typescript
// Define a server-only action (no auto hook)
export const isUserProfileCreated = defineServerAction({
  uniqueKey: "login::isUserProfileCreated",
  handler: async (userId: string) => {
    // ...return a value that can be awaited or yielded to the client
  },
});

// Define an action that should get a generated hook
export const quests = createApiEndpoint({
  uniqueKey: "home::quests", // drives hook filename + query key
  type: "query", // "query" for read operations, "mutation" for writes
  handler: async (params: { offset: number; limit: number }) => {
    // ...fetch and return data
  },
});
```

### Generating TanStack Query hooks

- Run `pnpm gen-hooks` to scan all exports created with `createApiEndpoint` and
  generate strongly typed hooks.
- Output lives under `src/apiHooks`. The `uniqueKey` determines the path:
  `home::quests` becomes `src/apiHooks/home/quests.ts` exporting `useQuests`.
- Query hooks accept the same parameters as your handler, plus an optional
  TanStack options object as the final argument. Mutation hooks take an optional
  options object when you call the hook.
- `src/apiHooks/apiEndpointKeys.ts` also lists the generated query/mutation keys
  and helpers for constructing query keys.

### Using generated hooks

```typescript
// Query example
import { useQuests } from "@/apiHooks/home/quests";
const { data, isLoading } = useQuests({ offset: 0, limit: 10 });

// Mutation example
import { useUpdateCurrentUserProfile } from "@/apiHooks/profile/updateCurrentUserProfile";
const updateProfile = useUpdateCurrentUserProfile({
  onSuccess: () => console.log("Profile updated"),
});
updateProfile.mutate({ fullName: "Ada Lovelace" });
```

### Prefetching query data in server components

- Use `<Prefetch actions={[]}>` from `src/helpers/server/page_component.tsx` to
  hydrate TanStack Query data on the server for components that call `useQuery`
  immediately.
- Each entry in `actions` is a prefetcher function that accepts a `QueryClient`
  and returns a promise. Generated hook files already export helpers (e.g.
  `prefetchReadCurrentUserProfile`, `prefetchQuests`) that set the right query
  keys and options.
- Only wrap server components; `Prefetch` runs on the server, fills the cache,
  and renders a `HydrationBoundary` so the client can use the cached result
  without a loading flicker.
- Reach for it when the data is required to render above-the-fold UI on first
  paint (e.g., profile basics gated behind `withUser`). Skip it for data that is
  optional, expensive, or only needed after user interaction; let the client
  fetch those normally.

Example:

```tsx
import { Prefetch, withUser } from "@/helpers/server/page_component";
import { prefetchReadCurrentUserProfile } from "@/apiHooks/profile/readCurrentUserProfile";

export default withUser(async function Profile({ user }) {
  if (!user) return null;

  return (
    <Prefetch actions={[prefetchReadCurrentUserProfile()]}>
      <ProfileMain user={user} />
    </Prefetch>
  );
});
```

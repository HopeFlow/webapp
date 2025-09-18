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

This project utilizes Next.js Server Actions for backend logic and automatically
generates React Hooks for seamless client-side interaction. This system enforces
a "scope" for each server action, ensuring that hooks are used in their intended
feature areas, which is validated by a custom ESLint rule.

### 1. Defining Server Actions

Server Actions are defined in `src/server_actions/` and its subdirectories. They
are created using `createServerAction` for simple actions or
`createCrudServerAction` for CRUD operations.

**Key Concept: Scope**

Every server action _must_ be assigned a `scope`. This string identifies the
feature area or page the action belongs to (e.g., `"home"`, `"sample"`,
`"quest"`). This scope is crucial for organizing generated hooks and for
linting.

**Example: `src/server_actions/sample_actions.ts`**

```typescript
// src/server_actions/sample_actions.ts
"use server";
import {
  createCrudServerAction,
  createServerAction,
} from "@/helpers/server/create_server_action";

// A simple server action with 'sample' scope
export const simpleAction = createServerAction({
  id: "simpleAction",
  scope: "sample", // Define the scope here
  execute: async (message: string) => {
    console.log(`Message from simpleAction: ${message}`);
    return `Server received: ${message}`;
  },
});

// A CRUD server action for managing 'items' with 'sample' scope
export interface Item {
  id: string;
  name: string;
  description?: string;
}

// Mock database (for demonstration)
const items: Item[] = [
  { id: "1", name: "First Item", description: "A default item" },
  { id: "2", name: "Second Item" },
];

export const manageItems = createCrudServerAction({
  id: "manageItems",
  scope: "sample", // Define the scope here
  read: async () => {
    return items;
  },
  create: async (newItem: Omit<Item, "id">) => {
    const item = { ...newItem, id: String(items.length + 1) };
    items.push(item);
    console.log("Created new item:", item);
    return true;
  },
  update: async (itemToUpdate: Item) => {
    const index = items.findIndex((item) => item.id === itemToUpdate.id);
    if (index !== -1) {
      items[index] = { ...items[index], ...itemToUpdate };
      console.log("Updated item:", items[index]);
      return true;
    }
    return false;
  },
  remove: async (itemToRemove: { id: string }) => {
    const index = items.findIndex((item) => item.id === itemToRemove.id);
    if (index !== -1) {
      items.splice(index, 1);
      console.log("Removed item with id:", itemToRemove.id);
      return true;
    }
    return false;
  },
});

// A variant of 'manageItems' to get a single item by ID
export const getItemById = manageItems.createVariant(
  "getItemById",
  async (id: string) => {
    console.log(`Getting item with id: ${id}`);
    return items.find((item) => item.id === id);
  },
);
```

### Variants for Read Queries

Variants are specialized versions of a `CrudServerAction`'s `read` operation.
While a `CrudServerAction` typically provides a generic `read` method (e.g., to
fetch all items), a variant allows you to define a _specific_ read operation
with its own unique parameters and return type.

**Why use Variants?**

1.  **Specificity:** They allow you to create more granular read operations
    without cluttering the main action. For instance, `manageItems` has a `read`
    to get all items, but `getItemById` is a variant to get a _single_ item by
    its ID.
2.  **Type Safety:** Each variant can have its own distinct input parameters and
    return type, which is strongly typed. This improves type safety and
    developer experience compared to trying to overload a single `read` method
    with many different signatures.
3.  **Clearer API:** It provides a cleaner and more explicit API for consuming
    specific read operations. Instead of calling
    `manageItems("read", { id: "123" })`, you call `getItemById("123")`, which
    is more readable and less prone to errors.
4.  **Hook Generation:** This pattern integrates well with the hook generation
    script. Each variant gets its own dedicated hook (e.g., `useGetItemById`),
    making it easy to consume in client components.
5.  **Caching/Invalidation:** While the current implementation of
    `createVariant` throws an error for invalidation, in a more advanced setup,
    each variant could potentially have its own caching and invalidation
    strategies, allowing for more fine-grained control over data freshness.

**When to use Variants:**

- When you have a `CrudServerAction` that needs multiple ways to "read" data,
  each with different input parameters or return shapes.
- When the main `read` operation is too generic for certain common use cases.
- When you want to provide a more specific and type-safe API for fetching
  particular subsets or single instances of data.
- When you want to generate distinct client-side hooks for these specific read
  operations.

**Example from our code:**

```typescript
// In src/server_actions/sample_actions.ts:

export const manageItems = createCrudServerAction({
  id: "manageItems",
  scope: "sample",
  read: async () => {
    // Fetches all items
    return items;
  },
  // ... create, update, remove
});

export const getItemById = manageItems.createVariant(
  "getItemById",
  async (id: string) => {
    // Fetches a single item by ID
    return items.find((item) => item.id === id);
  },
);
```

### 2. Generating Hooks

Client-side React Hooks are automatically generated from your server actions.
These hooks are placed into subdirectories corresponding to their action's
`scope`.

**How to Generate:**

- **Manual Generation:** To generate all hooks once, run:
  ```bash
  pnpm gen-hooks
  ```
  **Generated Hook Location:**

Hooks for a server action with `scope: "myScope"` and `id: "myAction"` will be
generated at: `src/server_actions/client/myScope/myAction.ts`

For example, `simpleAction` (scope: `"sample"`) generates
`src/server_actions/client/sample/simpleAction.ts`.

### 3. Using Generated Hooks in Client Components

Generated hooks can be imported and used in your client-side React components.

**Example: `src/app/sample/page.tsx`**

```typescript
// src/app/sample/page.tsx
"use client";
import { useManageItems } from "@/server_actions/client/sample/manageItems";
import { useSimpleAction } from "@/server_actions/client/sample/simpleAction";
import { useState } from "react";

export default function SamplePage() {
  const [itemId, setItemId] = useState("1");
  // Use the useManageItems hook (read all items)
  const { data: items, isLoading: isLoadingItems } = useManageItems(null);
  // Use the useManageItems hook (variant to get item by ID)
  const { data: item, isLoading: isLoadingItem } = useManageItems(
    "getItemById",
    itemId,
  );
  // Use the useSimpleAction hook
  const { data: simpleActionResult, refetch: runSimpleAction } =
    useSimpleAction("Hello from client");

  // Access mutation functions from useManageItems
  const { create, update, remove } = useManageItems(null);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Sample Page for Server Action Hooks
      </h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">useSimpleAction</h2>
        <button className="btn" onClick={() => runSimpleAction()}>
          Run Simple Action
        </button>
        {simpleActionResult && (
          <p className="mt-2">Result: {simpleActionResult}</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">useManageItems</h2>
        <div className="flex gap-2 mb-4">
          <button
            className="btn btn-primary"
            onClick={() =>
              create.mutate({
                name: "New Item",
                description: "A new item created from the client",
              })
            }
          >
            Create Item
          </button>
          <button
            className="btn btn-secondary"
            onClick={() =>
              items &&
              items.length > 0 &&
              update.mutate({ ...items[0], name: "Updated Item Name" })
            }
            disabled={!items || items.length === 0}
          >
            Update First Item
          </button>
          <button
            className="btn btn-accent"
            onClick={() =>
              items && items.length > 0 && remove.mutate({ id: items[0].id })
            }
            disabled={!items || items.length === 0}
          >
            Remove First Item
          </button>
        </div>

        {isLoadingItems && <p>Loading items...</p>}

        <h3 className="text-lg font-semibold mt-4">All Items:</h3>
        <ul className="list-disc list-inside">
          {items?.map((item) => (
            <li key={item.id}>
              {item.name}: {item.description}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <h3 className="text-lg font-semibold">Get Item by ID (variant)</h3>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={itemId}
              onChange={(e) => setItemId(e.target.value)}
              className="input input-bordered"
              placeholder="Enter Item ID"
            />
          </div>
          {isLoadingItem && <p className="mt-2">Loading item...</p>}
          {item && (
            <div className="mt-2">
              <p>
                <b>ID:</b> {item.id}
              </p>
              <p>
                <b>Name:</b> {item.name}
              </p>
              <p>
                <b>Description:</b> {item.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

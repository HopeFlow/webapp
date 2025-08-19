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
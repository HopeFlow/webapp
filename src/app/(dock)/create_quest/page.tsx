import { withUser } from "@/helpers/server/page_component";
import { CreateQuestMain } from "./main";
import { user2SafeUser } from "@/helpers/server/auth";

export default withUser(async function CreateQuest({ user }) {
  // TODO: Protected routes are guaranteed to have user defined
  if(!user) return null;
  return <CreateQuestMain user={user2SafeUser(user)} />;
});

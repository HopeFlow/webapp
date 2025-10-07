import { ProfileMain } from "./main";
import { Prefetch, withUser } from "@/helpers/server/page_component";
import { user2SafeUser } from "@/helpers/server/auth";
import { prefetchProfile } from "@/server_actions/client/profile/userProfileCrud";

export default withUser(async function Profile({ user }) {
  if (!user) return null;
  const safeUser = user2SafeUser(user);

  return (
    <Prefetch actions={[prefetchProfile()]}>
      <ProfileMain user={safeUser} />
    </Prefetch>
  );
});

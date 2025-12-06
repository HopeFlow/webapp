import { ProfileMain } from "./main";
import { Prefetch, withUser } from "@/helpers/server/page_component";
import { user2SafeUser } from "@/helpers/server/auth";
import { prefetchReadCurrentUserProfile } from "@/apiHooks/profile/readCurrentUserProfile";

export default withUser(async function Profile({ user }) {
  if (!user) return null;
  const safeUser = user2SafeUser(user);

  return (
    <Prefetch actions={[prefetchReadCurrentUserProfile()]}>
      <ProfileMain user={safeUser} />
    </Prefetch>
  );
});

import { MobileDock } from "@/components/mobile_dock";
import { MobileHeader } from "@/components/mobile_header";
import { Sidebar } from "@/components/sidebar";
import { currentUserNoThrow, user2SafeUser } from "@/helpers/server/auth";

export default async function DockedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUserNoThrow();
  if (!user) return null;
  return (
    <div className="flex-1 w-full flex flex-row items-stretch">
      <Sidebar user={user2SafeUser(user)} />
      <div className="flex-1 bg-base-200 relative">
        <div className="absolute top-0 left-0 w-full h-full flex flex-col items-center justify-center">
          <MobileHeader user={user2SafeUser(user)} />
          <div className="w-full flex-1 flex flex-col gap-4 items-stretch justify-start relative">
            {children}
          </div>
          <MobileDock />
        </div>
      </div>
    </div>
  );
}

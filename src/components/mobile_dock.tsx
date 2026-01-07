import { GhostButton } from "./button";
import { BellIcon } from "./icons/bell";
import { HomeIcon } from "./icons/home";
import { TrophyIcon } from "./icons/trophy";
import { NotificationBadge } from "./notification_badge";

export const MobileDock = () => {
  return (
    <div className="h-14 w-full md:hidden">
      <div className="dock dock-sm">
        <GhostButton className="dock-active">
          <HomeIcon />
        </GhostButton>
        <GhostButton>
          <div className="relative">
            <BellIcon />
            <NotificationBadge className="absolute -top-1 -right-1" />
          </div>
        </GhostButton>
        <GhostButton>
          <TrophyIcon />
        </GhostButton>
      </div>
    </div>
  );
};

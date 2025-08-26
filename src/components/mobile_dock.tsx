import { GhostButton } from "./button";
import { BellIcon } from "./icons/bell";
import { HomeIcon } from "./icons/home";
import { TrophyIcon } from "./icons/trophy";

export const MobileDock = () => (
  <div className="w-full h-14 md:hidden">
    <div className="dock dock-sm">
      <GhostButton className="dock-active">
        <HomeIcon />
      </GhostButton>
      <GhostButton>
        <BellIcon />
      </GhostButton>
      <GhostButton>
        <TrophyIcon />
      </GhostButton>
    </div>
  </div>
);

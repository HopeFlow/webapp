import { HopeflowLogo } from "@/components/logos/hopeflow";

const SplashScreen = () => (
  <div
    data-testid="splashScreen"
    className="flex-1 flex h-full w-full items-center justify-center bg-[#12a17d]"
  >
    <HopeflowLogo size={100} fillColor="#f8f8f8" />
  </div>
);

export default SplashScreen;

import { Button } from "@/components/button";
import { MobileHeader } from "@/components/mobile_header";
import { Sidebar } from "@/components/sidebar";
import Image from "next/image";

export function ProfileMain({
  command,
  url,
}: {
  command?: "create";
  url?: string;
}) {
  return (
    <div className="flex-1 w-full flex flex-row items-stretch">
      <Sidebar />
      <div className="flex-1 relative">
        <div className="absolute top-0 left-0 w-full h-full bg-base-200 flex flex-col">
          <MobileHeader />
          <div className="relative max-w-3xl w-full flex-1 overflow-auto p-8">
            <div className="flex flex-col gap-4 md:gap-12 items-start justify-start">
              <h1 className="font-normal text-2xl md:text-5xl">
                Complete your profile ...
              </h1>
              <div className="w-full flex flex-col gap-4 md:flex-row md:gap-12">
                <div className="flex flex-col md:items-center gap-4">
                  <h2 className="font-normal">Profile picture</h2>
                  <div className="w-36 h-36 bg-neutral rounded-box" />
                </div>
                <div className="flex-1 flex flex-col items-start gap-4">
                  <h2 className="font-normal">Name</h2>
                  <input
                    type="input"
                    placeholder="e.g. Jane Doe"
                    className="input input-bordered w-full mb-4"
                  />
                </div>
              </div>
              <div className="w-full flex flex-col md:flex-row md:gap-12 justify-between">
                <label className="flex flex-row gap-2 items-center justify-between">
                  Show Notifications{" "}
                  <input
                    type="checkbox"
                    defaultChecked={false}
                    className="toggle"
                  />
                </label>
                <i className="hidden md:inline">
                  {" "}
                  (You will have to confirm receiving notifications)
                </i>
              </div>
              <div className="w-full flex flex-col gap-4 md:flex-row md:gap-12 justify-between">
                <label className="flex flex-row gap-2 items-center justify-between">
                  Send Emails{" "}
                  <input
                    type="checkbox"
                    defaultChecked={false}
                    className="toggle"
                  />
                </label>
                <label className="flex flex-row gap-2 items-center">
                  Frequency{" "}
                  <select defaultValue="Weekly" className="select">
                    <option>Weekly</option>
                    <option>Monthly</option>
                    <option>Never</option>
                  </select>
                </label>
                <div className="flex flex-row gap-2 items-center">
                  Timezone{" "}
                  <select defaultValue="Europe/Berlin" className="select">
                    <option>Europe/Berlin</option>
                    <option>Pacific Time</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div className="p-4 flex flex-row justify-end bg-base-100 md:bg-transparent">
            <Button buttonType="primary" buttonSize="lg">
              Save and continue
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

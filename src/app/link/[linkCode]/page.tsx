import { z } from "zod";
import { withParams } from "@/helpers/server/with_params";
import Image from "next/image";

const UserAvatarAndMenu = () => {
  return (
    <div className="dropdown dropdown-bottom dropdown-end">
      <div tabIndex={0} role="button" className="btn btn-ghost btn-circle m-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-12"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
          />
        </svg>
      </div>
      <div tabIndex={0}>
        <ul className="menu dropdown-content bg-base-100 rounded-box z-1 w-52 p-2 shadow-sm">
          <li>
            <a>Profile</a>
          </li>
          <li>
            <a>Settings</a>
          </li>
          <li>
            <a>Log out</a>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default withParams(
  async function LinkPage() {
    return (
      <div className="w-full h-full flex flex-col bg-base-200">
        <div className="w-full h-16 p-4 bg-base-100 flex flex-row gap-4 items-center justify-between lg:hidden">
          <Image
            src="/img/wordmark.webp"
            className="max-w-full"
            alt="Home"
            width={118}
            height={37}
          />
          <div className="flex flex-col gap-4 [&>*]:w-full">
            <UserAvatarAndMenu />
          </div>
        </div>
        <h1 className="font-normal text-3xl p-6 pb-0">
          Stolen Sentimental Trek Grando
        </h1>
        <div className="w-full h-80  p-6 pb-0 flex items-center justify-center">
          <div className="relative w-full h-full rounded-2xl overflow-hidden shadow-lg">
            <Image
              src="/img/trek-520-grando-51cm-v0.jpeg"
              alt="Trek Grando"
              width={4032}
              height={3024}
              className="absolute h-full left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
            />
          </div>
        </div>
      </div>
    );
  },
  { paramsTypeDef: z.object({ linkCode: z.string() }) },
);

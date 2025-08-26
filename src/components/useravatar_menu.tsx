import { cn } from "@/helpers/client/tailwind_helpers";

export const UserAvatarAndMenu = ({
  placeLeftBottom,
}: {
  placeLeftBottom?: boolean;
}) => {
  return (
    <div
      className={cn(
        "dropdown",
        placeLeftBottom
          ? "dropdown-bottom dropdown-end"
          : "dropdown-top dropdown-start",
      )}
    >
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

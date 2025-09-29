import { ShareIcon } from "@/components/icons/share";
import { Avatar } from "@/components/user_avatar";

export const StarterQuestCardNodes = ({
  nodes,
}: {
  nodes: Array<{
    name: string;
    activityDate: Date;
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
  }>;
}) => (
  <div className="relative flex flex-col self-stretch items-center justify-between">
    <div className="flex flex-col items-center gap-1 text-neutral-500">
      <ShareIcon />
      <h2>{nodes.length - 1}</h2>
    </div>
    <div className="h-4"></div>
    {nodes.length > 1 && (
      <>
        <div className="flex flex-row text-xs items-center justify-center">
          10 min
        </div>
        <Avatar
          className="w-8 md:w-12 border-3 border-primary rounded-full"
          {...nodes[nodes.length - 1]}
        />
      </>
    )}
    {nodes.length > 1 && <hr className="flex-1 w-0 border-primary border-2" />}
    {nodes.length > 5 && (
      <hr className="flex-1 w-0 border-primary border-2 border-dashed" />
    )}
    {nodes.length > 2 && (
      <>
        <div className="flex flex-col -space-y-3">
          {nodes.slice(-4, -1).map((avatar, i) => (
            <Avatar
              key={`avatar-${i + 1}`}
              className="w-6 md:w-9 border-3 border-primary rounded-full"
              {...avatar}
            />
          ))}
        </div>
        <hr className="flex-1 w-1 bg-primary border-none" />
      </>
    )}
    <Avatar
      className="w-8 md:w-12 border-3 border-primary rounded-full"
      {...nodes[0]}
    />
    <div className="absolute bottom-0 left-[calc(100%+0.5rem)] w-auto text-sm">
      <h1 className="font-bold">{nodes[0].name.replace(" ", "\xA0")}</h1>
      <p className="text-xs">2 days</p>
    </div>
  </div>
);

export const ContributorQuestCardNodes = ({
  nodes,
}: {
  nodes: Array<{
    name: string;
    activityDate: Date;
    imageUrl: string;
    imageWidth: number;
    imageHeight: number;
  }>;
}) => (
  <div className="relative flex flex-col self-stretch items-center justify-between">
    {nodes.length > 1 && (
      <Avatar
        className="w-8 md:w-12 border-3 border-primary rounded-full"
        {...nodes[nodes.length - 1]}
      />
    )}
    {nodes.length > 1 && <hr className="flex-1 w-0 border-primary border-2" />}
    {nodes.length > 2 && (
      <>
        <hr className="flex-4 w-0 border-primary border-2 border-dashed" />
        <hr className="flex-1 w-0 border-primary border-2" />
      </>
    )}
    <Avatar
      className="w-6 md:w-8 border-3 border-primary rounded-full"
      {...nodes[0]}
    />
    <div className="absolute bottom-0 left-[calc(100%+0.5rem)] w-auto text-sm">
      <h1 className="font-bold">{nodes[0].name.replace(" ", "\xA0")}</h1>
      <p className="text-xs">2 days</p>
    </div>
  </div>
);

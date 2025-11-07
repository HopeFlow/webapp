import { JSX, ReactNode } from "react";
import { socialMediaNames } from "@/db/constants";

export type SocialMediaName = (typeof socialMediaNames)[number];

export type SvgProps = { strokeWidth?: number; size?: number };
export type IconProps = React.HTMLAttributes<HTMLDivElement> & SvgProps;
export type IconElement = (props: IconProps) => JSX.Element;
// Types
export type ReFlowNode = {
  readonly children: ReadonlyArray<ReFlowNode>;
  readonly title?: string;
  readonly createdAt: Date;
  readonly icon?: IconElement;
  readonly imageUrl?: string | null;
  readonly potentialNode?: boolean;
  readonly tooltip?: ReactNode;
  readonly targetNode?: boolean;
  readonly rank?: number;
};

export type ReFlowNodeSimple = Omit<ReFlowNode, "icon" | "children"> & {
  id: string;
  children: Array<ReFlowNodeSimple>;
  referer: SocialMediaName | null;
};

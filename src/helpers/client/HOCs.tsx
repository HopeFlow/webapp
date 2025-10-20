import React from "react";

/**
 * When `isLoading` is true, all original props are disallowed/omitted.
 * When `isLoading` is false (or absent), the wrapped component's props are required as usual.
 */
export type WithLoadingProps<P> =
  | ({ isLoading: true } & { [K in keyof P]?: never })
  | ({ isLoading?: false } & P);

/**
 * HOC: add `isLoading` support to any component with a *user-supplied skeleton* at wrap-time.
 */
export function withLoading<P>(
  Wrapped: React.ComponentType<P & React.Attributes>,
  Skeleton: React.ComponentType | React.ReactNode,
) {
  type Props = WithLoadingProps<P>;

  const WithLoadingComponent: React.FC<Props> = (props) => {
    const { isLoading = false } = props as { isLoading?: boolean };

    if (isLoading) {
      if (React.isValidElement(Skeleton)) return Skeleton as React.ReactElement;
      if (typeof Skeleton === "function") {
        const S = Skeleton as React.ComponentType;
        return <S />;
      }
      // If a plain node (string/number/fragment) was passed
      return <>{Skeleton}</>;
    }

    // Not loading: render the wrapped component with its real props.
    const { isLoading: _i, ...rest } = props as Record<string, unknown>;
    return <Wrapped {...(rest as P & React.Attributes)} />;
  };

  WithLoadingComponent.displayName = `WithLoading(${Wrapped.displayName || Wrapped.name || "Component"})`;

  return WithLoadingComponent;
}

/** -----------------------------------------
 * USAGE EXAMPLES
 * ------------------------------------------

// Given some component with required props

type UserCardProps = { id: string; name: string; points: number };
const UserCard: React.FC<UserCardProps> = ({ id, name, points }) => (
  <article className="rounded-2xl border p-4">
    <h2 className="text-xl font-semibold">{name}</h2>
    <p className="text-sm text-neutral-600">#{id} · {points} pts</p>
  </article>
);

const SkeletonBlock: React.FC = () => (
  <div role="status" aria-busy className="animate-pulse rounded-xl border p-4">
    <div className="mb-3 h-6 w-1/3 rounded bg-neutral-200" />
    <div className="mb-2 h-4 w-full rounded bg-neutral-200" />
    <div className="mb-2 h-4 w-11/12 rounded bg-neutral-200" />
    <div className="h-4 w-10/12 rounded bg-neutral-200" />
    <span className="sr-only">Loading…</span>
  </div>
);

// Wrap with a single, HOC-level skeleton (component or element)
const UserCardWithLoading = withLoading<UserCardProps>(UserCard, <SkeletonBlock />);
// Or: const UserCardWithLoading = withLoading<UserCardProps>(UserCard, SkeletonBlock);

// ✅ No required props needed while loading
// <UserCardWithLoading isLoading />

// ✅ Normal usage when data has loaded
// <UserCardWithLoading id="42" name="Ada" points={1337} />

*/

// Identity HOCs used purely as markers for the route generator.
//  do NOTHING at runtime — your generator just detects them.
export const withPublic = <P>(Comp: (p: P) => any) => Comp;

// The lifecycle states of an async data load (see LoadState in useSkins).
//
// A const-object "enum" rather than a TS `enum`: the project runs .ts files via
// Node's type-stripping (tsconfig `erasableSyntaxOnly`), which forbids `enum`
// since it emits runtime code. This pattern gives the same LoadStatus.Loading
// ergonomics plus a LoadStatus type, while erasing cleanly to nothing.
export const LoadStatus = {
  Loading: "loading",
  Error: "error",
  Ready: "ready",
} as const;

export type LoadStatus = (typeof LoadStatus)[keyof typeof LoadStatus];

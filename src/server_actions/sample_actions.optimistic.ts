import type { CrudOptimisticConfig } from "@/helpers/client/type_helpers";
import type { Item } from "./sample_actions";

type VMap = {
  getItemById: { result: Item | undefined; args: [string] };
};

export const manageItemsOptimistic: CrudOptimisticConfig<
  Omit<Item, "id">, // C
  Item[], // R
  Item, // U
  { id: string }, // D
  [], // P
  VMap
> = {
  create: {
    read: (prev, { data }) => [...(prev ?? []), { ...data, id: "__temp__" }],
    variants: {
      getItemById: (_prev, { data }) => ({ ...data, id: "__temp__" }),
    },
    buildVariantArgs: {
      getItemById: () => [""], // unknown id pre-server; still okay to skip if you want
    },
  },
  update: {
    read: (prev, { data }) =>
      (prev ?? []).map((i) => (i.id === data.id ? { ...i, ...data } : i)),
    variants: {
      getItemById: (prev, { data }) =>
        prev && prev.id === data.id ? { ...prev, ...data } : prev,
    },
    buildVariantArgs: {
      getItemById: ({ data }) => [data.id],
    },
  },
  remove: {
    read: (prev, { data }) => (prev ?? []).filter((i) => i.id !== data.id),
    variants: {
      getItemById: (_prev, { data }) => undefined,
    },
    buildVariantArgs: {
      getItemById: ({ data }) => [data.id],
    },
  },
};

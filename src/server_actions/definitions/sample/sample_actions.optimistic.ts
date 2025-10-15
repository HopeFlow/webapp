import type { CrudOptimisticConfig } from "@/helpers/client/type_helpers";
import type { Item } from "./sample_actions";

type VMap = { getItemById: { result: Item | undefined; args: [string] } };

export const manageItemsOptimistic: CrudOptimisticConfig<
  Omit<Item, "id">, // C
  Item[], // R
  Item, // U
  { id: number }, // D
  [], // P
  VMap
> = {
  create: {
    read: (prev, { data }) => [...(prev ?? []), { ...data, id: -1234 } as Item],
    variants: { getItemById: (_prev, { data }) => ({ ...data, id: -1234 }) },
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
    buildVariantArgs: { getItemById: ({ data }) => [data.id] },
  },
  remove: {
    read: (prev, { data }) => (prev ?? []).filter((i) => i.id !== data.id),
    variants: { getItemById: (_prev, { data }) => undefined },
    buildVariantArgs: { getItemById: ({ data }) => [data.id] },
  },
};

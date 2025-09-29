"use client";
import { useManageItems } from "@/server_actions/client/sample/manageItems";
import { useSimpleAction } from "@/server_actions/client/sample/simpleAction";
import { useState } from "react";

export default function SamplePage() {
  // const asciiName = await transliterate("بهروز ودادیان");
  // return <div>Hello {asciiName}</div>;

  const [itemId, setItemId] = useState(1);
  const { data: item, isLoading: isLoadingItem } = useManageItems(
    "getItemById",
    itemId,
  );
  const { data: simpleActionResult, refetch: runSimpleAction } =
    useSimpleAction("Hello from client");

  const {
    data: items,
    isLoading: isLoadingItems,
    create,
    update,
    remove,
  } = useManageItems(null);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">
        Sample Page for Server Action Hooks
      </h1>

      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">useSimpleAction</h2>
        <button className="btn" onClick={() => runSimpleAction()}>
          Run Simple Action
        </button>
        {simpleActionResult && (
          <p className="mt-2">Result: {simpleActionResult}</p>
        )}
      </div>

      <div>
        <h2 className="text-xl font-semibold mb-2">useManageItems</h2>
        <p className="mb-4">
          The create, update, and remove actions have an artificial 2-second
          delay to simulate network latency. Notice how the UI updates instantly
          when you perform an action, thanks to optimistic updates.
        </p>
        <div className="flex gap-2 mb-4">
          <button
            className="btn btn-primary"
            onClick={() =>
              create.mutate({
                name: "New Item",
                description: "A new item created from the client",
              })
            }
            disabled={create.isPending}
          >
            {create.isPending ? "Creating..." : "Create Item"}
          </button>
        </div>

        {isLoadingItems && <p>Loading items...</p>}

        <h3 className="text-lg font-semibold mt-4">All Items:</h3>
        <ul className="list-disc list-inside space-y-2">
          {items?.map((item) => (
            <li key={item.id} className="flex items-center gap-4">
              <span>
                {item.name}: {item.description}
              </span>
              <button
                className="btn btn-sm btn-secondary"
                onClick={() =>
                  update.mutate({ ...item, name: item.name + " (updated)" })
                }
                disabled={update.isPending}
              >
                {update.isPending && update.variables?.id === item.id
                  ? "Updating..."
                  : "Update"}
              </button>
              <button
                className="btn btn-sm btn-accent"
                onClick={() => remove.mutate({ id: item.id })}
                disabled={remove.isPending}
              >
                {remove.isPending && remove.variables?.id === item.id
                  ? "Removing..."
                  : "Remove"}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <h3 className="text-lg font-semibold">Get Item by ID (variant)</h3>
          <div className="flex items-center gap-2 mt-2">
            <input
              type="text"
              value={itemId}
              onChange={(e) => setItemId(parseInt(e.target.value))}
              className="input input-bordered"
              placeholder="Enter Item ID"
            />
          </div>
          {isLoadingItem && <p className="mt-2">Loading item...</p>}
          {item && (
            <div className="mt-2">
              <p>
                <b>ID:</b> {item.id}
              </p>
              <p>
                <b>Name:</b> {item.name}
              </p>
              <p>
                <b>Description:</b> {item.description}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

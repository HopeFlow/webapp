"use client";
import { useManageItems } from "@/server_actions/client/sample/manageItems";
import { useSimpleAction } from "@/server_actions/client/sample/simpleAction";
import { useState } from "react";

export default function SamplePage() {
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
      <h1 className="mb-4 text-2xl font-bold">
        Sample Page for Server Action Hooks
      </h1>

      <div className="mb-8">
        <h2 className="mb-2 text-xl font-semibold">useSimpleAction</h2>
        <button className="btn" onClick={() => runSimpleAction()}>
          Run Simple Action
        </button>
        {simpleActionResult && (
          <p className="mt-2">Result: {simpleActionResult}</p>
        )}
      </div>

      <div>
        <h2 className="mb-2 text-xl font-semibold">useManageItems</h2>
        <div className="mb-4 flex gap-2">
          <button
            className="btn btn-primary"
            onClick={() =>
              create.mutate({
                name: "New Item",
                description: "A new item created from the client",
              })
            }
          >
            Create Item
          </button>
          <button
            className="btn btn-secondary"
            onClick={() =>
              items &&
              items.length > 0 &&
              update.mutate({ ...items[0], name: "Updated Item Name" })
            }
            disabled={!items || items.length === 0}
          >
            Update First Item
          </button>
          <button
            className="btn btn-accent"
            onClick={() =>
              items && items.length > 0 && remove.mutate({ id: items[0].id })
            }
            disabled={!items || items.length === 0}
          >
            Remove First Item
          </button>
        </div>

        {isLoadingItems && <p>Loading items...</p>}

        <h3 className="mt-4 text-lg font-semibold">All Items:</h3>
        <ul className="list-inside list-disc">
          {items?.map((item) => (
            <li key={item.id}>
              {item.name}: {item.description}
            </li>
          ))}
        </ul>

        <div className="mt-8">
          <h3 className="text-lg font-semibold">Get Item by ID (variant)</h3>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="number"
              value={itemId}
              onChange={(e) => setItemId(Number(e.target.value))}
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

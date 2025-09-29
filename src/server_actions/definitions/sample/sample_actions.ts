"use server";
import {
  createCrudServerAction,
  createServerAction,
} from "@/helpers/server/create_server_action";

// Example 1: A simple server action using createServerAction
export const simpleAction = createServerAction({
  id: "simpleAction",
  scope: "sample",
  execute: async (message: string) => {
    console.log(`Message from simpleAction: ${message}`);
    return `Server received: ${message}`;
  },
});

// Example 2: A CRUD server action for managing 'items'
export interface Item {
  id: number;
  name: string;
  description?: string;
}

// Mock database
const items: Item[] = [
  { id: 1, name: "First Item", description: "A default item" },
  { id: 2, name: "Second Item" },
];

export const manageItems = createCrudServerAction({
  id: "manageItems",
  scope: "sample",
  // Read all items
  read: async () => {
    return items;
  },
  // Create a new item
  create: async (newItem: Omit<Item, "id">) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const item = { ...newItem, id: items.length + 1 };
    items.push(item);
    console.log("Created new item:", item);
    return true;
  },
  // Update an existing item
  update: async (itemToUpdate: Item) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const index = items.findIndex((item) => item.id === itemToUpdate.id);
    if (index !== -1) {
      items[index] = { ...items[index], ...itemToUpdate };
      console.log("Updated item:", items[index]);
      return true;
    }
    return false;
  },
  // Remove an item
  remove: async (itemToRemove: { id: number }) => {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const index = items.findIndex((item) => item.id === itemToRemove.id);
    if (index !== -1) {
      items.splice(index, 1);
      console.log("Removed item with id:", itemToRemove.id);
      return true;
    }
    return false;
  },
});

// Example 3: A variant of the 'manageItems' action to get a single item by ID
export const getItemById = manageItems.createVariant(
  "getItemById",
  async (id: number) => {
    console.log(`Getting item with id: ${id}`);
    return items.find((item) => item.id === id);
  },
);

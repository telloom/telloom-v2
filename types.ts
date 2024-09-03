export type InsertPromptCategory = {
  category: string;
  description?: string | null;
  // Note: id, updatedAt, and createdAt are typically handled by the database,
  // so we don't include them in the insert type
};

// Also make sure InsertObjectCategory is exported if it's not already
export type InsertObjectCategory = {
  name: string;
  description?: string | null;
};

// Add ActionState type
export type ActionState = {
  status: 'success' | 'error';
  message: string;
  data?: any; // You might want to make this more specific based on your needs
};

export interface InsertEntitlement {
  revenuecatId: string;
  lookupKey: string;
  displayName: string;
}

// ... other type definitions ...
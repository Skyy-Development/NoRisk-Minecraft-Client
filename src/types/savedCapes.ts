import { CosmeticCape } from './noriskCapes';

/**
 * Represents a saved cape in the local database with custom properties
 */
export interface SavedCapeInfo {
  /** Unique identifier for the cape (hash) */
  id: string;
  /** Display name of the cape */
  name: string;
  /** Whether the cape is marked as favorite */
  favorite: boolean;
  /** Tags associated with the cape */
  tags: string[];
  /** Timestamp when the cape was added */
  added_at: string;
}

/**
 * Represents a cape with optional saved information
 */
export interface CapeWithSavedInfo {
  /** The original cape data */
  cape: CosmeticCape;
  /** The saved information for this cape, if available */
  saved_info: SavedCapeInfo | null;
}
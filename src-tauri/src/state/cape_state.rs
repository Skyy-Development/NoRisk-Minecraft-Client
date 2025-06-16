use crate::config::{ProjectDirsExt, LAUNCHER_DIRECTORY};
use crate::error::Result;
use crate::state::post_init::PostInitializationHandler;
use async_trait::async_trait;
use log::{debug, error, info, warn};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use tokio::fs;
use tokio::sync::{Mutex, RwLock};

const CAPES_FILENAME: &str = "saved_capes.json";

/// Represents a saved cape in the local database
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedCape {
    /// Unique identifier for the cape (hash)
    pub id: String,
    /// Display name of the cape
    pub name: String,
    /// Whether the cape is marked as favorite
    #[serde(default)]
    pub favorite: bool,
    /// Tags associated with the cape
    #[serde(default)]
    pub tags: Vec<String>,
    /// Timestamp when the cape was added
    #[serde(default = "chrono::Utc::now")]
    pub added_at: chrono::DateTime<chrono::Utc>,
}

/// Container for all stored capes
#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct CapeDatabase {
    /// List of stored capes
    #[serde(default)]
    pub capes: Vec<SavedCape>,
}

/// Manager for handling cape storage
pub struct CapeManager {
    /// The cape database, protected by a read-write lock
    capes: Arc<RwLock<CapeDatabase>>,
    /// Path to the cape database file
    capes_path: PathBuf,
    /// Lock for synchronizing save operations
    save_lock: Mutex<()>,
}

impl CapeManager {
    /// Create a new cape manager
    pub fn new(capes_path: PathBuf) -> Result<Self> {
        info!(
            "CapeManager: Initializing with path: {:?} (capes loading deferred)",
            capes_path
        );
        Ok(Self {
            capes: Arc::new(RwLock::new(CapeDatabase::default())),
            capes_path,
            save_lock: Mutex::new(()),
        })
    }

    /// Load capes from the database file
    async fn load_capes_internal(&self) -> Result<()> {
        if !self.capes_path.exists() {
            info!("Capes database file not found, using empty database");
            // Save the empty database
            self.save_capes().await?;
            return Ok(());
        }

        info!("Loading capes database from: {:?}", self.capes_path);
        let capes_data = fs::read_to_string(&self.capes_path).await?;

        match serde_json::from_str::<CapeDatabase>(&capes_data) {
            Ok(loaded_capes) => {
                info!(
                    "Successfully loaded capes database with {} capes",
                    loaded_capes.capes.len()
                );

                // Update the stored capes
                let mut capes = self.capes.write().await;
                *capes = loaded_capes;
            }
            Err(e) => {
                error!("Failed to parse capes database file: {}", e);
                warn!("Using empty capes database and saving it");
                // Save the empty database to repair the file
                self.save_capes().await?;
            }
        }

        Ok(())
    }

    /// Save capes to the database file
    async fn save_capes(&self) -> Result<()> {
        let _guard = self.save_lock.lock().await;
        debug!("Acquired save lock, proceeding to save capes database...");

        // Ensure directory exists
        if let Some(parent_dir) = self.capes_path.parent() {
            if !parent_dir.exists() {
                fs::create_dir_all(parent_dir).await?;
                info!(
                    "Created directory for capes database file: {:?}",
                    parent_dir
                );
            }
        }

        let capes = self.capes.read().await;
        let capes_data = serde_json::to_string_pretty(&*capes)?;

        fs::write(&self.capes_path, capes_data).await?;
        info!(
            "Successfully saved capes database to: {:?}",
            self.capes_path
        );

        Ok(())
    }

    /// Get all saved capes from the database
    pub async fn get_all_saved_capes(&self) -> Vec<SavedCape> {
        debug!("Getting all saved capes from database");
        let capes = self.capes.read().await.capes.clone();
        debug!("Retrieved {} saved capes from database", capes.len());
        capes
    }

    /// Get a saved cape by its ID
    pub async fn get_saved_cape_by_id(&self, id: &str) -> Option<SavedCape> {
        debug!("Getting saved cape with ID: {}", id);
        let capes = self.capes.read().await;
        let cape = capes.capes.iter().find(|cape| cape.id == id).cloned();

        if cape.is_some() {
            debug!("Found saved cape with ID: {}", id);
        } else {
            debug!("No saved cape found with ID: {}", id);
        }

        cape
    }

    /// Add a new saved cape to the database
    pub async fn add_saved_cape(&self, cape: SavedCape) -> Result<()> {
        let mut capes = self.capes.write().await;

        // Check if a cape with this ID already exists
        if let Some(index) = capes.capes.iter().position(|s| s.id == cape.id) {
            // Replace the existing cape
            capes.capes[index] = cape;
            info!("Updated existing saved cape with ID: {}", capes.capes[index].id);
        } else {
            // Add the new cape
            capes.capes.push(cape);
            info!("Added new saved cape, total count: {}", capes.capes.len());
        }

        // Save the updated database
        drop(capes); // Release the write lock before saving
        self.save_capes().await?;

        Ok(())
    }

    /// Remove a saved cape from the database
    pub async fn remove_saved_cape(&self, id: &str) -> Result<bool> {
        let mut capes = self.capes.write().await;

        let initial_len = capes.capes.len();
        capes.capes.retain(|cape| cape.id != id);

        let removed = capes.capes.len() < initial_len;

        if removed {
            info!("Removed saved cape with ID: {}", id);
            // Save the updated database
            drop(capes); // Release the write lock before saving
            self.save_capes().await?;
        } else {
            info!("No saved cape found with ID: {}", id);
        }

        Ok(removed)
    }

    /// Update saved cape properties (name, favorite status, tags)
    pub async fn update_saved_cape_properties(
        &self,
        id: &str,
        name: Option<String>,
        favorite: Option<bool>,
        tags: Option<Vec<String>>,
    ) -> Result<Option<SavedCape>> {
        debug!("Updating saved cape properties for ID: {}", id);
        if let Some(name) = &name {
            debug!("New name: {}", name);
        }
        if let Some(favorite) = favorite {
            debug!("New favorite status: {}", favorite);
        }
        if let Some(tags) = &tags {
            debug!("New tags: {:?}", tags);
        }

        let mut capes = self.capes.write().await;

        // Find the cape with the given ID
        if let Some(index) = capes.capes.iter().position(|s| s.id == id) {
            // Update the cape properties
            if let Some(name) = name {
                capes.capes[index].name = name;
            }
            if let Some(favorite) = favorite {
                capes.capes[index].favorite = favorite;
            }
            if let Some(tags) = tags {
                capes.capes[index].tags = tags;
            }

            let updated_cape = capes.capes[index].clone();
            debug!("Successfully updated saved cape properties for ID: {}", id);

            // Save the updated database
            drop(capes); // Release the write lock before saving
            self.save_capes().await?;

            Ok(Some(updated_cape))
        } else {
            debug!("No saved cape found with ID: {}", id);
            Ok(None)
        }
    }

    /// Toggle the favorite status of a saved cape
    pub async fn toggle_favorite(&self, id: &str) -> Result<Option<SavedCape>> {
        debug!("Toggling favorite status for saved cape with ID: {}", id);

        let mut capes = self.capes.write().await;

        // Find the cape with the given ID
        if let Some(index) = capes.capes.iter().position(|s| s.id == id) {
            // Toggle the favorite status
            capes.capes[index].favorite = !capes.capes[index].favorite;
            let new_status = capes.capes[index].favorite;
            debug!("New favorite status for ID {}: {}", id, new_status);

            let updated_cape = capes.capes[index].clone();

            // Save the updated database
            drop(capes); // Release the write lock before saving
            self.save_capes().await?;

            Ok(Some(updated_cape))
        } else {
            debug!("No saved cape found with ID: {}", id);
            Ok(None)
        }
    }

    /// Get all saved capes that are marked as favorites
    pub async fn get_favorite_capes(&self) -> Vec<SavedCape> {
        debug!("Getting all favorite capes from database");
        let capes = self.capes.read().await;
        let favorite_capes: Vec<SavedCape> = capes
            .capes
            .iter()
            .filter(|cape| cape.favorite)
            .cloned()
            .collect();
        debug!("Retrieved {} favorite capes from database", favorite_capes.len());
        favorite_capes
    }

    /// Get all saved capes that have a specific tag
    pub async fn get_capes_by_tag(&self, tag: &str) -> Vec<SavedCape> {
        debug!("Getting all capes with tag '{}' from database", tag);
        let capes = self.capes.read().await;
        let tagged_capes: Vec<SavedCape> = capes
            .capes
            .iter()
            .filter(|cape| cape.tags.iter().any(|t| t == tag))
            .cloned()
            .collect();
        debug!(
            "Retrieved {} capes with tag '{}' from database",
            tagged_capes.len(),
            tag
        );
        tagged_capes
    }

    /// Add a tag to a saved cape
    pub async fn add_tag_to_cape(&self, id: &str, tag: &str) -> Result<Option<SavedCape>> {
        debug!("Adding tag '{}' to saved cape with ID: {}", tag, id);

        let mut capes = self.capes.write().await;

        // Find the cape with the given ID
        if let Some(index) = capes.capes.iter().position(|s| s.id == id) {
            // Add the tag if it doesn't already exist
            if !capes.capes[index].tags.iter().any(|t| t == tag) {
                capes.capes[index].tags.push(tag.to_string());
                debug!("Added tag '{}' to cape with ID: {}", tag, id);
            } else {
                debug!("Tag '{}' already exists for cape with ID: {}", tag, id);
            }

            let updated_cape = capes.capes[index].clone();

            // Save the updated database
            drop(capes); // Release the write lock before saving
            self.save_capes().await?;

            Ok(Some(updated_cape))
        } else {
            debug!("No saved cape found with ID: {}", id);
            Ok(None)
        }
    }

    /// Remove a tag from a saved cape
    pub async fn remove_tag_from_cape(&self, id: &str, tag: &str) -> Result<Option<SavedCape>> {
        debug!("Removing tag '{}' from saved cape with ID: {}", tag, id);

        let mut capes = self.capes.write().await;

        // Find the cape with the given ID
        if let Some(index) = capes.capes.iter().position(|s| s.id == id) {
            // Remove the tag if it exists
            capes.capes[index].tags.retain(|t| t != tag);
            debug!("Removed tag '{}' from cape with ID: {}", tag, id);

            let updated_cape = capes.capes[index].clone();

            // Save the updated database
            drop(capes); // Release the write lock before saving
            self.save_capes().await?;

            Ok(Some(updated_cape))
        } else {
            debug!("No saved cape found with ID: {}", id);
            Ok(None)
        }
    }
}

#[async_trait]
impl PostInitializationHandler for CapeManager {
    async fn on_state_ready(&self, _app_handle: Arc<tauri::AppHandle>) -> Result<()> {
        info!("CapeManager: on_state_ready called. Loading capes...");
        self.load_capes_internal().await?;
        info!("CapeManager: Successfully loaded capes in on_state_ready.");
        Ok(())
    }
}

/// Get the default path for the capes database file
pub fn default_capes_path() -> PathBuf {
    LAUNCHER_DIRECTORY.root_dir().join(CAPES_FILENAME)
}
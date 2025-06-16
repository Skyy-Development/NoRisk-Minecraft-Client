use crate::error::{Error, Result};
use crate::minecraft::api::cape_api::{BrowseCapesOptions, CapeApi, CosmeticCape};
use crate::state::LAUNCHER_STATE;
use log::{debug, error, info, warn};
use serde::{Deserialize, Serialize};
use tauri::command;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SavedCapeInfo {
    /// Unique identifier for the cape (hash)
    pub id: String,
    /// Display name of the cape
    pub name: String,
    /// Whether the cape is marked as favorite
    pub favorite: bool,
    /// Tags associated with the cape
    pub tags: Vec<String>,
    /// Timestamp when the cape was added
    pub added_at: chrono::DateTime<chrono::Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CapeWithSavedInfo {
    /// The original cape data
    pub cape: CosmeticCape,
    /// The saved information for this cape, if available
    pub saved_info: Option<SavedCapeInfo>,
}

/// Save a cape to the local database with custom properties
#[command]
pub async fn save_cape(
    id: String,
    name: String,
    favorite: bool,
    tags: Vec<String>,
) -> Result<SavedCapeInfo> {
    debug!("save_cape command called with id: {}, name: {}", id, name);

    let state = LAUNCHER_STATE.get().ok_or(Error::StateNotInitialized)?;
    let cape_manager = &state.cape_manager;

    // Create a new saved cape
    let saved_cape = crate::state::cape_state::SavedCape {
        id: id.clone(),
        name,
        favorite,
        tags,
        added_at: chrono::Utc::now(),
    };

    // Add the cape to the database
    cape_manager.add_saved_cape(saved_cape.clone()).await?;

    // Convert to the response type
    let saved_info = SavedCapeInfo {
        id: saved_cape.id,
        name: saved_cape.name,
        favorite: saved_cape.favorite,
        tags: saved_cape.tags,
        added_at: saved_cape.added_at,
    };

    Ok(saved_info)
}

/// Get all saved capes from the local database
#[command]
pub async fn get_all_saved_capes() -> Result<Vec<SavedCapeInfo>> {
    debug!("get_all_saved_capes command called");

    let state = LAUNCHER_STATE.get().ok_or(Error::StateNotInitialized)?;
    let cape_manager = &state.cape_manager;

    // Get all saved capes
    let saved_capes = cape_manager.get_all_saved_capes().await;

    // Convert to the response type
    let saved_info: Vec<SavedCapeInfo> = saved_capes
        .into_iter()
        .map(|cape| SavedCapeInfo {
            id: cape.id,
            name: cape.name,
            favorite: cape.favorite,
            tags: cape.tags,
            added_at: cape.added_at,
        })
        .collect();

    Ok(saved_info)
}

/// Get a saved cape by its ID
#[command]
pub async fn get_saved_cape_by_id(id: String) -> Result<Option<SavedCapeInfo>> {
    debug!("get_saved_cape_by_id command called with id: {}", id);

    let state = LAUNCHER_STATE.get().ok_or(Error::StateNotInitialized)?;
    let cape_manager = &state.cape_manager;

    // Get the saved cape
    if let Some(saved_cape) = cape_manager.get_saved_cape_by_id(&id).await {
        // Convert to the response type
        let saved_info = SavedCapeInfo {
            id: saved_cape.id,
            name: saved_cape.name,
            favorite: saved_cape.favorite,
            tags: saved_cape.tags,
            added_at: saved_cape.added_at,
        };

        Ok(Some(saved_info))
    } else {
        Ok(None)
    }
}

/// Update saved cape properties (name, favorite status, tags)
#[command]
pub async fn update_saved_cape_properties(
    id: String,
    name: Option<String>,
    favorite: Option<bool>,
    tags: Option<Vec<String>>,
) -> Result<Option<SavedCapeInfo>> {
    debug!("update_saved_cape_properties command called with id: {}", id);

    let state = LAUNCHER_STATE.get().ok_or(Error::StateNotInitialized)?;
    let cape_manager = &state.cape_manager;

    // Update the cape properties
    if let Some(updated_cape) = cape_manager
        .update_saved_cape_properties(&id, name, favorite, tags)
        .await?
    {
        // Convert to the response type
        let saved_info = SavedCapeInfo {
            id: updated_cape.id,
            name: updated_cape.name,
            favorite: updated_cape.favorite,
            tags: updated_cape.tags,
            added_at: updated_cape.added_at,
        };

        Ok(Some(saved_info))
    } else {
        Ok(None)
    }
}

/// Toggle the favorite status of a saved cape
#[command]
pub async fn toggle_cape_favorite(id: String) -> Result<Option<SavedCapeInfo>> {
    debug!("toggle_cape_favorite command called with id: {}", id);

    let state = LAUNCHER_STATE.get().ok_or(Error::StateNotInitialized)?;
    let cape_manager = &state.cape_manager;

    // Toggle the favorite status
    if let Some(updated_cape) = cape_manager.toggle_favorite(&id).await? {
        // Convert to the response type
        let saved_info = SavedCapeInfo {
            id: updated_cape.id,
            name: updated_cape.name,
            favorite: updated_cape.favorite,
            tags: updated_cape.tags,
            added_at: updated_cape.added_at,
        };

        Ok(Some(saved_info))
    } else {
        Ok(None)
    }
}

/// Get all saved capes that are marked as favorites
#[command]
pub async fn get_favorite_capes() -> Result<Vec<SavedCapeInfo>> {
    debug!("get_favorite_capes command called");

    let state = LAUNCHER_STATE.get().ok_or(Error::StateNotInitialized)?;
    let cape_manager = &state.cape_manager;

    // Get all favorite capes
    let favorite_capes = cape_manager.get_favorite_capes().await;

    // Convert to the response type
    let saved_info: Vec<SavedCapeInfo> = favorite_capes
        .into_iter()
        .map(|cape| SavedCapeInfo {
            id: cape.id,
            name: cape.name,
            favorite: cape.favorite,
            tags: cape.tags,
            added_at: cape.added_at,
        })
        .collect();

    Ok(saved_info)
}

/// Get all saved capes that have a specific tag
#[command]
pub async fn get_capes_by_tag(tag: String) -> Result<Vec<SavedCapeInfo>> {
    debug!("get_capes_by_tag command called with tag: {}", tag);

    let state = LAUNCHER_STATE.get().ok_or(Error::StateNotInitialized)?;
    let cape_manager = &state.cape_manager;

    // Get all capes with the specified tag
    let tagged_capes = cape_manager.get_capes_by_tag(&tag).await;

    // Convert to the response type
    let saved_info: Vec<SavedCapeInfo> = tagged_capes
        .into_iter()
        .map(|cape| SavedCapeInfo {
            id: cape.id,
            name: cape.name,
            favorite: cape.favorite,
            tags: cape.tags,
            added_at: cape.added_at,
        })
        .collect();

    Ok(saved_info)
}

/// Add a tag to a saved cape
#[command]
pub async fn add_tag_to_cape(id: String, tag: String) -> Result<Option<SavedCapeInfo>> {
    debug!("add_tag_to_cape command called with id: {}, tag: {}", id, tag);

    let state = LAUNCHER_STATE.get().ok_or(Error::StateNotInitialized)?;
    let cape_manager = &state.cape_manager;

    // Add the tag to the cape
    if let Some(updated_cape) = cape_manager.add_tag_to_cape(&id, &tag).await? {
        // Convert to the response type
        let saved_info = SavedCapeInfo {
            id: updated_cape.id,
            name: updated_cape.name,
            favorite: updated_cape.favorite,
            tags: updated_cape.tags,
            added_at: updated_cape.added_at,
        };

        Ok(Some(saved_info))
    } else {
        Ok(None)
    }
}

/// Remove a tag from a saved cape
#[command]
pub async fn remove_tag_from_cape(id: String, tag: String) -> Result<Option<SavedCapeInfo>> {
    debug!(
        "remove_tag_from_cape command called with id: {}, tag: {}",
        id,
        tag
    );

    let state = LAUNCHER_STATE.get().ok_or(Error::StateNotInitialized)?;
    let cape_manager = &state.cape_manager;

    // Remove the tag from the cape
    if let Some(updated_cape) = cape_manager.remove_tag_from_cape(&id, &tag).await? {
        // Convert to the response type
        let saved_info = SavedCapeInfo {
            id: updated_cape.id,
            name: updated_cape.name,
            favorite: updated_cape.favorite,
            tags: updated_cape.tags,
            added_at: updated_cape.added_at,
        };

        Ok(Some(saved_info))
    } else {
        Ok(None)
    }
}

/// Remove a saved cape from the database
#[command]
pub async fn remove_saved_cape(id: String) -> Result<bool> {
    debug!("remove_saved_cape command called with id: {}", id);

    let state = LAUNCHER_STATE.get().ok_or(Error::StateNotInitialized)?;
    let cape_manager = &state.cape_manager;

    // Remove the cape from the database
    let removed = cape_manager.remove_saved_cape(&id).await?;

    Ok(removed)
}

/// Browse capes with saved information
#[command]
pub async fn browse_capes_with_saved_info(
    options: BrowseCapesOptions,
) -> Result<Vec<CapeWithSavedInfo>> {
    debug!("browse_capes_with_saved_info command called");

    let state = LAUNCHER_STATE.get().ok_or(Error::StateNotInitialized)?;
    let cape_manager = &state.cape_manager;

    // Get the NoRisk token
    let norisk_token = state.config_manager.get_norisk_token().await?;

    // Create a new CapeApi instance
    let cape_api = CapeApi::new(norisk_token);

    // Browse capes using the existing API
    let browse_response = cape_api.browse_capes(options).await?;

    // Get all saved capes
    let saved_capes = cape_manager.get_all_saved_capes().await;
    let saved_capes_map: std::collections::HashMap<String, crate::state::cape_state::SavedCape> =
        saved_capes
            .into_iter()
            .map(|cape| (cape.id.clone(), cape))
            .collect();

    // Combine the API response with saved information
    let capes_with_saved_info: Vec<CapeWithSavedInfo> = browse_response
        .capes
        .into_iter()
        .map(|cape| {
            let saved_info = saved_capes_map.get(&cape.hash).map(|saved_cape| SavedCapeInfo {
                id: saved_cape.id.clone(),
                name: saved_cape.name.clone(),
                favorite: saved_cape.favorite,
                tags: saved_cape.tags.clone(),
                added_at: saved_cape.added_at,
            });

            CapeWithSavedInfo {
                cape,
                saved_info,
            }
        })
        .collect();

    Ok(capes_with_saved_info)
}

// download_cape command removed
                        ┌─────────────────────┐ ┌──────────────────────┐         ┌─────────────────────┐
                        │      profiles       │ │     categories       │         │      countries      │
                        │                     │ │                      │         │                     │
                        │ • _id (BigInt) PK   │ │ • _id (Int) PK       │         │ • _id (Int) PK      │
                        │ • name (String)     │ │ • name (String)      │         │ • name (String)     │
                        │ • thumb (String)    │ │ • thumb (String)     │         │                     │
                        │ • avatar_path       │ │                      │         └─────────────────────┘
                        │   (String?)         │ └──────────┬───────────┘
                        │ • backgound_path    │            │
                        │   (String?)         │            │ 1:N
                        │ • wallpaper_ids     │            │
                        │   (String[])        │            ▼
                        │ • nsfw_adult        │     ┌──────────────────────┐
                        │   (String[])        │     │        albums        │
                        │ • nsfw_racy         │ ┌───┤                      │
                        │   (String[])        │ │   │ • _id (Int) PK       │
                        └─────────────────────┘ │   │ • name (String)      │         ┌─────────────────────┐
                                                │   │ • thumb (String)     │         │        tags         │
                                                │   │ • category_id (Int)  │         │                     │
                                                │   │ • tags (String[])    │         │ • _id (Int) PK      │
                                                │   │ • countries          │         │ • name (String)     │
                                                │   │   (String[])         │         │ • thumb (String)    │
                                                │   │ • wallpaper_ids      │         │                     │
                                                │   │   (String[])         │         └─────────────────────┘
                                                │   │ • nsfw_adult         │
                                                │   │   (String[])         │
                                                │   │ • nsfw_racy          │
                                                │   │   (String[])         │
                                                │   │ • map_status         │
                                                │   │   (Boolean)          │
                                                │   └──────────────────────┘
                                                │
                                                ▼
                                    ┌─────────────────────────┐
                                    │       wallpapers        │
                                    │                         │         ┌──────────────────────────┐
                                    │ • _id (ObjectId) PK     │         │  tracking_collections    │
                                    │ • name (String)         │         │                          │
                                    │ • url (String)          │         │ • _id (ObjectId) PK      │
                                    │ • preview_url (String)  │         │ • collection_provider    │
                                    │ • album_id (BigInt?)    │         │   (String)               │
                                    │ • model_id (String)     │         │ • collection_id (Int)    │
                                    │ • author_id (String)    │         │ • collection_topic       │
                                    │ • folder_no (String)    │         │   (String)               │
                                    │ • tracking_type         │         │ • collection_style       │
                                    │   (String)              │         │   (String)               │
                                    │ • tracking_collection_id│         │ • collection_link        │
                                    │   (Int)                 │         │   (String?)              │
                                    └─────────────────────────┘         │ • collection_type        │
                                                                        │   (String)               │
                                                                        │ • collection_target_id   │
                                                                        │   (String)               │
                                                                        │ • collection_status      │
                                                                        │   (String)               │
                                                                        │ • items_total (Int)      │
                                                                        │ • created_at (BigInt)    │
                                                                        └──────────────────────────┘
                        
                        ┌─────────────────────────┐    1:N      ┌──────────────────────────┐
                        │      seaart_works       │ ◄────────── │      account_items       │
                        │                         │             │                          │
                        │ • _id (ObjectId) PK     │             │ • _id (ObjectId) PK      │
                        │ • model_id (String)     │             │ • sea_art_work_id        │
                        │ • prompt (String)       │             │   (ObjectId) FK          │
                        │ • local_prompt          │             │                          │
                        │   (String?)             │             └──────────────────────────┘
                        │ • banner (Json)         │
                        │ • author_id (String)    │
                        │ • folder_no (String)    │
                        │ • obj_type (String?)    │
                        │ • sub_obj_type          │
                        │   (String?)             │
                        │ • title (String?)       │
                        │ • cover (String?)       │
                        │ • status (Boolean)      │
                        │ • tracking_type         │
                        │   (String)              │
                        │ • tracking_collection_id│
                        │   (Int)                 │
                        └─────────────────────────┘
                        
                        ┌─────────────────────────┐    1:N      ┌─────────────────────────────┐
                        │   seaart_collections    │ ◄────────── │ seaart_collection_items     │
                        │                         │             │                             │
                        │ • _id (ObjectId) PK     │             │ • _id (ObjectId) PK         │
                        │ • name (String)         │             │ • banner (String)           │
                        │ • category (Int)        │             │ • banner_width (Int)        │
                        │ • tracking_collection_id│             │ • banner_height (Int)       │
                        │   (Int)                 │             │ • collection_id             │
                        └─────────────────────────┘             │   (ObjectId) FK             │
                                                                └─────────────────────────────┘
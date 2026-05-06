// Tauri 2 entry point. Mobile-friendly export so the same crate can be
// reused for future iOS/Android targets.

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .setup(|_app| {
            // Sidecar lifecycle (spawning the bundled Python binary, reading
            // its port from stdout, and re-spawning on crash) will be wired
            // up here. For now, dev runs the sidecar separately via uv.
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

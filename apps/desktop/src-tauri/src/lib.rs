// Tauri 2 entry point. Mobile-friendly export so the same crate can be
// reused for future iOS/Android targets.

mod sidecar;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .manage(sidecar::SidecarState::default())
        .invoke_handler(tauri::generate_handler![sidecar::get_sidecar_port])
        .setup(|app| {
            // Bundled Python sidecar lives in src-tauri/binaries and is
            // bundled by Tauri at build time. In `tauri dev` it gets
            // copied into the dev binary's resource path automatically.
            sidecar::spawn(&app.handle())?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

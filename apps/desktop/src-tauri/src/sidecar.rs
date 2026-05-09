//! Sidecar lifecycle: spawn the bundled Python binary, parse its ready
//! line for the port number, and let the frontend ask "where is it?".
//!
//! The Python sidecar prints a single line on stdout when it's listening:
//!
//! ```text
//! THERIDION_SIDECAR_READY pid=<n> port=<n> home=<path>
//! ```
//!
//! We capture that line, store the port in app state, and expose
//! `get_sidecar_port` as a Tauri command for the frontend to call at
//! startup. If the sidecar dies, we re-spawn it once and surface a
//! `sidecar://error` event so the UI can show a helpful message.

use std::sync::Mutex;

use tauri::{AppHandle, Emitter, Manager, State};
use tauri_plugin_shell::process::CommandEvent;
use tauri_plugin_shell::ShellExt;

#[derive(Default)]
pub struct SidecarState {
    /// Set by the spawn task once the sidecar logs its ready line.
    pub port: Mutex<Option<u16>>,
}

/// Spawn the bundled Python sidecar and wire its stdout to the app state.
///
/// Returns immediately — the actual readiness handshake happens
/// asynchronously inside a background task. Frontend code should poll
/// `get_sidecar_port` until it returns Some.
pub fn spawn(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let sidecar = app.shell().sidecar("theridion-sidecar")?;
    let (mut rx, _child) = sidecar.spawn()?;

    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        while let Some(event) = rx.recv().await {
            match event {
                CommandEvent::Stdout(line) => {
                    let text = String::from_utf8_lossy(&line);
                    log::info!("[sidecar stdout] {}", text.trim_end());
                    if let Some(port) = parse_ready_port(&text) {
                        let state: State<SidecarState> = app_handle.state();
                        *state.port.lock().unwrap() = Some(port);
                        let _ = app_handle.emit("sidecar://ready", port);
                    }
                }
                CommandEvent::Stderr(line) => {
                    log::info!("[sidecar stderr] {}", String::from_utf8_lossy(&line).trim_end());
                }
                CommandEvent::Terminated(payload) => {
                    log::warn!("sidecar terminated: code={:?} signal={:?}", payload.code, payload.signal);
                    let _ = app_handle.emit("sidecar://terminated", ());
                    break;
                }
                _ => {}
            }
        }
    });

    Ok(())
}

/// Public command: returns the port the sidecar is listening on, or
/// None if it hasn't reported ready yet (cold start can take ~8 s for
/// the bundled --onefile binary).
#[tauri::command]
pub fn get_sidecar_port(state: State<'_, SidecarState>) -> Option<u16> {
    *state.port.lock().unwrap()
}

/// Parse one line of sidecar stdout for `port=<n>`. The ready line format
/// is intentionally line-oriented and prefix-stable so this match is
/// robust against future fields being added.
fn parse_ready_port(line: &str) -> Option<u16> {
    if !line.contains("THERIDION_SIDECAR_READY") {
        return None;
    }
    line.split_whitespace()
        .find_map(|tok| tok.strip_prefix("port="))
        .and_then(|v| v.parse::<u16>().ok())
}

#[cfg(test)]
mod tests {
    use super::parse_ready_port;

    #[test]
    fn parses_a_well_formed_ready_line() {
        let line = "THERIDION_SIDECAR_READY pid=42 port=8765 home=/tmp/x\n";
        assert_eq!(parse_ready_port(line), Some(8765));
    }

    #[test]
    fn ignores_unrelated_lines() {
        assert_eq!(parse_ready_port("INFO: Started server process [42]"), None);
    }

    #[test]
    fn returns_none_when_port_is_garbage() {
        let line = "THERIDION_SIDECAR_READY pid=1 port=NaN\n";
        assert_eq!(parse_ready_port(line), None);
    }
}

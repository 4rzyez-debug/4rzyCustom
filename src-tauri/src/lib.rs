use std::collections::HashSet;
use std::fs;
use std::fs::File;
use std::io::Read;
use std::time::Instant;
use std::path::PathBuf;
use std::process::Command;
use zip::ZipArchive;

use serde::Deserialize;
use sysinfo::System;
use tauri_plugin_dialog::DialogExt;
#[cfg(target_os = "windows")]
use winapi::shared::minwindef::{BOOL, DWORD, LPARAM, TRUE};
#[cfg(target_os = "windows")]
use winapi::shared::windef::{HWND, RECT};
#[cfg(target_os = "windows")]
use winapi::um::winuser::{EnumWindows, GetWindowRect, GetWindowTextW, GetWindowThreadProcessId, MoveWindow, SendMessageW, WM_CLOSE};

fn ensure_app_folders() -> Result<PathBuf, String> {
    let exe_dir = std::env::current_exe()
        .map_err(|e| e.to_string())?
        .parent()
        .ok_or("Cannot find exe dir")?
        .to_path_buf();

    fs::create_dir_all(exe_dir.join("downloads"))
        .map_err(|e| e.to_string())?;

    fs::create_dir_all(exe_dir.join("custom_mods"))
        .map_err(|e| e.to_string())?;

    fs::create_dir_all(exe_dir.join("cslol-manager"))
        .map_err(|e| e.to_string())?;

    Ok(exe_dir)
}

fn get_app_dir() -> Result<PathBuf, String> {
    ensure_app_folders()
}

fn copy_dir_all(src: &PathBuf, dst: &PathBuf) -> Result<usize, String> {
    let mut count = 0;
    for entry in fs::read_dir(src).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        let target_path = dst.join(entry.file_name());

        if path.is_dir() {
            fs::create_dir_all(&target_path).map_err(|e| e.to_string())?;
            count += copy_dir_all(&path, &target_path)?;
        } else {
            fs::copy(&path, &target_path).map_err(|e| e.to_string())?;
            count += 1;
        }
    }

    Ok(count)
}

fn ensure_cslol_manager_available(app_dir: &PathBuf) -> Result<(), String> {
    let target_exe = app_dir.join("cslol-manager").join("cslol-manager.exe");
    if target_exe.exists() {
        return Ok(());
    }

    let source_dir = app_dir.join("_up_").join("resources").join("cslol-manager");
    if !source_dir.exists() {
        return Err(format!("Source cslol-manager folder not found: {}", source_dir.display()));
    }

    let target_dir = app_dir.join("cslol-manager");
    println!("Kaynak klasör: {}", source_dir.display());
    println!("Hedef klasör: {}", target_dir.display());
    fs::create_dir_all(&target_dir).map_err(|e| e.to_string())?;

    let copied_files = copy_dir_all(&source_dir, &target_dir)?;
    println!("Kopyalanan dosya sayısı: {}", copied_files);
    println!("İşlem tamamlandı.");

    Ok(())
}

#[derive(Deserialize)]
struct DownloadRequest {
    champion_key: String,
    skin_id: String,
}

#[derive(Deserialize)]
struct ModInfo {
    Name: String,
}

#[tauri::command]
async fn download_skin(
    champion_key: String,
    skin_id: String,
    parent_skin_id: Option<String>,
) -> Result<String, String> {
    let url1 = format!(
        "https://github.com/Alban1911/LeagueSkins/raw/refs/heads/main/skins/{}/{}/{}.zip",
        champion_key,
        skin_id,
        skin_id
    );

    let app_dir = get_app_dir()?;
    let downloads_dir = app_dir.join("downloads");

    fs::create_dir_all(&downloads_dir).map_err(|e| e.to_string())?;

    let file_path = downloads_dir.join(format!("{}.zip", skin_id));

    if file_path.exists() {
        return Ok(file_path.to_string_lossy().to_string());
    }

    let mut response = reqwest::get(&url1)
        .await
        .map_err(|e| e.to_string())?;

    if response.status() == 404 {
        if let Some(parent) = parent_skin_id {
            let url2 = format!(
                "https://github.com/Alban1911/LeagueSkins/raw/refs/heads/main/skins/{}/{}/{}/{}.zip",
                champion_key,
                parent,
                skin_id,
                skin_id
            );
            println!(
    "Trying fallback URL: {}",
    url2
);
            response =
                reqwest::get(&url2)
                    .await
                    .map_err(|e| e.to_string())?;
        }
    }

    if !response.status().is_success() {
        return Err(format!(
            "Download failed: {}",
            response.status()
        ));
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| e.to_string())?;

    fs::write(&file_path, bytes).map_err(|e| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
fn extract_skin(
    skin_id: String,
) -> Result<String, String> {
    let app_dir = get_app_dir()?;

    let zip_path =
        app_dir
            .join("downloads")
            .join(format!("{}.zip", skin_id));

    let file =
        File::open(&zip_path)
            .map_err(|e| e.to_string())?;

    let mut archive =
        ZipArchive::new(file)
            .map_err(|e| e.to_string())?;

    let mut info_file =
        archive
            .by_name("META/info.json")
            .map_err(|e| e.to_string())?;

    let mut json = String::new();

    info_file
        .read_to_string(&mut json)
        .map_err(|e| e.to_string())?;

    let info: ModInfo =
        serde_json::from_str(&json)
            .map_err(|e| e.to_string())?;

    drop(info_file);

    let install_dir =
        app_dir
            .join("cslol-manager")
            .join("installed")
            .join(&info.Name);

    if install_dir.exists() {
        return Ok(format!(
            "{} already installed",
            info.Name
        ));
    }

    std::fs::create_dir_all(&install_dir)
        .map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file =
            archive
                .by_index(i)
                .map_err(|e| e.to_string())?;

        let outpath =
            install_dir.join(
                file.name(),
            );

        if file.name().ends_with('/') {
            std::fs::create_dir_all(&outpath)
                .map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) =
                outpath.parent()
            {
                std::fs::create_dir_all(parent)
                    .map_err(|e| e.to_string())?;
            }

            let mut outfile =
                File::create(
                    &outpath,
                )
                .map_err(|e| e.to_string())?;

            std::io::copy(
                &mut file,
                &mut outfile,
            )
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(info.Name)
}

#[tauri::command]
fn write_profile(
    mods: Vec<String>,
) -> Result<String, String> {
    let app_dir = get_app_dir()?;

    let profile_path =
        app_dir
            .join("cslol-manager")
            .join("profiles")
            .join("Default Profile.profile");

    let content =
        mods.join("\n");

    std::fs::write(
        &profile_path,
        content,
    )
    .map_err(|e| e.to_string())?;

    Ok(
        profile_path
            .to_string_lossy()
            .to_string(),
    )
}

#[cfg(target_os = "windows")]
fn get_window_title(hwnd: HWND) -> String {
    let mut buffer = [0u16; 512];
    let len = unsafe { GetWindowTextW(hwnd, buffer.as_mut_ptr(), buffer.len() as i32) } as usize;
    if len == 0 {
        return String::new();
    }
    String::from_utf16_lossy(&buffer[..len]).to_string()
}

#[cfg(target_os = "windows")]
fn move_window_offscreen(hwnd: HWND) {
    unsafe {
        let mut rect = RECT { left: 0, top: 0, right: 0, bottom: 0 };
        if GetWindowRect(hwnd, &mut rect) != 0 {
            let width = rect.right - rect.left;
            let height = rect.bottom - rect.top;
            if width > 0 && height > 0 {
                if MoveWindow(hwnd, 4000, 4000, width, height, TRUE) == 0 {
                    println!("MoveWindow failed for HWND={:?}", hwnd);
                } else {
                    println!("Moved window offscreen HWND={:?} width={} height={}", hwnd, width, height);
                }
            }
        } else {
            println!("GetWindowRect failed for HWND={:?}", hwnd);
        }
    }
}

#[cfg(target_os = "windows")]
fn read_lockfile_pid(app_dir: &PathBuf) -> Option<DWORD> {
    let lockfile_path = app_dir.join("cslol-manager").join("lockfile");
    let contents = fs::read_to_string(&lockfile_path).ok()?;
    let first_line = contents.lines().next()?.trim();
    if first_line.is_empty() {
        println!("lockfile exists but first line is empty: {}", lockfile_path.display());
        return None;
    }
    match first_line.parse::<u32>() {
        Ok(pid) => Some(pid as DWORD),
        Err(err) => {
            println!("lockfile PID parse failure {}: {}", lockfile_path.display(), err);
            None
        }
    }
}

#[cfg(target_os = "windows")]
fn collect_process_tree(system: &System, root_pid: u32) -> Vec<DWORD> {
    let mut result = Vec::new();
    let mut stack = vec![root_pid];
    let mut seen = HashSet::new();
    seen.insert(root_pid);

    while let Some(pid) = stack.pop() {
        for process in system.processes().values() {
            if let Some(parent_pid) = process.parent() {
                if parent_pid.as_u32() == pid {
                    let child_pid = process.pid().as_u32();
                    if seen.insert(child_pid) {
                        result.push(child_pid);
                        stack.push(child_pid);
                    }
                }
            }
        }
    }

    result.into_iter().map(|pid| pid as DWORD).collect()
}

#[cfg(target_os = "windows")]
fn close_matching_windows(target_pids: &[DWORD]) -> bool {
    struct EnumData {
        target_pids: Vec<DWORD>,
        found: bool,
    }

    unsafe extern "system" fn enum_proc(hwnd: HWND, lparam: LPARAM) -> BOOL {
        let data = &mut *(lparam as *mut EnumData);
        let mut window_pid: DWORD = 0;

        GetWindowThreadProcessId(hwnd, &mut window_pid);
        let title = get_window_title(hwnd);
        let title_lower = title.to_lowercase();
        let is_pid_match = data.target_pids.contains(&window_pid);
        let is_title_match = title_lower.contains("customskin for lol");
        // Only act and log when there's a match to minimize noise.
        if is_pid_match || is_title_match {
            println!("window found {:?}", Instant::now());
            println!(
                "EnumWindows: PID={} HWND={:?} title={:?} pid_match={} title_match={} target_pids={:?}",
                window_pid,
                hwnd,
                title,
                is_pid_match,
                is_title_match,
                data.target_pids,
            );
            move_window_offscreen(hwnd);
            println!("wm_close {:?}", Instant::now());
            SendMessageW(hwnd, WM_CLOSE, 0, 0);
            data.found = true;
        }

        TRUE
    }

    let mut data = EnumData {
        target_pids: target_pids.to_vec(),
        found: false,
    };

    unsafe {
        EnumWindows(Some(enum_proc), &mut data as *mut EnumData as LPARAM);
    }

    data.found
}

#[tauri::command]
fn launch_cslol(window: tauri::Window) -> Result<(), String> {
    let app_dir = get_app_dir()?;

    // Determine path to exe
    let exe_path = app_dir.join("cslol-manager").join("cslol-manager.exe");

    // Default: hidden = true when settings cannot be read
    let mut cslol_hidden = true;

    // Try to read settings.json; if it fails, keep default (true)
    if let Ok(settings_raw) = fs::read_to_string(
        app_dir.join("settings.json"),
    ) {
        if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(&settings_raw) {
            if let Some(b) = parsed.get("cslolHidden").and_then(|v| v.as_bool()) {
                cslol_hidden = b;
            }
        }
    }

    // Build and spawn command normally.
    let mut cmd = Command::new(exe_path);
    let child = cmd.spawn().map_err(|e| e.to_string())?;
    println!("spawn PID={} {:?}", child.id(), Instant::now());

    #[cfg(target_os = "windows")]
    {
        if cslol_hidden {
            let set_window_top = |on_top: bool| {
                if let Err(err) = window.set_always_on_top(on_top) {
                    println!("set_always_on_top({}) failed: {:?}", on_top, err);
                }
            };

            set_window_top(true);
            let hidden_result = (|| -> Result<(), String> {
                let child_pid = child.id() as DWORD;
                let mut system = System::new_all();
                system.refresh_all();

                let mut target_pids = vec![child_pid];
                let mut lockfile_pid = None;

                for _ in 0..10 {
                    if let Some(pid) = read_lockfile_pid(&app_dir) {
                        lockfile_pid = Some(pid);
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }

                if let Some(pid) = lockfile_pid {
                    println!("Using lockfile PID={} for CSLOL window matching", pid);
                    target_pids = vec![pid];
                    system.refresh_all();
                    target_pids.extend(collect_process_tree(&system, pid));
                } else {
                    println!("Lockfile PID not found or not parseable; falling back to spawned PID and cslol-manager processes");
                    target_pids.extend(collect_process_tree(&system, child_pid));
                }

                let mut found_window = false;
                for _ in 0..50 {
                    if close_matching_windows(&target_pids) {
                        found_window = true;
                        break;
                    }
                    std::thread::sleep(std::time::Duration::from_millis(100));
                }

                if !found_window {
                    let mut system = System::new_all();
                    system.refresh_all();

                    for process in system.processes().values() {
                        if process.name().to_lowercase().contains("cslol-manager") {
                            let mut pids = vec![process.pid().as_u32() as DWORD];
                            pids.extend(collect_process_tree(&system, process.pid().as_u32() as DWORD));

                            if close_matching_windows(&pids) {
                                break;
                            }
                        }
                    }
                }

                Ok(())
            })();
            set_window_top(false);
            hidden_result?;
        }
    }

    Ok(())
}

#[tauri::command]
fn is_cslol_running() -> bool {
    let mut system =
        System::new_all();

    system.refresh_all();

    system.processes()
        .values()
        .any(|process| {
            process.name()
                .to_lowercase()
                .contains(
                    "cslol-manager"
                )
        })
}

#[tauri::command]
fn stop_cslol() -> Result<(), String> {
    let mut system =
        System::new_all();

    system.refresh_all();

    for process in
        system.processes().values()
    {
        let name =
            process
                .name()
                .to_lowercase();

        if name.contains(
            "cslol-manager"
        ) {
            process.kill();
        }
    }

    Ok(())
}

#[derive(serde::Serialize)]
struct ModEntry {
    id: String,      // real filesystem name
    name: String,    // display name from names.json
    path: String,
}

#[tauri::command]
fn get_custom_mods(
    champion_name: Option<String>,
    category: Option<String>,
) -> Result<Vec<ModEntry>, String> {
    let app_dir = get_app_dir()?;

    let mut custom_dir = app_dir.join("custom_mods");

    if let Some(champion) = champion_name {
        custom_dir = custom_dir
            .join("champions")
            .join(champion);
    } else if let Some(category) = category {
        custom_dir = custom_dir.join(category);
    } else {
        return Ok(vec![]);
    }

    if !custom_dir.exists() {
        return Ok(vec![]);
    }

    // Try to read names.json
    let names_json_path = custom_dir.join("names.json");
    let mut names_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    
    if names_json_path.exists() {
        if let Ok(content) = fs::read_to_string(&names_json_path) {
            if let Ok(map) = serde_json::from_str(&content) {
                names_map = map;
            }
        }
    }

    let mut mods: Vec<ModEntry> = vec![];

    for entry in fs::read_dir(&custom_dir)
        .map_err(|e| e.to_string())?
    {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        // Skip names.json
        if path.file_name().and_then(|n| n.to_str()) == Some("names.json") {
            continue;
        }

        if path.is_dir() {
            // Try to find a .fantome file inside this directory
            let mut fantome_path = String::new();

            if let Ok(mut inner) = fs::read_dir(&path) {
                for inner_entry in inner.by_ref() {
                    if let Ok(inner_entry) = inner_entry {
                        let p = inner_entry.path();
                        if p.extension().and_then(|s| s.to_str()) == Some("fantome") {
                            fantome_path = p.to_string_lossy().to_string();
                            break;
                        }
                    }
                }
            }

            if let Some(dir_name) = path.file_name() {
                let id = dir_name.to_string_lossy().to_string();
                let display_name = names_map.get(&id).cloned().unwrap_or_else(|| id.clone());
                
                mods.push(ModEntry {
                    id,
                    name: display_name,
                    path: fantome_path,
                });
            }
        } else if path.extension().and_then(|s| s.to_str()) == Some("fantome") {
            if let Some(file_stem) = path.file_stem() {
                let id = file_stem.to_string_lossy().to_string();
                let display_name = names_map.get(&id).cloned().unwrap_or_else(|| id.clone());
                
                mods.push(ModEntry {
                    id,
                    name: display_name,
                    path: path.to_string_lossy().to_string(),
                });
            }
        }
    }

    Ok(mods)
}

#[derive(serde::Serialize)]
struct ChampionCustomCount {
    champion_name: String,
    count: usize,
}

#[tauri::command]
fn get_custom_champion_counts() -> Result<Vec<ChampionCustomCount>, String> {
    let app_dir = get_app_dir()?;

    let champions_dir = app_dir.join("custom_mods").join("champions");

    if !champions_dir.exists() {
        return Ok(vec![]);
    }

    let mut result = Vec::new();

    for entry in fs::read_dir(&champions_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();

        if !path.is_dir() {
            continue;
        }

        let champion_name = path
            .file_name()
            .and_then(|s| s.to_str())
            .ok_or("Invalid champion dir name")?
            .to_string();

        let mut count = 0;

        for child in fs::read_dir(&path).map_err(|e| e.to_string())? {
            let child = child.map_err(|e| e.to_string())?;
            let child_path = child.path();
            if child_path.file_name().and_then(|n| n.to_str()) == Some("names.json") {
                continue;
            }
            if child_path.is_dir() {
                count += 1;
            } else if child_path.extension().and_then(|s| s.to_str()) == Some("fantome") {
                count += 1;
            }
        }

        result.push(ChampionCustomCount {
            champion_name,
            count,
        });
    }

    Ok(result)
}

#[tauri::command]
fn save_custom_mod(
    source_path: String,
    champion_name: String,
    category: Option<String>,
) -> Result<String, String> {
    let app_dir = get_app_dir()?;

    let cat = category.unwrap_or_else(|| "champions".to_string());

    let custom_dir = app_dir
        .join("custom_mods")
        .join(cat)
        .join(&champion_name);

    fs::create_dir_all(&custom_dir)
        .map_err(|e| e.to_string())?;

    let source = PathBuf::from(&source_path);

    let file_name = source
        .file_name()
        .ok_or("Invalid file")?;

    let destination =
        custom_dir.join(file_name);

    fs::copy(
        &source,
        &destination,
    )
    .map_err(|e| e.to_string())?;

    Ok(
        destination
            .to_string_lossy()
            .to_string(),
    )
}

fn load_mod_info_name(
    fantome_path: &std::path::Path,
) -> Result<String, String> {
    let file = File::open(fantome_path)
        .map_err(|e| e.to_string())?;

    let mut archive = ZipArchive::new(file)
        .map_err(|e| e.to_string())?;

    let mut info_file = archive
        .by_name("META/info.json")
        .map_err(|e| e.to_string())?;

    let mut json = String::new();
    info_file
        .read_to_string(&mut json)
        .map_err(|e| e.to_string())?;

    let info: ModInfo = serde_json::from_str(&json)
        .map_err(|e| e.to_string())?;

    Ok(info.Name)
}

fn get_installed_name_for_mod(
    custom_dir: &std::path::Path,
    mod_name: &str,
) -> Result<Option<String>, String> {
    let fantome_file = custom_dir.join(format!("{}.fantome", mod_name));
    if fantome_file.exists() && fantome_file.is_file() {
        return Ok(Some(load_mod_info_name(&fantome_file)?));
    }

    let dir_path = custom_dir.join(mod_name);
    if dir_path.exists() && dir_path.is_dir() {
        if let Ok(entries) = fs::read_dir(&dir_path) {
            for entry in entries {
                let entry = entry.map_err(|e| e.to_string())?;
                let path = entry.path();
                if path.extension().and_then(|s| s.to_str()) == Some("fantome") {
                    return Ok(Some(load_mod_info_name(&path)?));
                }
            }
        }
    }

    Ok(None)
}

#[tauri::command]
fn custom_mod_installed(
    mod_name: String,
) -> Result<bool, String> {
    let app_dir = get_app_dir()?;

    let install_dir =
        app_dir
            .join("cslol-manager")
            .join("installed")
            .join(mod_name);

    Ok(install_dir.exists())
}

#[tauri::command]
fn install_custom_mod(
    fantome_path: String,
) -> Result<String, String> {
    let file =
        File::open(&fantome_path)
            .map_err(|e| e.to_string())?;

    let mut archive =
        ZipArchive::new(file)
            .map_err(|e| e.to_string())?;

    let mut info_file =
        archive
            .by_name("META/info.json")
            .map_err(|e| e.to_string())?;

    let mut json = String::new();

    info_file
        .read_to_string(&mut json)
        .map_err(|e| e.to_string())?;

    let info: ModInfo =
        serde_json::from_str(&json)
            .map_err(|e| e.to_string())?;

    drop(info_file);

    let app_dir = get_app_dir()?;

    let install_dir =
        app_dir
            .join("cslol-manager")
            .join("installed")
            .join(&info.Name);

    if install_dir.exists() {
        return Ok(info.Name);
    }

    std::fs::create_dir_all(
        &install_dir,
    )
    .map_err(|e| e.to_string())?;

    for i in 0..archive.len() {
        let mut file =
            archive
                .by_index(i)
                .map_err(|e| e.to_string())?;

        let outpath =
            install_dir.join(
                file.name(),
            );

        if file.name().ends_with('/') {
            std::fs::create_dir_all(
                &outpath,
            )
            .map_err(|e| e.to_string())?;
        } else {
            if let Some(parent) =
                outpath.parent()
            {
                std::fs::create_dir_all(
                    parent,
                )
                .map_err(|e| e.to_string())?;
            }

            let mut outfile =
                File::create(
                    &outpath,
                )
                .map_err(|e| e.to_string())?;

            std::io::copy(
                &mut file,
                &mut outfile,
            )
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(info.Name)
}

#[tauri::command]
fn delete_custom_mod(
    champion_name: Option<String>,
    mod_name: String,
    category: Option<String>,
) -> Result<(), String> {
    let app_dir = get_app_dir()?;

    let custom_dir = if let Some(category) = category {
        app_dir
            .join("custom_mods")
            .join(category)
    } else if let Some(champion_name) = champion_name {
        app_dir
            .join("custom_mods")
            .join("champions")
            .join(champion_name)
    } else {
        return Err("Missing champion name or category".to_string());
    };

    // Try to delete folder (for directories containing .fantome files)
    let dir_path = custom_dir.join(&mod_name);
    if dir_path.exists() && dir_path.is_dir() {
        fs::remove_dir_all(&dir_path)
            .map_err(|e| e.to_string())?;
    }

    // Try to delete .fantome file (in case it's a flat structure)
    let fantome_path = custom_dir.join(format!("{}.fantome", mod_name));
    if fantome_path.exists() {
        fs::remove_file(&fantome_path)
            .map_err(|e| e.to_string())?;
    }

    // Load names.json
    let names_json_path = custom_dir.join("names.json");
    let mut names_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    
    if names_json_path.exists() {
        if let Ok(content) = fs::read_to_string(&names_json_path) {
            if let Ok(map) = serde_json::from_str(&content) {
                names_map = map;
            }
        }
    }

    // Determine the installed folder name before removing the mapping.
    let installed_name = get_installed_name_for_mod(&custom_dir, &mod_name)?
        .or_else(|| names_map.get(&mod_name).cloned())
        .unwrap_or_else(|| mod_name.to_string());

    // Delete from names.json
    names_map.remove(&mod_name);

    let install_dir = app_dir
        .join("cslol-manager")
        .join("installed")
        .join(&installed_name);

    if install_dir.exists() {
        fs::remove_dir_all(&install_dir)
            .map_err(|e| e.to_string())?;
    }

    // Write back names.json
    if let Ok(json) = serde_json::to_string_pretty(&names_map) {
        fs::write(&names_json_path, json)
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}

#[tauri::command]
fn rename_custom_mod(
    champion_name: Option<String>,
    mod_name: String,
    new_name: String,
    category: Option<String>,
) -> Result<String, String> {
    let app_dir = get_app_dir()?;

    let custom_dir = if let Some(category) = category {
        app_dir.join("custom_mods").join(category)
    } else if let Some(champion_name) = champion_name {
        app_dir
            .join("custom_mods")
            .join("champions")
            .join(champion_name)
    } else {
        return Err("Missing champion name or category".to_string());
    };

    // Load names.json
    let names_json_path = custom_dir.join("names.json");
    let mut names_map: std::collections::HashMap<String, String> = std::collections::HashMap::new();
    
    if names_json_path.exists() {
        if let Ok(content) = fs::read_to_string(&names_json_path) {
            if let Ok(map) = serde_json::from_str(&content) {
                names_map = map;
            }
        }
    }

    // Update display name: mod_name is the id (real filesystem name)
    names_map.insert(mod_name.clone(), new_name.clone());

    // Write back names.json
    if let Ok(json) = serde_json::to_string_pretty(&names_map) {
        fs::write(&names_json_path, json)
            .map_err(|e| e.to_string())?;
    }

    Ok(new_name)
}

#[tauri::command]
fn read_settings() -> Result<String, String> {
    let app_dir = get_app_dir()?;

    let settings_path = app_dir.join("settings.json");

    let contents = fs::read_to_string(settings_path).map_err(|e| e.to_string())?;

    Ok(contents)
}

#[tauri::command]
fn write_settings(content: String) -> Result<(), String> {
    let app_dir = get_app_dir()?;

    let settings_path = app_dir.join("settings.json");

    fs::write(settings_path, content).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
async fn pick_fantome_file(
    app: tauri::AppHandle,
) -> Result<String, String> {
    let path = app
        .dialog()
        .file()
        .add_filter(
            "Fantome",
            &["fantome"],
        )
        .blocking_pick_file();

    match path {
        Some(file_path) => {
            Ok(
                file_path
                    .into_path()
                    .map_err(|_| "Invalid path")?
                    .to_string_lossy()
                    .to_string(),
            )
        }
        None => Err(
            "No file selected"
                .to_string(),
        ),
    }
}

#[cfg_attr(
    mobile,
    tauri::mobile_entry_point
)]
pub fn run() {
    let app_dir = ensure_app_folders().expect("Failed to create application folders");
    ensure_cslol_manager_available(&app_dir).expect("Failed to extract cslol-manager from _up_ resources");

    tauri::Builder::default()
        .plugin(
            tauri_plugin_log::Builder::default()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(
            tauri_plugin_dialog::init()
        )
        .invoke_handler(
            tauri::generate_handler![
                download_skin,
                extract_skin,
                write_profile,
                launch_cslol,
                is_cslol_running,
                stop_cslol,
                get_custom_mods,
                get_custom_champion_counts,
                save_custom_mod,
                pick_fantome_file,
                custom_mod_installed,
                install_custom_mod,
                delete_custom_mod,
                rename_custom_mod,
                read_settings,
                write_settings
            ],
        )
        .run(
            tauri::generate_context!(),
        )
        .expect(
            "error while running tauri application",
        );
}

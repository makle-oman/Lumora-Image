#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    fs, io,
    net::{SocketAddr, TcpStream},
    path::{Path, PathBuf},
    sync::Mutex,
    thread,
    time::Duration,
};

use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_shell::{process::CommandChild, ShellExt};

struct DesktopState {
    app_data_directory: PathBuf,
    image_directory: Mutex<PathBuf>,
    sidecar: Mutex<Option<CommandChild>>,
}

fn read_directory_setting(path: &Path) -> io::Result<Option<PathBuf>> {
    match fs::read_to_string(path) {
        Ok(value) if !value.trim().is_empty() => Ok(Some(PathBuf::from(value.trim()))),
        Ok(_) => Ok(None),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(None),
        Err(error) => Err(error),
    }
}

fn copy_images(source: &Path, destination: &Path) -> io::Result<()> {
    fs::create_dir_all(destination)?;
    if !source.exists() || source == destination {
        return Ok(());
    }
    for entry in fs::read_dir(source)? {
        let entry = entry?;
        if entry.file_type()?.is_file() {
            fs::copy(entry.path(), destination.join(entry.file_name()))?;
        }
    }
    Ok(())
}

#[tauri::command]
fn image_directory(state: tauri::State<'_, DesktopState>) -> String {
    state
        .image_directory
        .lock()
        .expect("image directory lock poisoned")
        .to_string_lossy()
        .into_owned()
}

#[tauri::command]
fn take_migration_error(state: tauri::State<'_, DesktopState>) -> Option<String> {
    let path = state.app_data_directory.join("image-directory-error.txt");
    let message = fs::read_to_string(&path).ok();
    if message.is_some() {
        let _ = fs::remove_file(path);
    }
    message
}

#[tauri::command]
fn set_image_directory(path: String, state: tauri::State<'_, DesktopState>) -> Result<(), String> {
    let directory = PathBuf::from(path.trim());
    if !directory.is_absolute() {
        return Err("请选择有效的绝对路径".into());
    }
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    if !directory.is_dir() {
        return Err("所选路径不是文件夹".into());
    }
    let test_file = directory.join(format!(".lumora-write-test-{}", std::process::id()));
    fs::OpenOptions::new()
        .write(true)
        .create_new(true)
        .open(&test_file)
        .map_err(|_| "所选文件夹不可写".to_string())?;
    fs::remove_file(test_file).map_err(|error| error.to_string())?;
    fs::write(
        state.app_data_directory.join("pending-image-directory.txt"),
        directory.to_string_lossy().as_bytes(),
    )
    .map_err(|error| error.to_string())
}

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            image_directory,
            take_migration_error,
            set_image_directory
        ])
        .setup(|app| {
            let app_data_directory = app.path().app_data_dir()?;
            fs::create_dir_all(&app_data_directory)?;

            let image_setting = app_data_directory.join("image-directory.txt");
            let pending_setting = app_data_directory.join("pending-image-directory.txt");
            let migration_error = app_data_directory.join("image-directory-error.txt");
            let default_image_directory = app
                .path()
                .picture_dir()
                .unwrap_or_else(|_| app_data_directory.join("images"))
                .join("Lumora");
            let mut selected_image_directory =
                read_directory_setting(&image_setting)?.unwrap_or(default_image_directory);

            if let Some(pending_directory) = read_directory_setting(&pending_setting)? {
                match copy_images(&selected_image_directory, &pending_directory) {
                    Ok(()) => {
                        selected_image_directory = pending_directory;
                        fs::write(
                            &image_setting,
                            selected_image_directory.to_string_lossy().as_bytes(),
                        )?;
                        let _ = fs::remove_file(&migration_error);
                    }
                    Err(error) => {
                        fs::write(&migration_error, error.to_string())?;
                    }
                }
                fs::remove_file(&pending_setting)?;
            }

            fs::create_dir_all(&selected_image_directory)?;
            if !image_setting.exists() {
                fs::write(
                    &image_setting,
                    selected_image_directory.to_string_lossy().as_bytes(),
                )?;
            }

            let master_key = app_data_directory.join("desktop.key");
            if !master_key.exists() {
                fs::write(&master_key, rand::random::<[u8; 32]>())?;
            }

            let static_directory = if cfg!(debug_assertions) {
                PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../dist")
            } else {
                app.path().resource_dir()?.join("web")
            };
            let task_directory = app_data_directory.join("tasks");
            fs::create_dir_all(&task_directory)?;

            let server_address = SocketAddr::from(([127, 0, 0, 1], 8787));
            if TcpStream::connect_timeout(&server_address, Duration::from_millis(150)).is_ok() {
                return Err(
                    io::Error::new(io::ErrorKind::AddrInUse, "本机端口 8787 已被占用").into(),
                );
            }

            let arguments = vec![
                "--desktop-data".to_string(),
                app_data_directory.to_string_lossy().into_owned(),
                "--desktop-images".to_string(),
                selected_image_directory.to_string_lossy().into_owned(),
                "--desktop-tasks".to_string(),
                task_directory.to_string_lossy().into_owned(),
                "--desktop-static".to_string(),
                static_directory.to_string_lossy().into_owned(),
                "--desktop-master-key-file".to_string(),
                master_key.to_string_lossy().into_owned(),
            ];
            let (_events, child) = app
                .shell()
                .sidecar("lumora-server")?
                .args(arguments)
                .spawn()?;

            let mut server_ready = false;
            for _ in 0..100 {
                if TcpStream::connect_timeout(&server_address, Duration::from_millis(100)).is_ok() {
                    server_ready = true;
                    break;
                }
                thread::sleep(Duration::from_millis(100));
            }
            if !server_ready {
                let _ = child.kill();
                return Err(io::Error::new(io::ErrorKind::TimedOut, "本地图片服务启动超时").into());
            }

            app.manage(DesktopState {
                app_data_directory,
                image_directory: Mutex::new(selected_image_directory),
                sidecar: Mutex::new(Some(child)),
            });

            WebviewWindowBuilder::new(
                app,
                "main",
                WebviewUrl::External("http://127.0.0.1:8787".parse()?),
            )
            .title("Lumora Image Studio")
            .inner_size(1380.0, 900.0)
            .min_inner_size(1000.0, 700.0)
            .center()
            .build()?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("failed to build Lumora desktop app");

    app.run(|app_handle, event| {
        if matches!(event, tauri::RunEvent::ExitRequested { .. }) {
            if let Some(state) = app_handle.try_state::<DesktopState>() {
                if let Some(child) = state.sidecar.lock().expect("sidecar lock poisoned").take() {
                    let _ = child.kill();
                }
            }
        }
    });
}

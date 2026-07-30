#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    fs, io,
    net::IpAddr,
    path::{Path, PathBuf},
    sync::Mutex,
};

use tauri::{
    http,
    ipc::{InvokeBody, Request},
    Manager, Url, WebviewUrl, WebviewWindowBuilder,
};

const DEFAULT_APP_URL: &str = "https://makle.cloud";

struct DesktopState {
    app_data_directory: PathBuf,
    image_directory: Mutex<PathBuf>,
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

fn image_file_name(id: &str, format: &str) -> Result<String, String> {
    let suffix = id
        .strip_prefix("img-")
        .filter(|value| value.len() == 32 && value.chars().all(|char| char.is_ascii_hexdigit()))
        .ok_or_else(|| "图片 ID 无效".to_string())?;
    if suffix.is_empty() || !matches!(format, "png" | "jpeg" | "webp") {
        return Err("图片格式无效".into());
    }
    Ok(format!("{id}.{format}"))
}

fn local_image_url(file_name: &str) -> String {
    format!("https://lumora-local.localhost/{file_name}")
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

#[tauri::command]
fn save_local_image(
    request: Request<'_>,
    state: tauri::State<'_, DesktopState>,
) -> Result<String, String> {
    let id = request
        .headers()
        .get("x-lumora-image-id")
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| "图片 ID 缺失".to_string())?;
    let format = request
        .headers()
        .get("x-lumora-image-format")
        .and_then(|value| value.to_str().ok())
        .ok_or_else(|| "图片格式缺失".to_string())?;
    let bytes = match request.body() {
        InvokeBody::Raw(bytes) if !bytes.is_empty() && bytes.len() <= 50 * 1024 * 1024 => bytes,
        _ => return Err("图片数据无效".into()),
    };
    let file_name = image_file_name(id, format)?;
    let directory = state
        .image_directory
        .lock()
        .map_err(|_| "图片目录状态异常".to_string())?;
    let target = directory.join(&file_name);
    if !target.exists() {
        let temporary = directory.join(format!(".saving-{file_name}-{}", std::process::id()));
        fs::write(&temporary, bytes).map_err(|error| error.to_string())?;
        if let Err(error) = fs::rename(&temporary, &target) {
            let _ = fs::remove_file(temporary);
            return Err(error.to_string());
        }
    }
    Ok(local_image_url(&file_name))
}

#[tauri::command]
fn delete_local_image(
    id: String,
    format: String,
    state: tauri::State<'_, DesktopState>,
) -> Result<(), String> {
    let file_name = image_file_name(&id, &format)?;
    let directory = state
        .image_directory
        .lock()
        .map_err(|_| "图片目录状态异常".to_string())?;
    match fs::remove_file(directory.join(file_name)) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error.to_string()),
    }
}

fn configured_app_url() -> Result<Url, Box<dyn std::error::Error>> {
    let mut url = Url::parse(option_env!("LUMORA_APP_URL").unwrap_or(DEFAULT_APP_URL))?;
    let host = url
        .host_str()
        .ok_or_else(|| io::Error::new(io::ErrorKind::InvalidInput, "集中服务地址缺少域名"))?;
    let loopback = host == "localhost"
        || host
            .parse::<IpAddr>()
            .is_ok_and(|address| address.is_loopback());
    if url.scheme() != "https" && !(url.scheme() == "http" && loopback) {
        return Err(io::Error::new(
            io::ErrorKind::InvalidInput,
            "集中服务必须使用 HTTPS，本机联调可使用 localhost",
        )
        .into());
    }
    if !url
        .query_pairs()
        .any(|(name, value)| name == "lumora-desktop" && value == "1")
    {
        url.query_pairs_mut().append_pair("lumora-desktop", "1");
    }
    Ok(url)
}

fn same_origin(left: &Url, right: &Url) -> bool {
    left.scheme() == right.scheme()
        && left.host_str() == right.host_str()
        && left.port_or_known_default() == right.port_or_known_default()
}

fn main() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            image_directory,
            take_migration_error,
            set_image_directory,
            save_local_image,
            delete_local_image
        ])
        .register_uri_scheme_protocol("lumora-local", |context, request| {
            let file_name = request.uri().path().trim_start_matches('/');
            let valid = file_name
                .rsplit_once('.')
                .and_then(|(id, format)| image_file_name(id, format).ok())
                .is_some_and(|expected| expected == file_name);
            let result = if valid {
                let state = context.app_handle().state::<DesktopState>();
                state
                    .image_directory
                    .lock()
                    .ok()
                    .and_then(|directory| fs::read(directory.join(file_name)).ok())
            } else {
                None
            };
            let (status, content_type, body) = match result {
                Some(bytes) => {
                    let content_type = if file_name.ends_with(".png") {
                        "image/png"
                    } else if file_name.ends_with(".webp") {
                        "image/webp"
                    } else {
                        "image/jpeg"
                    };
                    (http::StatusCode::OK, content_type, bytes)
                }
                None => (
                    http::StatusCode::NOT_FOUND,
                    "text/plain; charset=utf-8",
                    b"image not found".to_vec(),
                ),
            };
            http::Response::builder()
                .status(status)
                .header(http::header::CONTENT_TYPE, content_type)
                .header(http::header::CACHE_CONTROL, "private, no-store")
                .header(http::header::ACCESS_CONTROL_ALLOW_ORIGIN, "*")
                .body(body)
                .expect("valid local image response")
        })
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
                    Err(error) => fs::write(&migration_error, error.to_string())?,
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
            app.manage(DesktopState {
                app_data_directory,
                image_directory: Mutex::new(selected_image_directory),
            });

            let app_url = configured_app_url()?;
            let allowed_origin = app_url.clone();
            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(app_url))
                .use_https_scheme(true)
                .on_navigation(move |url| same_origin(url, &allowed_origin))
                .title("lumora image")
                .inner_size(1380.0, 900.0)
                .min_inner_size(1000.0, 700.0)
                .center()
                .build()?;
            Ok(())
        })
        .build(tauri::generate_context!());

    match app {
        Ok(app) => app.run(|_, _| {}),
        Err(error) => {
            rfd::MessageDialog::new()
                .set_title("lumora image")
                .set_description(format!("Lumora image 启动失败：\n\n{error}"))
                .set_level(rfd::MessageLevel::Error)
                .show();
        }
    }
}

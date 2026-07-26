fn ensure_tools_in_path() {
    let known_paths = [
        "C:\\msys64\\mingw64\\bin",
        "C:\\msys64\\mingw64\\x86_64-w64-mingw32\\bin",
        "C:\\mingw64\\bin",
        "C:\\mingw-w64\\bin",
    ];

    let current_path = std::env::var("PATH").unwrap_or_default();
    let has_windres = known_paths.iter().any(|p| {
        std::path::Path::new(p).join("windres.exe").exists() && current_path.contains(p)
    });
    let has_dlltool = known_paths.iter().any(|p| {
        std::path::Path::new(p).join("dlltool.exe").exists() && current_path.contains(p)
    });

    if !has_windres || !has_dlltool {
        let mut new_path = current_path.clone();
        for p in &known_paths {
            if !new_path.contains(p) {
                let has_windres = std::path::Path::new(p).join("windres.exe").exists();
                let has_dlltool = std::path::Path::new(p).join("dlltool.exe").exists();
                if has_windres || has_dlltool {
                    new_path = format!("{};{}", p, new_path);
                }
            }
        }
        std::env::set_var("PATH", &new_path);
    }
}

fn main() {
    ensure_tools_in_path();
    tauri_build::build()
}

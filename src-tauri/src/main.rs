#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use regex::Regex;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, ClipboardManager};

#[derive(Serialize)]
struct ClipboardItem {
    id: i64,
    content: String,
    created_at: String,
    pinned: bool,
}

#[derive(Serialize, Deserialize)]
struct Pipeline {
    id: i64,
    name: String,
    steps_json: String,
    hotkey: Option<String>,
}

#[derive(Serialize)]
struct Settings {
    history_limit: i64,
    confirm_overwrite: bool,
}

#[derive(Deserialize)]
struct Step {
    r#type: String,
    params: serde_json::Value,
}

fn db_path(app: &AppHandle) -> PathBuf {
    let mut dir = app.path_resolver().app_data_dir().unwrap();
    dir.push("database");
    fs::create_dir_all(&dir).ok();
    dir.push("clipforge.sqlite");
    dir
}

fn init_db(app: &AppHandle) -> Connection {
    let path = db_path(app);
    let conn = Connection::open(path).expect("failed to open database");
    conn.execute_batch(
        r#"
        create table if not exists clipboard_items (
          id integer primary key autoincrement,
          content text not null,
          content_hash text not null unique,
          created_at text not null default (datetime('now')),
          pinned integer not null default 0
        );
        create table if not exists pipelines (
          id integer primary key autoincrement,
          name text not null,
          steps_json text not null,
          hotkey text null
        );
        create table if not exists pipeline_runs (
          id integer primary key autoincrement,
          pipeline_id integer not null,
          input_hash text not null,
          output_hash text not null,
          created_at text not null default (datetime('now'))
        );
        create table if not exists settings (
          id integer primary key check (id = 1),
          history_limit integer not null default 50,
          confirm_overwrite integer not null default 1
        );
        insert or ignore into settings (id) values (1);
        "#,
    )
    .unwrap();
    conn
}

fn hash_content(content: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content.as_bytes());
    format!("{:x}", hasher.finalize())
}

fn apply_steps(input: &str, steps: Vec<Step>) -> String {
    let mut output = input.to_string();
    for step in steps {
        match step.r#type.as_str() {
            "trim_edges" => {
                output = output.trim().to_string();
            }
            "normalize_newlines" => {
                output = output.replace("\r\n", "\n");
            }
            "wrap_code_fence" => {
                let lang = step.params.get("language").and_then(|v| v.as_str()).unwrap_or("text");
                output = format!("```{}\n{}\n```", lang, output);
            }
            "prepend_text" => {
                let text = step.params.get("text").and_then(|v| v.as_str()).unwrap_or("");
                output = format!("{}{}", text, output);
            }
            "append_text" => {
                let text = step.params.get("text").and_then(|v| v.as_str()).unwrap_or("");
                output = format!("{}{}", output, text);
            }
            "replace_regex" => {
                let pattern = step.params.get("pattern").and_then(|v| v.as_str()).unwrap_or("");
                let replace = step.params.get("replace").and_then(|v| v.as_str()).unwrap_or("");
                if pattern.len() <= 120 {
                    if let Ok(regex) = Regex::new(pattern) {
                        output = regex.replace_all(&output, replace).to_string();
                    }
                }
            }
            "json_pretty" => {
                if let Ok(value) = serde_json::from_str::<serde_json::Value>(&output) {
                    if let Ok(pretty) = serde_json::to_string_pretty(&value) {
                        output = pretty;
                    }
                }
            }
            "add_file_markers" => {
                let filename = step.params.get("filename").and_then(|v| v.as_str()).unwrap_or("FILE");
                output = format!("FILE_START:{}\n{}\nFILE_END:{}", filename, output, filename);
            }
            "patch_standard_block" => {
                output = format!("TARGET FILE:\n\nFIND:\n\nREPLACE WITH:\n\n{}", output);
            }
            _ => {}
        }
    }
    output
}

#[tauri::command]
fn list_history(app: AppHandle) -> Vec<ClipboardItem> {
    let conn = init_db(&app);
    let mut stmt = conn
        .prepare("select id, content, created_at, pinned from clipboard_items order by pinned desc, datetime(created_at) desc")
        .unwrap();
    let rows = stmt
        .query_map([], |row| {
            Ok(ClipboardItem {
                id: row.get(0)?,
                content: row.get(1)?,
                created_at: row.get(2)?,
                pinned: row.get::<_, i64>(3)? == 1,
            })
        })
        .unwrap();
    rows.map(|r| r.unwrap()).collect()
}

#[tauri::command]
fn capture_clipboard(app: AppHandle) {
    let conn = init_db(&app);
    if let Ok(text) = app.clipboard_manager().read_text() {
        if text.len() > 200_000 {
            return;
        }
        let hash = hash_content(&text);
        let _ = conn.execute(
            "insert or ignore into clipboard_items (content, content_hash) values (?1, ?2)",
            params![text, hash],
        );
        let limit: i64 = conn.query_row("select history_limit from settings where id = 1", [], |row| row.get(0)).unwrap();
        conn.execute(
            "delete from clipboard_items where id not in (select id from clipboard_items order by pinned desc, datetime(created_at) desc limit ?1)",
            params![limit],
        )
        .ok();
    }
}

#[tauri::command]
fn set_clipboard(app: AppHandle, content: String) {
    let _ = app.clipboard_manager().write_text(content);
}

#[tauri::command]
fn toggle_pin(app: AppHandle, id: i64) {
    let conn = init_db(&app);
    conn.execute(
        "update clipboard_items set pinned = case when pinned = 1 then 0 else 1 end where id = ?1",
        params![id],
    )
    .ok();
}

#[tauri::command]
fn list_pipelines(app: AppHandle) -> Vec<Pipeline> {
    let conn = init_db(&app);
    let mut stmt = conn
        .prepare("select id, name, steps_json, hotkey from pipelines order by id desc")
        .unwrap();
    let rows = stmt
        .query_map([], |row| {
            Ok(Pipeline {
                id: row.get(0)?,
                name: row.get(1)?,
                steps_json: row.get(2)?,
                hotkey: row.get(3)?,
            })
        })
        .unwrap();
    rows.map(|r| r.unwrap()).collect()
}

#[tauri::command]
fn save_pipeline(app: AppHandle, name: String, steps_json: String, hotkey: String) {
    let conn = init_db(&app);
    let hk = if hotkey.trim().is_empty() { None } else { Some(hotkey) };
    conn.execute(
        "insert into pipelines (name, steps_json, hotkey) values (?1, ?2, ?3)",
        params![name, steps_json, hk],
    )
    .ok();
}

#[tauri::command]
fn delete_pipeline(app: AppHandle, id: i64) {
    let conn = init_db(&app);
    conn.execute("delete from pipelines where id = ?1", params![id]).ok();
}

#[tauri::command]
fn run_pipeline(app: AppHandle, pipeline_id: i64, input: String) -> serde_json::Value {
    let conn = init_db(&app);
    let steps_json: String = conn
        .query_row("select steps_json from pipelines where id = ?1", params![pipeline_id], |row| row.get(0))
        .unwrap_or_else(|_| "[]".to_string());
    let steps: Vec<Step> = serde_json::from_str(&steps_json).unwrap_or_default();
    let output = apply_steps(&input, steps);

    let input_hash = hash_content(&input);
    let output_hash = hash_content(&output);
    conn.execute(
        "insert into pipeline_runs (pipeline_id, input_hash, output_hash) values (?1, ?2, ?3)",
        params![pipeline_id, input_hash, output_hash],
    )
    .ok();

    serde_json::json!({ "output": output })
}

#[tauri::command]
fn get_settings(app: AppHandle) -> Settings {
    let conn = init_db(&app);
    conn.query_row(
        "select history_limit, confirm_overwrite from settings where id = 1",
        [],
        |row| {
            Ok(Settings {
                history_limit: row.get(0)?,
                confirm_overwrite: row.get::<_, i64>(1)? == 1,
            })
        },
    )
    .unwrap()
}

#[tauri::command]
fn update_settings(app: AppHandle, history_limit: i64, confirm_overwrite: bool) {
    let conn = init_db(&app);
    conn.execute(
        "update settings set history_limit = ?1, confirm_overwrite = ?2 where id = 1",
        params![history_limit, if confirm_overwrite { 1 } else { 0 }],
    )
    .ok();
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            list_history,
            capture_clipboard,
            set_clipboard,
            toggle_pin,
            list_pipelines,
            save_pipeline,
            delete_pipeline,
            run_pipeline,
            get_settings,
            update_settings
        ])
        .setup(|app| {
            init_db(&app.handle());
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

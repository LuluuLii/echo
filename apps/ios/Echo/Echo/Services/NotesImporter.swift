//
//  NotesImporter.swift
//  Echo
//
//  Created by Li Chenlu on 2026/3/5.
//

import Foundation
import SwiftUI

/// Service to handle batch import of notes via file or URL scheme
class NotesImporter: ObservableObject {
    static let shared = NotesImporter()

    @Published var isImporting = false
    @Published var importResult: ImportResult?

    struct ImportResult: Identifiable {
        let id = UUID()
        let count: Int
        let success: Bool
        let message: String
    }

    private init() {}

    /// Import notes from a JSON file (exported via Shortcuts)
    /// Expected format: [{ "title": "...", "content": "...", "createdAt": "..." }, ...]
    @MainActor
    func importFromFile(_ url: URL) async -> Int {
        isImporting = true
        defer { isImporting = false }

        // Ensure we can access the file
        guard url.startAccessingSecurityScopedResource() else {
            importResult = ImportResult(count: 0, success: false, message: "无法访问文件")
            return 0
        }
        defer { url.stopAccessingSecurityScopedResource() }

        do {
            let data = try Data(contentsOf: url)
            let notes = try JSONDecoder().decode([ImportedNote].self, from: data)

            var importedCount = 0
            for note in notes {
                let material = Material(
                    content: note.content,
                    title: note.title,
                    tags: ["备忘录"]
                )
                await DataStore.shared.addMaterial(material)
                importedCount += 1
            }

            importResult = ImportResult(
                count: importedCount,
                success: true,
                message: "成功导入 \(importedCount) 条备忘录"
            )
            return importedCount
        } catch {
            print("[NotesImporter] Error importing: \(error)")
            importResult = ImportResult(count: 0, success: false, message: "导入失败: \(error.localizedDescription)")
            return 0
        }
    }

    /// Import from clipboard (for simple paste scenarios)
    @MainActor
    func importFromClipboard() async -> Int {
        guard let text = UIPasteboard.general.string, !text.isEmpty else {
            importResult = ImportResult(count: 0, success: false, message: "剪贴板为空")
            return 0
        }

        // Try to parse as JSON array first
        if let data = text.data(using: .utf8),
           let notes = try? JSONDecoder().decode([ImportedNote].self, from: data) {
            var count = 0
            for note in notes {
                let material = Material(
                    content: note.content,
                    title: note.title,
                    tags: ["备忘录"]
                )
                await DataStore.shared.addMaterial(material)
                count += 1
            }
            importResult = ImportResult(count: count, success: true, message: "成功导入 \(count) 条备忘录")
            return count
        }

        // Otherwise treat as single text
        let material = Material(content: text, tags: ["剪贴板"])
        await DataStore.shared.addMaterial(material)
        importResult = ImportResult(count: 1, success: true, message: "成功导入 1 条内容")
        return 1
    }
}

/// Structure for imported note from JSON
struct ImportedNote: Codable {
    let title: String?
    let content: String
    let createdAt: String?
    let folder: String?
}

//
//  PendingMaterialsService.swift
//  Echo
//
//  Created by Li Chenlu on 2026/3/5.
//

import Foundation

/// Service to process materials shared from Share Extension
class PendingMaterialsService {
    static let shared = PendingMaterialsService()

    private let appGroupIdentifier = "group.com.echo.app"

    private var containerURL: URL? {
        FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier)
    }

    private var pendingURL: URL? {
        containerURL?.appendingPathComponent("pending_materials.json")
    }

    private init() {}

    /// Check and import any pending materials from Share Extension
    @MainActor
    func processPendingMaterials() async -> Int {
        guard let url = pendingURL,
              FileManager.default.fileExists(atPath: url.path) else {
            return 0
        }

        do {
            let data = try Data(contentsOf: url)
            guard let items = try JSONSerialization.jsonObject(with: data) as? [[String: Any]] else {
                return 0
            }

            var importedCount = 0

            for item in items {
                guard let id = item["id"] as? String,
                      let content = item["content"] as? String,
                      !content.isEmpty else {
                    continue
                }

                let title = item["title"] as? String
                let source = item["source"] as? String

                // Create material
                let material = Material(
                    id: id,
                    content: content,
                    title: title?.isEmpty == false ? title : nil,
                    sourceUrl: source == "apple-notes" ? "apple-notes://import" : nil,
                    tags: source == "apple-notes" ? ["备忘录"] : []
                )

                // Add to data store
                await DataStore.shared.addMaterial(material)
                importedCount += 1

                print("[PendingMaterials] Imported material: \(material.displayTitle)")
            }

            // Clear pending file
            try FileManager.default.removeItem(at: url)
            print("[PendingMaterials] Processed \(importedCount) pending materials")

            return importedCount
        } catch {
            print("[PendingMaterials] Error processing pending materials: \(error)")
            return 0
        }
    }

    /// Check if there are pending materials without importing
    func hasPendingMaterials() -> Bool {
        guard let url = pendingURL else { return false }
        return FileManager.default.fileExists(atPath: url.path)
    }
}

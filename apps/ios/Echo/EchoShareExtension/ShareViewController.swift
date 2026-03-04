//
//  ShareViewController.swift
//  EchoShareExtension
//
//  Created by Li Chenlu on 2026/3/5.
//

import UIKit
import Social
import UniformTypeIdentifiers

class ShareViewController: SLComposeServiceViewController {

    private var sharedText: String = ""

    override func viewDidLoad() {
        super.viewDidLoad()
        placeholder = "添加备注（可选）"
        extractSharedContent()
    }

    override func isContentValid() -> Bool {
        // Valid if we have shared content
        return !sharedText.isEmpty
    }

    override func didSelectPost() {
        // Combine user's note with shared content
        let userNote = contentText ?? ""
        let finalContent = userNote.isEmpty ? sharedText : "\(userNote)\n\n---\n\n\(sharedText)"

        saveMaterial(content: finalContent)

        self.extensionContext?.completeRequest(returningItems: [], completionHandler: nil)
    }

    override func configurationItems() -> [Any]! {
        // Could add configuration like selecting a folder/tag
        return []
    }

    // MARK: - Content Extraction

    private func extractSharedContent() {
        guard let extensionItems = extensionContext?.inputItems as? [NSExtensionItem] else {
            return
        }

        for extensionItem in extensionItems {
            guard let attachments = extensionItem.attachments else { continue }

            for attachment in attachments {
                // Try plain text first
                if attachment.hasItemConformingToTypeIdentifier(UTType.plainText.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.plainText.identifier, options: nil) { [weak self] data, error in
                        DispatchQueue.main.async {
                            if let text = data as? String {
                                self?.sharedText = text
                                self?.validateContent()
                            }
                        }
                    }
                    return
                }

                // Try URL
                if attachment.hasItemConformingToTypeIdentifier(UTType.url.identifier) {
                    attachment.loadItem(forTypeIdentifier: UTType.url.identifier, options: nil) { [weak self] data, error in
                        DispatchQueue.main.async {
                            if let url = data as? URL {
                                self?.sharedText = url.absoluteString
                                self?.validateContent()
                            }
                        }
                    }
                    return
                }
            }
        }
    }

    // MARK: - Save Material

    private func saveMaterial(content: String) {
        // Use App Group to share data with main app
        guard let containerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: "group.com.echo.app"
        ) else {
            print("[ShareExtension] Failed to get App Group container")
            return
        }

        let pendingURL = containerURL.appendingPathComponent("pending_materials.json")

        // Read existing pending materials
        var pendingMaterials: [[String: Any]] = []
        if let data = try? Data(contentsOf: pendingURL),
           let existing = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
            pendingMaterials = existing
        }

        // Extract title from first line
        let lines = content.split(separator: "\n", maxSplits: 1)
        let title = lines.first.map(String.init) ?? ""

        // Add new material
        let newMaterial: [String: Any] = [
            "id": UUID().uuidString,
            "content": content,
            "title": title.count <= 50 ? title : String(title.prefix(50)) + "...",
            "source": "apple-notes",
            "createdAt": ISO8601DateFormatter().string(from: Date())
        ]
        pendingMaterials.append(newMaterial)

        // Save back
        if let data = try? JSONSerialization.data(withJSONObject: pendingMaterials, options: .prettyPrinted) {
            try? data.write(to: pendingURL)
            print("[ShareExtension] Saved material to pending queue")
        }
    }
}

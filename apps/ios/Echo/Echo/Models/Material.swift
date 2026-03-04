//
//  Material.swift
//  Echo
//
//  Created by Li Chenlu on 2026/3/5.
//

import Foundation

/// Raw material stored by the user
struct Material: Identifiable, Codable, Equatable {
    let id: String
    var content: String
    var title: String?
    var sourceUrl: String?
    var tags: [String]
    let createdAt: Date
    var updatedAt: Date

    init(
        id: String = UUID().uuidString,
        content: String,
        title: String? = nil,
        sourceUrl: String? = nil,
        tags: [String] = [],
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.content = content
        self.title = title
        self.sourceUrl = sourceUrl
        self.tags = tags
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    /// Preview text for display (first 100 chars)
    var preview: String {
        let trimmed = content.trimmingCharacters(in: .whitespacesAndNewlines)
        if trimmed.count <= 100 {
            return trimmed
        }
        return String(trimmed.prefix(100)) + "..."
    }

    /// Computed title from content if not set
    var displayTitle: String {
        if let title = title, !title.isEmpty {
            return title
        }
        // Use first line or first 50 chars
        let firstLine = content.split(separator: "\n").first.map(String.init) ?? content
        if firstLine.count <= 50 {
            return firstLine
        }
        return String(firstLine.prefix(50)) + "..."
    }
}

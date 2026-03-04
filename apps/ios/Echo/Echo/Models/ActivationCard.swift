//
//  ActivationCard.swift
//  Echo
//
//  Created by Li Chenlu on 2026/3/5.
//

import Foundation

/// An activation card generated from materials
struct ActivationCard: Identifiable, Codable, Equatable {
    let id: String
    var title: String
    var content: String
    var sourceMaterialIds: [String]
    var tags: [String]
    let createdAt: Date
    var lastViewedAt: Date?
    var viewCount: Int

    /// Whether the card is due for review today
    var isDueToday: Bool {
        guard let lastViewed = lastViewedAt else {
            return true // Never viewed, due now
        }
        // Simple interval: review after 1 day initially, then based on view count
        let daysSinceView = Calendar.current.dateComponents([.day], from: lastViewed, to: Date()).day ?? 0
        let interval = min(viewCount + 1, 7) // Cap at 7 days
        return daysSinceView >= interval
    }

    init(
        id: String = UUID().uuidString,
        title: String,
        content: String,
        sourceMaterialIds: [String],
        tags: [String] = [],
        createdAt: Date = Date(),
        lastViewedAt: Date? = nil,
        viewCount: Int = 0
    ) {
        self.id = id
        self.title = title
        self.content = content
        self.sourceMaterialIds = sourceMaterialIds
        self.tags = tags
        self.createdAt = createdAt
        self.lastViewedAt = lastViewedAt
        self.viewCount = viewCount
    }

    /// Mark the card as viewed
    mutating func markViewed() {
        lastViewedAt = Date()
        viewCount += 1
    }
}

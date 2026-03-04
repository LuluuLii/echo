//
//  EchoSession.swift
//  Echo
//
//  Created by Li Chenlu on 2026/3/5.
//

import Foundation

/// Represents an Echo session where users interact with an activation card
struct EchoSession: Identifiable, Codable, Equatable {
    let id: String
    let activationCardId: String
    var topic: String
    var messages: [ChatMessage]
    let startedAt: Date
    var endedAt: Date?

    /// Session phases
    enum Phase: String, Codable {
        case topicInput
        case materialSelection
        case activation
        case chat
        case completed
    }

    var phase: Phase

    init(
        id: String = UUID().uuidString,
        activationCardId: String,
        topic: String = "",
        messages: [ChatMessage] = [],
        phase: Phase = .topicInput,
        startedAt: Date = Date(),
        endedAt: Date? = nil
    ) {
        self.id = id
        self.activationCardId = activationCardId
        self.topic = topic
        self.messages = messages
        self.phase = phase
        self.startedAt = startedAt
        self.endedAt = endedAt
    }
}

/// A chat message in an Echo session
struct ChatMessage: Identifiable, Codable, Equatable {
    let id: String
    var role: Role
    var content: String
    let timestamp: Date

    enum Role: String, Codable {
        case user
        case assistant
        case system
    }

    init(
        id: String = UUID().uuidString,
        role: Role,
        content: String,
        timestamp: Date = Date()
    ) {
        self.id = id
        self.role = role
        self.content = content
        self.timestamp = timestamp
    }
}

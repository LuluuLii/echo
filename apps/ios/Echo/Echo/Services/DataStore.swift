//
//  DataStore.swift
//  Echo
//
//  Created by Li Chenlu on 2026/3/5.
//

import Foundation
import SwiftUI

/// Main data store for Echo app
/// Uses iCloud Drive for persistence with local caching
@MainActor
class DataStore: ObservableObject {
    static let shared = DataStore()

    @Published var materials: [Material] = []
    @Published var activationCards: [ActivationCard] = []
    @Published var sessions: [EchoSession] = []
    @Published var isLoading = false
    @Published var lastSyncDate: Date?

    private let fileManager = FileManager.default
    private var iCloudURL: URL? {
        fileManager.url(forUbiquityContainerIdentifier: nil)?
            .appendingPathComponent("Documents")
    }

    private var localURL: URL {
        fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
    }

    private init() {
        Task {
            await loadData()
        }
    }

    // MARK: - Data Loading

    func loadData() async {
        isLoading = true
        defer { isLoading = false }

        // Try iCloud first, fall back to local
        let storageURL = iCloudURL ?? localURL

        do {
            materials = try await loadJSON(from: storageURL.appendingPathComponent("materials.json"))
            activationCards = try await loadJSON(from: storageURL.appendingPathComponent("activationCards.json"))
            sessions = try await loadJSON(from: storageURL.appendingPathComponent("sessions.json"))
            lastSyncDate = Date()
            print("[DataStore] Loaded data from \(iCloudURL != nil ? "iCloud" : "local")")
        } catch {
            print("[DataStore] Failed to load data: \(error)")
        }
    }

    private func loadJSON<T: Decodable>(from url: URL) async throws -> [T] {
        guard fileManager.fileExists(atPath: url.path) else {
            return []
        }
        let data = try Data(contentsOf: url)
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        return try decoder.decode([T].self, from: data)
    }

    // MARK: - Data Saving

    private func saveData() async {
        let storageURL = iCloudURL ?? localURL

        // Ensure directory exists
        try? fileManager.createDirectory(at: storageURL, withIntermediateDirectories: true)

        do {
            try await saveJSON(materials, to: storageURL.appendingPathComponent("materials.json"))
            try await saveJSON(activationCards, to: storageURL.appendingPathComponent("activationCards.json"))
            try await saveJSON(sessions, to: storageURL.appendingPathComponent("sessions.json"))
            lastSyncDate = Date()
            print("[DataStore] Saved data to \(iCloudURL != nil ? "iCloud" : "local")")
        } catch {
            print("[DataStore] Failed to save data: \(error)")
        }
    }

    private func saveJSON<T: Encodable>(_ items: [T], to url: URL) async throws {
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = .prettyPrinted
        let data = try encoder.encode(items)
        try data.write(to: url)
    }

    // MARK: - Materials CRUD

    func addMaterial(_ material: Material) async {
        materials.append(material)
        await saveData()
    }

    func updateMaterial(_ material: Material) async {
        if let index = materials.firstIndex(where: { $0.id == material.id }) {
            materials[index] = material
            await saveData()
        }
    }

    func deleteMaterial(id: String) async {
        materials.removeAll { $0.id == id }
        await saveData()
    }

    // MARK: - Activation Cards CRUD

    func addActivationCard(_ card: ActivationCard) async {
        activationCards.append(card)
        await saveData()
    }

    func updateActivationCard(_ card: ActivationCard) async {
        if let index = activationCards.firstIndex(where: { $0.id == card.id }) {
            activationCards[index] = card
            await saveData()
        }
    }

    func deleteActivationCard(id: String) async {
        activationCards.removeAll { $0.id == id }
        await saveData()
    }

    /// Get today's cards that are due for review
    var todayCards: [ActivationCard] {
        activationCards.filter { $0.isDueToday }
    }

    // MARK: - Sessions CRUD

    func addSession(_ session: EchoSession) async {
        sessions.append(session)
        await saveData()
    }

    func updateSession(_ session: EchoSession) async {
        if let index = sessions.firstIndex(where: { $0.id == session.id }) {
            sessions[index] = session
            await saveData()
        }
    }

    /// Get recent sessions
    func recentSessions(limit: Int = 10) -> [EchoSession] {
        Array(sessions.sorted { $0.startedAt > $1.startedAt }.prefix(limit))
    }
}

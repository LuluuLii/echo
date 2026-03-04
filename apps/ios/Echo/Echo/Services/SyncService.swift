//
//  SyncService.swift
//  Echo
//
//  Created by Li Chenlu on 2026/3/5.
//

import Foundation

/// Service for syncing data with iCloud Drive and web app
/// Will integrate with Loro CRDT for conflict resolution
class SyncService: ObservableObject {
    static let shared = SyncService()

    @Published var syncStatus: SyncStatus = .idle
    @Published var lastSyncTime: Date?

    enum SyncStatus: Equatable {
        case idle
        case syncing
        case success
        case error(String)
    }

    private let fileManager = FileManager.default

    private init() {
        // Monitor iCloud availability
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(iCloudAccountChanged),
            name: NSUbiquitousKeyValueStore.didChangeExternallyNotification,
            object: nil
        )
    }

    @objc private func iCloudAccountChanged(_ notification: Notification) {
        print("[SyncService] iCloud account changed")
        Task {
            await sync()
        }
    }

    // MARK: - iCloud Status

    var isICloudAvailable: Bool {
        fileManager.ubiquityIdentityToken != nil
    }

    var iCloudContainerURL: URL? {
        fileManager.url(forUbiquityContainerIdentifier: nil)
    }

    // MARK: - Sync Operations

    /// Perform sync with iCloud
    @MainActor
    func sync() async {
        guard isICloudAvailable else {
            syncStatus = .error("iCloud not available")
            return
        }

        syncStatus = .syncing

        do {
            // TODO: Implement Loro CRDT sync
            // 1. Load local Loro document
            // 2. Load remote Loro snapshot from iCloud
            // 3. Merge documents
            // 4. Save merged snapshot back to iCloud

            // For now, just reload data
            await DataStore.shared.loadData()

            syncStatus = .success
            lastSyncTime = Date()
        } catch {
            syncStatus = .error(error.localizedDescription)
        }
    }

    // MARK: - Loro Integration (TODO)

    /// Initialize Loro document from stored snapshot
    func loadLoroDocument() async throws {
        // TODO: Implement with loro-swift
        // let loro = Loro()
        // if let snapshot = loadSnapshot() {
        //     loro.import(snapshot)
        // }
    }

    /// Export Loro document to snapshot for storage
    func saveLoroDocument() async throws {
        // TODO: Implement with loro-swift
        // let snapshot = loro.exportSnapshot()
        // saveSnapshot(snapshot)
    }
}

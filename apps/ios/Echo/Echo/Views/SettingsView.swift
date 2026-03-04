//
//  SettingsView.swift
//  Echo
//
//  Created by Li Chenlu on 2026/3/5.
//

import SwiftUI

struct SettingsView: View {
    @StateObject private var syncService = SyncService.shared
    @StateObject private var dataStore = DataStore.shared
    @AppStorage("apiProvider") private var apiProvider = "openai"
    @AppStorage("apiKey") private var apiKey = ""
    @AppStorage("baseURL") private var baseURL = ""

    var body: some View {
        NavigationStack {
            Form {
                // Sync Status
                Section("Sync") {
                    HStack {
                        Label("iCloud", systemImage: "icloud")
                        Spacer()
                        if syncService.isICloudAvailable {
                            Text("Connected")
                                .foregroundStyle(.green)
                        } else {
                            Text("Not Available")
                                .foregroundStyle(.secondary)
                        }
                    }

                    if let lastSync = syncService.lastSyncTime {
                        HStack {
                            Text("Last Sync")
                            Spacer()
                            Text(lastSync, style: .relative)
                                .foregroundStyle(.secondary)
                        }
                    }

                    Button {
                        Task {
                            await syncService.sync()
                        }
                    } label: {
                        HStack {
                            Text("Sync Now")
                            Spacer()
                            if syncService.syncStatus == .syncing {
                                ProgressView()
                            }
                        }
                    }
                    .disabled(syncService.syncStatus == .syncing)
                }

                // AI Provider
                Section("AI Provider") {
                    Picker("Provider", selection: $apiProvider) {
                        Text("OpenAI").tag("openai")
                        Text("OpenAI Compatible").tag("openai-compatible")
                        Text("Anthropic").tag("anthropic")
                    }

                    if apiProvider == "openai-compatible" {
                        TextField("Base URL", text: $baseURL)
                            .textContentType(.URL)
                            .autocapitalization(.none)
                    }

                    SecureField("API Key", text: $apiKey)
                        .textContentType(.password)
                }

                // Data
                Section("Data") {
                    HStack {
                        Text("Materials")
                        Spacer()
                        Text("\(dataStore.materials.count)")
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text("Activation Cards")
                        Spacer()
                        Text("\(dataStore.activationCards.count)")
                            .foregroundStyle(.secondary)
                    }

                    HStack {
                        Text("Sessions")
                        Spacer()
                        Text("\(dataStore.sessions.count)")
                            .foregroundStyle(.secondary)
                    }
                }

                // About
                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundStyle(.secondary)
                    }

                    Link(destination: URL(string: "https://github.com/anthropics/echo")!) {
                        HStack {
                            Text("Source Code")
                            Spacer()
                            Image(systemName: "arrow.up.right")
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }
}

#Preview {
    SettingsView()
}

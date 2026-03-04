//
//  EchoApp.swift
//  Echo
//
//  Created by Li Chenlu on 2026/3/5.
//

import SwiftUI

@main
struct EchoApp: App {
    @Environment(\.scenePhase) private var scenePhase
    @State private var importedCount = 0
    @State private var showImportAlert = false

    var body: some Scene {
        WindowGroup {
            ContentView()
                .onChange(of: scenePhase) { _, newPhase in
                    if newPhase == .active {
                        checkPendingMaterials()
                    }
                }
                .alert("已导入 \(importedCount) 条内容", isPresented: $showImportAlert) {
                    Button("查看") {
                        // TODO: Navigate to library
                    }
                    Button("好的", role: .cancel) {}
                } message: {
                    Text("来自备忘录的内容已添加到素材库")
                }
        }
    }

    private func checkPendingMaterials() {
        Task {
            let count = await PendingMaterialsService.shared.processPendingMaterials()
            if count > 0 {
                await MainActor.run {
                    importedCount = count
                    showImportAlert = true
                }
            }
        }
    }
}

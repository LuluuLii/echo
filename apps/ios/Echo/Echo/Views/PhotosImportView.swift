//
//  PhotosImportView.swift
//  Echo
//
//  Created by Li Chenlu on 2026/3/5.
//

import SwiftUI
import Photos

struct PhotosImportView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var importer = PhotosImporter.shared

    @State private var selectedTab: PhotoTab = .screenshots
    @State private var processedPhotos: [PhotosImporter.ProcessedPhoto] = []
    @State private var selectedIds: Set<String> = []
    @State private var isLoading = false
    @State private var showingResults = false
    @State private var importedCount = 0

    enum PhotoTab: String, CaseIterable {
        case screenshots = "截图"
        case recent = "最近"

        var icon: String {
            switch self {
            case .screenshots: return "camera.viewfinder"
            case .recent: return "photo.on.rectangle"
            }
        }
    }

    var body: some View {
        NavigationStack {
            Group {
                if importer.authorizationStatus == .notDetermined {
                    requestAccessView
                } else if importer.authorizationStatus == .denied || importer.authorizationStatus == .restricted {
                    deniedAccessView
                } else {
                    contentView
                }
            }
            .navigationTitle("从相册导入")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("取消") {
                        dismiss()
                    }
                }

                if !selectedIds.isEmpty {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("导入 (\(selectedIds.count))") {
                            importSelected()
                        }
                        .fontWeight(.semibold)
                    }
                }
            }
            .alert("导入完成", isPresented: $showingResults) {
                Button("好的") {
                    dismiss()
                }
            } message: {
                Text("成功导入 \(importedCount) 条内容")
            }
        }
    }

    // MARK: - Request Access View

    private var requestAccessView: some View {
        VStack(spacing: 24) {
            Image(systemName: "photo.on.rectangle.angled")
                .font(.system(size: 64))
                .foregroundStyle(.blue)

            Text("访问相册")
                .font(.title2)
                .fontWeight(.bold)

            Text("Echo 需要访问你的相册来导入截图和照片中的文字内容")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)

            Button {
                Task {
                    await importer.requestAccess()
                    if importer.authorizationStatus == .authorized || importer.authorizationStatus == .limited {
                        await loadPhotos()
                    }
                }
            } label: {
                Text("允许访问")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(.horizontal, 32)
        }
        .padding()
    }

    // MARK: - Denied Access View

    private var deniedAccessView: some View {
        VStack(spacing: 24) {
            Image(systemName: "photo.badge.exclamationmark")
                .font(.system(size: 64))
                .foregroundStyle(.orange)

            Text("无法访问相册")
                .font(.title2)
                .fontWeight(.bold)

            Text("请在系统设置中允许 Echo 访问你的照片")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button {
                if let url = URL(string: UIApplication.openSettingsURLString) {
                    UIApplication.shared.open(url)
                }
            } label: {
                Text("打开设置")
                    .fontWeight(.semibold)
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.blue)
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(.horizontal, 32)
        }
        .padding()
    }

    // MARK: - Content View

    private var contentView: some View {
        VStack(spacing: 0) {
            // Tab picker
            Picker("类型", selection: $selectedTab) {
                ForEach(PhotoTab.allCases, id: \.self) { tab in
                    Label(tab.rawValue, systemImage: tab.icon).tag(tab)
                }
            }
            .pickerStyle(.segmented)
            .padding()
            .onChange(of: selectedTab) { _, _ in
                Task {
                    await loadPhotos()
                }
            }

            // Progress indicator
            if isLoading || importer.isProcessing {
                VStack(spacing: 12) {
                    ProgressView()
                    if importer.isProcessing {
                        Text("正在识别... \(Int(importer.processingProgress * 100))%")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if processedPhotos.isEmpty {
                emptyView
            } else {
                photoGrid
            }
        }
        .task {
            if importer.authorizationStatus == .authorized || importer.authorizationStatus == .limited {
                await loadPhotos()
            }
        }
    }

    // MARK: - Photo Grid

    private var photoGrid: some View {
        ScrollView {
            LazyVGrid(columns: [
                GridItem(.flexible(), spacing: 2),
                GridItem(.flexible(), spacing: 2),
                GridItem(.flexible(), spacing: 2)
            ], spacing: 2) {
                ForEach(processedPhotos) { photo in
                    PhotoCell(
                        photo: photo,
                        isSelected: selectedIds.contains(photo.id)
                    ) {
                        toggleSelection(photo.id)
                    }
                }
            }

            // Summary
            if !processedPhotos.isEmpty {
                VStack(spacing: 8) {
                    let withText = processedPhotos.filter { $0.hasUsableContent }.count
                    Text("\(processedPhotos.count) 张照片，\(withText) 张包含可识别文字")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    if withText > 0 && selectedIds.isEmpty {
                        Button("全选有文字的") {
                            selectedIds = Set(processedPhotos.filter { $0.hasUsableContent }.map { $0.id })
                        }
                        .font(.caption)
                    }
                }
                .padding()
            }
        }
    }

    private var emptyView: some View {
        VStack(spacing: 16) {
            Image(systemName: selectedTab == .screenshots ? "camera.viewfinder" : "photo")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text(selectedTab == .screenshots ? "没有找到截图" : "没有找到照片")
                .font(.headline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Actions

    private func loadPhotos() async {
        isLoading = true
        selectedIds.removeAll()
        processedPhotos.removeAll()

        let assets: [PHAsset]
        if selectedTab == .screenshots {
            assets = await importer.fetchScreenshots(limit: 50)
        } else {
            assets = await importer.fetchRecentPhotos(limit: 50)
        }

        await MainActor.run {
            importer.isProcessing = true
        }

        processedPhotos = await importer.processPhotos(assets)

        await MainActor.run {
            importer.isProcessing = false
            isLoading = false
        }
    }

    private func toggleSelection(_ id: String) {
        if selectedIds.contains(id) {
            selectedIds.remove(id)
        } else {
            // Only allow selecting photos with usable content
            if let photo = processedPhotos.first(where: { $0.id == id }),
               photo.hasUsableContent {
                selectedIds.insert(id)
            }
        }
    }

    private func importSelected() {
        Task {
            let photosToImport = processedPhotos.filter { selectedIds.contains($0.id) }
            importedCount = await importer.importPhotos(photosToImport)
            showingResults = true
        }
    }
}

// MARK: - Photo Cell

struct PhotoCell: View {
    let photo: PhotosImporter.ProcessedPhoto
    let isSelected: Bool
    let onTap: () -> Void

    var body: some View {
        ZStack(alignment: .topTrailing) {
            // Thumbnail
            if let thumbnail = photo.thumbnail {
                Image(uiImage: thumbnail)
                    .resizable()
                    .aspectRatio(1, contentMode: .fill)
                    .clipped()
            } else {
                Rectangle()
                    .fill(Color.gray.opacity(0.2))
                    .aspectRatio(1, contentMode: .fill)
            }

            // Overlay for photos without text
            if !photo.hasUsableContent {
                Rectangle()
                    .fill(Color.black.opacity(0.5))

                VStack {
                    Spacer()
                    Text("无文字")
                        .font(.caption2)
                        .foregroundStyle(.white)
                        .padding(4)
                }
            }

            // Type badge
            HStack {
                Image(systemName: typeIcon)
                    .font(.caption2)
                    .foregroundStyle(.white)
                    .padding(4)
                    .background(typeColor.opacity(0.8))
                    .clipShape(Circle())
                Spacer()
            }
            .padding(4)

            // Selection indicator
            if photo.hasUsableContent {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(isSelected ? .blue : .white)
                    .shadow(radius: 2)
                    .padding(6)
            }
        }
        .contentShape(Rectangle())
        .onTapGesture {
            onTap()
        }
    }

    private var typeIcon: String {
        switch photo.type {
        case .screenshot: return "camera.viewfinder"
        case .travel: return "airplane"
        case .food: return "fork.knife"
        case .document: return "doc.text"
        case .other: return "photo"
        }
    }

    private var typeColor: Color {
        switch photo.type {
        case .screenshot: return .blue
        case .travel: return .green
        case .food: return .orange
        case .document: return .purple
        case .other: return .gray
        }
    }
}

#Preview {
    PhotosImportView()
}

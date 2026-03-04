//
//  ImportView.swift
//  Echo
//
//  Created by Li Chenlu on 2026/3/5.
//

import SwiftUI
import UniformTypeIdentifiers

struct ImportView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var importer = NotesImporter.shared
    @State private var showFilePicker = false
    @State private var showShortcutGuide = false
    @State private var showPhotosImport = false

    var body: some View {
        NavigationStack {
            List {
                // Photos import (recommended)
                Section {
                    Button {
                        showPhotosImport = true
                    } label: {
                        HStack(spacing: 16) {
                            Image(systemName: "photo.on.rectangle.angled")
                                .font(.title)
                                .foregroundStyle(.blue)
                                .frame(width: 44)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("从相册导入")
                                    .font(.headline)
                                    .foregroundStyle(.primary)
                                Text("识别截图文字、旅行照片等")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }

                            Spacer()

                            Text("推荐")
                                .font(.caption)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.green.opacity(0.2))
                                .foregroundStyle(.green)
                                .clipShape(Capsule())
                        }
                    }
                } header: {
                    Text("相册")
                }

                // Notes import
                Section {
                    Button {
                        showShortcutGuide = true
                    } label: {
                        HStack(spacing: 16) {
                            Image(systemName: "note.text")
                                .font(.title)
                                .foregroundStyle(.yellow)
                                .frame(width: 44)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("从备忘录导入")
                                    .font(.headline)
                                    .foregroundStyle(.primary)
                                Text("通过快捷指令批量导出")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                } header: {
                    Text("备忘录")
                }

                // File import
                Section {
                    Button {
                        showFilePicker = true
                    } label: {
                        HStack(spacing: 16) {
                            Image(systemName: "doc.badge.plus")
                                .font(.title)
                                .foregroundStyle(.blue)
                                .frame(width: 44)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("从文件导入")
                                    .font(.headline)
                                    .foregroundStyle(.primary)
                                Text("支持 JSON 格式的导出文件")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }

                    Button {
                        Task {
                            await importer.importFromClipboard()
                        }
                    } label: {
                        HStack(spacing: 16) {
                            Image(systemName: "doc.on.clipboard")
                                .font(.title)
                                .foregroundStyle(.orange)
                                .frame(width: 44)

                            VStack(alignment: .leading, spacing: 4) {
                                Text("从剪贴板导入")
                                    .font(.headline)
                                    .foregroundStyle(.primary)
                                Text("粘贴复制的文本内容")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                } header: {
                    Text("其他方式")
                }
            }
            .navigationTitle("导入备忘录")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("完成") {
                        dismiss()
                    }
                }
            }
            .fileImporter(
                isPresented: $showFilePicker,
                allowedContentTypes: [.json],
                allowsMultipleSelection: false
            ) { result in
                switch result {
                case .success(let urls):
                    if let url = urls.first {
                        Task {
                            await importer.importFromFile(url)
                        }
                    }
                case .failure(let error):
                    print("File picker error: \(error)")
                }
            }
            .sheet(isPresented: $showShortcutGuide) {
                ShortcutGuideView()
            }
            .fullScreenCover(isPresented: $showPhotosImport) {
                PhotosImportView()
            }
            .alert(
                importer.importResult?.success == true ? "导入成功" : "导入失败",
                isPresented: .init(
                    get: { importer.importResult != nil },
                    set: { if !$0 { importer.importResult = nil } }
                )
            ) {
                Button("好的") {
                    importer.importResult = nil
                }
            } message: {
                Text(importer.importResult?.message ?? "")
            }
        }
    }
}

// MARK: - Shortcut Guide View

struct ShortcutGuideView: View {
    @Environment(\.dismiss) private var dismiss
    @State private var copiedJSON = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    // Header
                    VStack(alignment: .leading, spacing: 8) {
                        Image(systemName: "shortcuts")
                            .font(.system(size: 48))
                            .foregroundStyle(.pink)

                        Text("使用快捷指令批量导入")
                            .font(.title2)
                            .fontWeight(.bold)

                        Text("按照以下步骤设置一个快捷指令，可以一次性导入所有备忘录")
                            .foregroundStyle(.secondary)
                    }

                    Divider()

                    // Steps
                    VStack(alignment: .leading, spacing: 20) {
                        StepView(number: 1, title: "打开快捷指令 App") {
                            Text("在 iPhone 上打开「快捷指令」应用")
                        }

                        StepView(number: 2, title: "创建新快捷指令") {
                            Text("点击右上角 + 创建新的快捷指令")
                        }

                        StepView(number: 3, title: "添加操作") {
                            VStack(alignment: .leading, spacing: 8) {
                                Text("依次添加以下操作：")
                                BulletPoint("查找备忘录 → 选择文件夹")
                                BulletPoint("重复 → 对每个备忘录")
                                BulletPoint("获取备忘录详情 → 正文")
                                BulletPoint("添加到变量 → notes")
                                BulletPoint("结束重复")
                                BulletPoint("获取变量 notes")
                                BulletPoint("合并文本 → 用换行符分隔")
                                BulletPoint("存储文件 → iCloud/Echo/import.txt")
                            }
                        }

                        StepView(number: 4, title: "运行快捷指令") {
                            Text("运行后，备忘录会被保存到 iCloud Drive 的 Echo 文件夹")
                        }

                        StepView(number: 5, title: "在 Echo 中导入") {
                            Text("返回 Echo，选择「从文件导入」，选择 import.txt 文件")
                        }
                    }

                    Divider()

                    // Alternative: Get shortcut link
                    VStack(alignment: .leading, spacing: 12) {
                        Text("或者直接获取快捷指令")
                            .font(.headline)

                        Link(destination: URL(string: "https://www.icloud.com/shortcuts/echo-notes-export")!) {
                            HStack {
                                Image(systemName: "arrow.down.circle.fill")
                                Text("下载 Echo 备忘录导出快捷指令")
                            }
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.pink)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                        }

                        Text("（即将上线）")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .frame(maxWidth: .infinity)
                    }
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("完成") {
                        dismiss()
                    }
                }
            }
        }
    }
}

struct StepView<Content: View>: View {
    let number: Int
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        HStack(alignment: .top, spacing: 16) {
            Text("\(number)")
                .font(.headline)
                .foregroundStyle(.white)
                .frame(width: 28, height: 28)
                .background(Color.pink)
                .clipShape(Circle())

            VStack(alignment: .leading, spacing: 8) {
                Text(title)
                    .font(.headline)
                content()
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
        }
    }
}

struct BulletPoint: View {
    let text: String

    init(_ text: String) {
        self.text = text
    }

    var body: some View {
        HStack(alignment: .top, spacing: 8) {
            Text("•")
            Text(text)
        }
        .font(.caption)
    }
}

#Preview {
    ImportView()
}

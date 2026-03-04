//
//  LibraryView.swift
//  Echo
//
//  Created by Li Chenlu on 2026/3/5.
//

import SwiftUI

struct LibraryView: View {
    @StateObject private var dataStore = DataStore.shared
    @State private var searchText = ""
    @State private var selectedTab: LibraryTab = .materials
    @State private var showingAddMaterial = false
    @State private var showingImport = false
    @State private var selectedMaterial: Material?

    enum LibraryTab: String, CaseIterable {
        case materials = "Materials"
        case cards = "Cards"
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Tab Picker
                Picker("View", selection: $selectedTab) {
                    ForEach(LibraryTab.allCases, id: \.self) { tab in
                        Text(tab.rawValue).tag(tab)
                    }
                }
                .pickerStyle(.segmented)
                .padding()

                // Content
                switch selectedTab {
                case .materials:
                    materialsContent
                case .cards:
                    cardsContent
                }
            }
            .navigationTitle("Library")
            .searchable(text: $searchText, prompt: "Search")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button {
                        showingImport = true
                    } label: {
                        Image(systemName: "square.and.arrow.down")
                    }
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showingAddMaterial = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
        }
        .sheet(isPresented: $showingAddMaterial) {
            AddMaterialView()
        }
        .sheet(isPresented: $showingImport) {
            ImportView()
        }
        .sheet(item: $selectedMaterial) { material in
            MaterialDetailView(material: material)
        }
    }

    // MARK: - Materials Content

    private var filteredMaterials: [Material] {
        if searchText.isEmpty {
            return dataStore.materials
        }
        return dataStore.materials.filter {
            $0.content.localizedCaseInsensitiveContains(searchText) ||
            ($0.title ?? "").localizedCaseInsensitiveContains(searchText)
        }
    }

    private var materialsContent: some View {
        Group {
            if filteredMaterials.isEmpty {
                emptyMaterialsState
            } else {
                List {
                    ForEach(filteredMaterials) { material in
                        MaterialRow(material: material)
                            .onTapGesture {
                                selectedMaterial = material
                            }
                    }
                    .onDelete { indexSet in
                        Task {
                            for index in indexSet {
                                await dataStore.deleteMaterial(id: filteredMaterials[index].id)
                            }
                        }
                    }
                }
                .listStyle(.plain)
            }
        }
    }

    private var emptyMaterialsState: some View {
        VStack(spacing: 16) {
            Image(systemName: "doc.text")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("No materials yet")
                .font(.headline)

            Text("Add your first material to get started")
                .font(.body)
                .foregroundStyle(.secondary)

            Button {
                showingAddMaterial = true
            } label: {
                Label("Add Material", systemImage: "plus")
            }
            .buttonStyle(.borderedProminent)
        }
        .padding()
    }

    // MARK: - Cards Content

    private var filteredCards: [ActivationCard] {
        if searchText.isEmpty {
            return dataStore.activationCards
        }
        return dataStore.activationCards.filter {
            $0.title.localizedCaseInsensitiveContains(searchText) ||
            $0.content.localizedCaseInsensitiveContains(searchText)
        }
    }

    private var cardsContent: some View {
        Group {
            if filteredCards.isEmpty {
                emptyCardsState
            } else {
                List {
                    ForEach(filteredCards) { card in
                        CardRow(card: card)
                    }
                    .onDelete { indexSet in
                        Task {
                            for index in indexSet {
                                await dataStore.deleteActivationCard(id: filteredCards[index].id)
                            }
                        }
                    }
                }
                .listStyle(.plain)
            }
        }
    }

    private var emptyCardsState: some View {
        VStack(spacing: 16) {
            Image(systemName: "rectangle.stack")
                .font(.system(size: 48))
                .foregroundStyle(.secondary)

            Text("No cards yet")
                .font(.headline)

            Text("Cards are generated from your materials")
                .font(.body)
                .foregroundStyle(.secondary)
        }
        .padding()
    }
}

// MARK: - Material Row

struct MaterialRow: View {
    let material: Material

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(material.displayTitle)
                .font(.headline)
                .lineLimit(1)

            Text(material.preview)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            HStack {
                Text(material.createdAt, style: .date)
                    .font(.caption)
                    .foregroundStyle(.tertiary)

                if !material.tags.isEmpty {
                    Text("•")
                        .foregroundStyle(.tertiary)

                    Text(material.tags.joined(separator: ", "))
                        .font(.caption)
                        .foregroundStyle(.blue)
                        .lineLimit(1)
                }
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Card Row

struct CardRow: View {
    let card: ActivationCard

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(card.title)
                    .font(.headline)
                    .lineLimit(1)

                Spacer()

                if card.isDueToday {
                    Text("Due")
                        .font(.caption)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 2)
                        .background(Color.orange.opacity(0.2))
                        .foregroundStyle(.orange)
                        .clipShape(Capsule())
                }
            }

            Text(card.content)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .lineLimit(2)

            HStack {
                Text("Viewed \(card.viewCount)x")
                    .font(.caption)
                    .foregroundStyle(.tertiary)

                Spacer()

                Text("\(card.sourceMaterialIds.count) sources")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding(.vertical, 4)
    }
}

// MARK: - Add Material View

struct AddMaterialView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var dataStore = DataStore.shared
    @State private var content = ""
    @State private var title = ""
    @State private var tagsText = ""

    var body: some View {
        NavigationStack {
            Form {
                Section("Content") {
                    TextEditor(text: $content)
                        .frame(minHeight: 200)
                }

                Section("Details (Optional)") {
                    TextField("Title", text: $title)
                    TextField("Tags (comma separated)", text: $tagsText)
                }
            }
            .navigationTitle("Add Material")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        save()
                    }
                    .disabled(content.isEmpty)
                }
            }
        }
    }

    private func save() {
        let tags = tagsText
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces) }
            .filter { !$0.isEmpty }

        let material = Material(
            content: content,
            title: title.isEmpty ? nil : title,
            tags: tags
        )

        Task {
            await dataStore.addMaterial(material)
            dismiss()
        }
    }
}

// MARK: - Material Detail View

struct MaterialDetailView: View {
    let material: Material
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let title = material.title {
                        Text(title)
                            .font(.title2)
                            .fontWeight(.bold)
                    }

                    Text(material.content)
                        .font(.body)
                        .lineSpacing(6)

                    if !material.tags.isEmpty {
                        Divider()

                        FlowLayout(spacing: 8) {
                            ForEach(material.tags, id: \.self) { tag in
                                Text(tag)
                                    .font(.caption)
                                    .padding(.horizontal, 12)
                                    .padding(.vertical, 6)
                                    .background(Color.blue.opacity(0.1))
                                    .foregroundStyle(.blue)
                                    .clipShape(Capsule())
                            }
                        }
                    }

                    Divider()

                    VStack(alignment: .leading, spacing: 8) {
                        Label("Created \(material.createdAt, style: .date)", systemImage: "calendar")
                        Label("Updated \(material.updatedAt, style: .relative)", systemImage: "clock")
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
                .padding()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    LibraryView()
}

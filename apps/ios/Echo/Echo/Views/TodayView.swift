//
//  TodayView.swift
//  Echo
//
//  Created by Li Chenlu on 2026/3/5.
//

import SwiftUI

struct TodayView: View {
    @StateObject private var dataStore = DataStore.shared
    @State private var selectedCard: ActivationCard?

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Header
                    headerSection

                    // Today's Cards
                    if dataStore.todayCards.isEmpty {
                        emptyState
                    } else {
                        cardsSection
                    }
                }
                .padding()
            }
            .navigationTitle("Today")
            .refreshable {
                await dataStore.loadData()
            }
        }
        .sheet(item: $selectedCard) { card in
            CardDetailView(card: card)
        }
    }

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(dateString)
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Text("Ready to Echo?")
                .font(.largeTitle)
                .fontWeight(.bold)

            Text("\(dataStore.todayCards.count) cards to review today")
                .font(.body)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }

    private var dateString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, MMMM d"
        return formatter.string(from: Date())
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "checkmark.circle")
                .font(.system(size: 48))
                .foregroundStyle(.green)

            Text("All caught up!")
                .font(.headline)

            Text("No cards to review today. Add new materials to generate more cards.")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .padding(.vertical, 48)
    }

    private var cardsSection: some View {
        VStack(spacing: 16) {
            ForEach(dataStore.todayCards) { card in
                CardPreviewRow(card: card)
                    .onTapGesture {
                        selectedCard = card
                    }
            }
        }
    }
}

// MARK: - Card Preview Row

struct CardPreviewRow: View {
    let card: ActivationCard

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text(card.title)
                    .font(.headline)
                    .lineLimit(2)

                Spacer()

                Image(systemName: "chevron.right")
                    .foregroundStyle(.tertiary)
            }

            Text(card.content)
                .font(.body)
                .foregroundStyle(.secondary)
                .lineLimit(3)

            HStack {
                if !card.tags.isEmpty {
                    ForEach(card.tags.prefix(3), id: \.self) { tag in
                        Text(tag)
                            .font(.caption)
                            .padding(.horizontal, 8)
                            .padding(.vertical, 4)
                            .background(Color.blue.opacity(0.1))
                            .foregroundStyle(.blue)
                            .clipShape(Capsule())
                    }
                }

                Spacer()

                Text("Viewed \(card.viewCount)x")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .shadow(color: .black.opacity(0.05), radius: 8, y: 4)
    }
}

// MARK: - Card Detail View

struct CardDetailView: View {
    let card: ActivationCard
    @Environment(\.dismiss) private var dismiss
    @State private var showingEchoSession = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 24) {
                    Text(card.title)
                        .font(.title)
                        .fontWeight(.bold)

                    Text(card.content)
                        .font(.body)
                        .lineSpacing(6)

                    if !card.tags.isEmpty {
                        FlowLayout(spacing: 8) {
                            ForEach(card.tags, id: \.self) { tag in
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

                    Spacer(minLength: 24)

                    Button {
                        showingEchoSession = true
                    } label: {
                        Label("Start Echo", systemImage: "waveform")
                            .font(.headline)
                            .frame(maxWidth: .infinity)
                            .padding()
                            .background(Color.blue)
                            .foregroundStyle(.white)
                            .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
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
        .fullScreenCover(isPresented: $showingEchoSession) {
            EchoSessionView(cardId: card.id)
        }
    }
}

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.width ?? 0, subviews: subviews, spacing: spacing)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    struct FlowResult {
        var size: CGSize = .zero
        var positions: [CGPoint] = []

        init(in width: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var currentX: CGFloat = 0
            var currentY: CGFloat = 0
            var lineHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)

                if currentX + size.width > width && currentX > 0 {
                    currentX = 0
                    currentY += lineHeight + spacing
                    lineHeight = 0
                }

                positions.append(CGPoint(x: currentX, y: currentY))
                lineHeight = max(lineHeight, size.height)
                currentX += size.width + spacing
                self.size.width = max(self.size.width, currentX)
            }

            self.size.height = currentY + lineHeight
        }
    }
}

// MARK: - Echo Session View (Placeholder)

struct EchoSessionView: View {
    let cardId: String
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            VStack {
                Text("Echo Session")
                    .font(.title)
                Text("Coming soon...")
                    .foregroundStyle(.secondary)
            }
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") {
                        dismiss()
                    }
                }
            }
        }
    }
}

#Preview {
    TodayView()
}

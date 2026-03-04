//
//  PhotosImporter.swift
//  Echo
//
//  Created by Li Chenlu on 2026/3/5.
//

import Foundation
import Photos
import UIKit
import Vision

/// Service to import and process photos from the photo library
class PhotosImporter: ObservableObject {
    static let shared = PhotosImporter()

    @Published var authorizationStatus: PHAuthorizationStatus = .notDetermined
    @Published var isProcessing = false
    @Published var processingProgress: Double = 0

    private init() {
        authorizationStatus = PHPhotoLibrary.authorizationStatus(for: .readWrite)
    }

    // MARK: - Authorization

    func requestAccess() async -> Bool {
        let status = await PHPhotoLibrary.requestAuthorization(for: .readWrite)
        await MainActor.run {
            authorizationStatus = status
        }
        return status == .authorized || status == .limited
    }

    // MARK: - Fetch Photos

    /// Fetch recent photos from library
    func fetchRecentPhotos(limit: Int = 100) async -> [PHAsset] {
        guard authorizationStatus == .authorized || authorizationStatus == .limited else {
            return []
        }

        let options = PHFetchOptions()
        options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        options.fetchLimit = limit

        let results = PHAsset.fetchAssets(with: .image, options: options)
        var assets: [PHAsset] = []
        results.enumerateObjects { asset, _, _ in
            assets.append(asset)
        }
        return assets
    }

    /// Fetch screenshots specifically
    func fetchScreenshots(limit: Int = 50) async -> [PHAsset] {
        guard authorizationStatus == .authorized || authorizationStatus == .limited else {
            return []
        }

        let options = PHFetchOptions()
        options.sortDescriptors = [NSSortDescriptor(key: "creationDate", ascending: false)]
        options.predicate = NSPredicate(
            format: "mediaSubtype == %d",
            PHAssetMediaSubtype.photoScreenshot.rawValue
        )
        options.fetchLimit = limit

        let results = PHAsset.fetchAssets(with: .image, options: options)
        var assets: [PHAsset] = []
        results.enumerateObjects { asset, _, _ in
            assets.append(asset)
        }
        return assets
    }

    // MARK: - Image Loading

    /// Load UIImage from PHAsset
    func loadImage(from asset: PHAsset, targetSize: CGSize = CGSize(width: 1024, height: 1024)) async -> UIImage? {
        await withCheckedContinuation { continuation in
            let options = PHImageRequestOptions()
            options.deliveryMode = .highQualityFormat
            options.isNetworkAccessAllowed = true
            options.isSynchronous = false

            PHImageManager.default().requestImage(
                for: asset,
                targetSize: targetSize,
                contentMode: .aspectFit,
                options: options
            ) { image, _ in
                continuation.resume(returning: image)
            }
        }
    }

    /// Load thumbnail for preview
    func loadThumbnail(from asset: PHAsset) async -> UIImage? {
        await loadImage(from: asset, targetSize: CGSize(width: 200, height: 200))
    }

    // MARK: - OCR Text Recognition

    /// Extract text from image using Vision framework
    func extractText(from image: UIImage) async -> String? {
        guard let cgImage = image.cgImage else { return nil }

        return await withCheckedContinuation { continuation in
            let request = VNRecognizeTextRequest { request, error in
                guard error == nil,
                      let observations = request.results as? [VNRecognizedTextObservation] else {
                    continuation.resume(returning: nil)
                    return
                }

                let text = observations
                    .compactMap { $0.topCandidates(1).first?.string }
                    .joined(separator: "\n")

                continuation.resume(returning: text.isEmpty ? nil : text)
            }

            // Support Chinese and English
            request.recognitionLanguages = ["zh-Hans", "zh-Hant", "en-US"]
            request.recognitionLevel = .accurate
            request.usesLanguageCorrection = true

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                print("[PhotosImporter] OCR error: \(error)")
                continuation.resume(returning: nil)
            }
        }
    }

    // MARK: - Image Classification

    /// Classify image type
    enum PhotoType {
        case screenshot
        case travel
        case food
        case document
        case other

        var label: String {
            switch self {
            case .screenshot: return "截图"
            case .travel: return "旅行"
            case .food: return "美食"
            case .document: return "文档"
            case .other: return "其他"
            }
        }
    }

    /// Detect photo type using metadata and Vision
    func classifyPhoto(asset: PHAsset, image: UIImage) async -> PhotoType {
        // Check if it's a screenshot via mediaSubtype
        if asset.mediaSubtypes.contains(.photoScreenshot) {
            return .screenshot
        }

        // Check location for travel photos
        if asset.location != nil {
            // Has GPS data, likely travel/event photo
            return .travel
        }

        // Use Vision to classify
        guard let cgImage = image.cgImage else { return .other }

        return await withCheckedContinuation { continuation in
            let request = VNClassifyImageRequest { request, error in
                guard error == nil,
                      let observations = request.results as? [VNClassificationObservation] else {
                    continuation.resume(returning: .other)
                    return
                }

                // Check top classifications
                for observation in observations.prefix(5) {
                    let identifier = observation.identifier.lowercased()

                    if observation.confidence > 0.3 {
                        if identifier.contains("food") || identifier.contains("meal") ||
                           identifier.contains("restaurant") || identifier.contains("dish") {
                            continuation.resume(returning: .food)
                            return
                        }

                        if identifier.contains("landscape") || identifier.contains("mountain") ||
                           identifier.contains("beach") || identifier.contains("building") ||
                           identifier.contains("monument") || identifier.contains("cityscape") {
                            continuation.resume(returning: .travel)
                            return
                        }

                        if identifier.contains("text") || identifier.contains("document") ||
                           identifier.contains("paper") || identifier.contains("book") {
                            continuation.resume(returning: .document)
                            return
                        }
                    }
                }

                continuation.resume(returning: .other)
            }

            let handler = VNImageRequestHandler(cgImage: cgImage, options: [:])
            do {
                try handler.perform([request])
            } catch {
                print("[PhotosImporter] Classification error: \(error)")
                continuation.resume(returning: .other)
            }
        }
    }

    // MARK: - Batch Processing

    struct ProcessedPhoto: Identifiable {
        let id: String
        let asset: PHAsset
        let thumbnail: UIImage?
        let type: PhotoType
        let extractedText: String?
        let creationDate: Date?
        let location: CLLocation?

        var hasUsableContent: Bool {
            extractedText != nil && !(extractedText?.isEmpty ?? true)
        }
    }

    /// Process multiple photos and extract content
    func processPhotos(_ assets: [PHAsset], onProgress: ((Double) -> Void)? = nil) async -> [ProcessedPhoto] {
        var results: [ProcessedPhoto] = []
        let total = Double(assets.count)

        for (index, asset) in assets.enumerated() {
            // Load image
            guard let image = await loadImage(from: asset) else { continue }
            let thumbnail = await loadThumbnail(from: asset)

            // Classify
            let type = await classifyPhoto(asset: asset, image: image)

            // Extract text for screenshots and documents
            var extractedText: String? = nil
            if type == .screenshot || type == .document {
                extractedText = await extractText(from: image)
            }

            let processed = ProcessedPhoto(
                id: asset.localIdentifier,
                asset: asset,
                thumbnail: thumbnail,
                type: type,
                extractedText: extractedText,
                creationDate: asset.creationDate,
                location: asset.location
            )
            results.append(processed)

            // Update progress
            let progress = Double(index + 1) / total
            onProgress?(progress)
            await MainActor.run {
                self.processingProgress = progress
            }
        }

        return results
    }

    // MARK: - Import to Materials

    /// Import processed photo as material
    @MainActor
    func importAsMaterial(_ photo: ProcessedPhoto) async -> Material? {
        guard let text = photo.extractedText, !text.isEmpty else {
            return nil
        }

        // Generate title from first line or type
        let lines = text.split(separator: "\n", maxSplits: 1)
        let title = lines.first.map { String($0.prefix(50)) } ?? photo.type.label

        // Add location info if available
        var content = text
        if let location = photo.location {
            content += "\n\n📍 Location: \(location.coordinate.latitude), \(location.coordinate.longitude)"
        }

        let material = Material(
            content: content,
            title: title,
            tags: [photo.type.label, "照片导入"]
        )

        await DataStore.shared.addMaterial(material)
        return material
    }

    /// Batch import multiple photos
    @MainActor
    func importPhotos(_ photos: [ProcessedPhoto]) async -> Int {
        var count = 0
        for photo in photos where photo.hasUsableContent {
            if await importAsMaterial(photo) != nil {
                count += 1
            }
        }
        return count
    }
}

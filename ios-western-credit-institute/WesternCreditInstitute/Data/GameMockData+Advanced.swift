//
//  GameMockData+Advanced.swift
//  WesternCreditInstitute
//

import Foundation
import SwiftUI

extension GameMockData {

    // MARK: - Treasure Hunt

    static let treasures: [TreasureItem] = [
        TreasureItem(id: "tr_01", name: "Silver Coins", rarity: .common, reward: 15, distance: 85, claimed: false),
        TreasureItem(id: "tr_02", name: "Emerald Gem", rarity: .uncommon, reward: 30, distance: 150, claimed: false),
        TreasureItem(id: "tr_03", name: "Golden Crown", rarity: .rare, reward: 65, distance: 320, claimed: false),
        TreasureItem(id: "tr_04", name: "Crystal Vault", rarity: .epic, reward: 120, distance: 500, claimed: false),
        TreasureItem(id: "tr_05", name: "Legendary MUSO", rarity: .legendary, reward: 300, distance: 850, claimed: false),
        TreasureItem(id: "tr_06", name: "Bronze Token", rarity: .common, reward: 12, distance: 45, claimed: false),
        TreasureItem(id: "tr_07", name: "Jade Pendant", rarity: .uncommon, reward: 35, distance: 180, claimed: false),
    ]

    static let streakBonuses: [(days: Int, bonus: String, multiplier: Double)] = [
        (1, "No bonus", 1.0),
        (3, "1.2x multiplier", 1.2),
        (7, "1.5x multiplier", 1.5),
        (14, "2x multiplier", 2.0),
        (30, "3x multiplier", 3.0),
    ]

    // MARK: - 3D City Districts

    static let districts: [District] = [
        District(
            id: "dist_hollywood", name: "Hollywood", description: "The entertainment capital of the world. Home to the Walk of Fame and iconic studios.", color: Color(hex: "#FFD700"),
            landmarks: [
                Landmark(id: "lm_01", name: "Hollywood Sign", type: .landmark, discovered: true, treasureValue: 50),
                Landmark(id: "lm_02", name: "Walk of Fame", type: .landmark, discovered: true, treasureValue: 30),
                Landmark(id: "lm_03", name: "Grauman's Chinese Theatre", type: .landmark, discovered: false, treasureValue: 40),
                Landmark(id: "lm_04", name: "Hidden Studio Vault", type: .hiddenGem, discovered: false, treasureValue: 100),
            ]
        ),
        District(
            id: "dist_downtown", name: "Downtown LA", description: "The financial heart of Los Angeles with skyscrapers and cultural landmarks.", color: Color(hex: "#3B82F6"),
            landmarks: [
                Landmark(id: "lm_05", name: "Walt Disney Concert Hall", type: .landmark, discovered: true, treasureValue: 45),
                Landmark(id: "lm_06", name: "Crypto.com Arena", type: .landmark, discovered: false, treasureValue: 60),
                Landmark(id: "lm_07", name: "Bank Vault", type: .hiddenGem, discovered: false, treasureValue: 150),
            ]
        ),
        District(
            id: "dist_santamonica", name: "Santa Monica", description: "Beachside paradise with the famous pier and ocean views.", color: Color(hex: "#06B6D4"),
            landmarks: [
                Landmark(id: "lm_08", name: "Santa Monica Pier", type: .landmark, discovered: true, treasureValue: 35),
                Landmark(id: "lm_09", name: "Beach Treasure", type: .treasure, discovered: false, treasureValue: 75),
                Landmark(id: "lm_10", name: "Oceanview Gem", type: .hiddenGem, discovered: false, treasureValue: 80),
            ]
        ),
        District(
            id: "dist_beverlyhills", name: "Beverly Hills", description: "Luxury shopping and exclusive real estate in this iconic district.", color: Color(hex: "#8B5CF6"),
            landmarks: [
                Landmark(id: "lm_11", name: "Rodeo Drive", type: .landmark, discovered: true, treasureValue: 55),
                Landmark(id: "lm_12", name: "Beverly Hills Hotel", type: .landmark, discovered: false, treasureValue: 65),
                Landmark(id: "lm_13", name: "Mansion Vault", type: .hiddenGem, discovered: false, treasureValue: 200),
            ]
        ),
    ]

    // MARK: - Avatar Items

    static let avatarItems: [AvatarItem] = [
        // Outfits
        AvatarItem(id: "av_01", name: "Business Suit", category: .outfit, symbol: "shirt.fill", color: Color(hex: "#1E3A5F"), rarity: .rare, price: 100),
        AvatarItem(id: "av_02", name: "Casual Jeans", category: .outfit, symbol: "shirt.fill", color: Color(hex: "#3B82F6"), rarity: .common, price: 20),
        AvatarItem(id: "av_03", name: "Golden Robe", category: .outfit, symbol: "shirt.fill", color: Color(hex: "#FFD700"), rarity: .legendary, price: 500),
        AvatarItem(id: "av_04", name: "Streetwear", category: .outfit, symbol: "shirt.fill", color: Color(hex: "#EC4899"), rarity: .uncommon, price: 40),

        // Hats
        AvatarItem(id: "av_05", name: "Graduation Cap", category: .hat, symbol: "graduationcap.fill", color: Color(hex: "#0F172A"), rarity: .rare, price: 80),
        AvatarItem(id: "av_06", name: "Top Hat", category: .hat, symbol: "graduationcap.fill", color: Color(hex: "#1E1B1E"), rarity: .epic, price: 150),
        AvatarItem(id: "av_07", name: "Baseball Cap", category: .hat, symbol: "graduationcap.fill", color: Color(hex: "#3B82F6"), rarity: .common, price: 15),
        AvatarItem(id: "av_08", name: "Crown", category: .hat, symbol: "graduationcap.fill", color: Color(hex: "#FFD700"), rarity: .legendary, price: 400),

        // Accessories
        AvatarItem(id: "av_09", name: "Gold Watch", category: .accessory, symbol: "applewatch.watchface.fill", color: Color(hex: "#FFD700"), rarity: .epic, price: 120),
        AvatarItem(id: "av_10", name: "Silver Bracelet", category: .accessory, symbol: "applewatch.watchface.fill", color: Color(hex: "#94A3B8"), rarity: .uncommon, price: 35),
        AvatarItem(id: "av_11", name: "Diamond Ring", category: .accessory, symbol: "applewatch.watchface.fill", color: Color(hex: "#06B6D4"), rarity: .legendary, price: 600),

        // Shoes
        AvatarItem(id: "av_12", name: "Sneakers", category: .shoes, symbol: "figure.walk", color: Color(hex: "#10B981"), rarity: .common, price: 25),
        AvatarItem(id: "av_13", name: "Dress Shoes", category: .shoes, symbol: "figure.walk", color: Color(hex: "#1E1B1E"), rarity: .uncommon, price: 50),
        AvatarItem(id: "av_14", name: "Golden Boots", category: .shoes, symbol: "figure.walk", color: Color(hex: "#FFD700"), rarity: .epic, price: 180),

        // Glasses
        AvatarItem(id: "av_15", name: "Aviators", category: .glasses, symbol: "eyeglasses", color: Color(hex: "#FFD700"), rarity: .uncommon, price: 30),
        AvatarItem(id: "av_16", name: "Reading Glasses", category: .glasses, symbol: "eyeglasses", color: Color(hex: "#3B82F6"), rarity: .common, price: 10),
        AvatarItem(id: "av_17", name: "Designer Shades", category: .glasses, symbol: "eyeglasses", color: Color(hex: "#8B5CF6"), rarity: .rare, price: 90),
    ]

    // MARK: - Investment Pools

    static let investmentPools: [InvestmentPool] = [
        InvestmentPool(id: "ip_01", poolName: "Tech Startup Fund", description: "Early-stage technology startups with high growth potential in AI and SaaS.", fundingGoal: 500000, currentAmount: 320000, riskLevel: "high", projectedROI: 0.35, status: "open", deadline: Date().addingTimeInterval(86400 * 45), minInvestment: 1000),
        InvestmentPool(id: "ip_02", poolName: "Real Estate REIT", description: "Diversified commercial real estate investments across major US markets.", fundingGoal: 1000000, currentAmount: 780000, riskLevel: "low", projectedROI: 0.08, status: "open", deadline: Date().addingTimeInterval(86400 * 90), minInvestment: 500),
        InvestmentPool(id: "ip_03", poolName: "Green Energy Fund", description: "Renewable energy projects including solar, wind, and battery storage.", fundingGoal: 750000, currentAmount: 525000, riskLevel: "medium", projectedROI: 0.15, status: "open", deadline: Date().addingTimeInterval(86400 * 60), minInvestment: 250),
        InvestmentPool(id: "ip_04", poolName: "Small Business Lending", description: "Peer-to-peer lending to established small businesses with strong cash flow.", fundingGoal: 300000, currentAmount: 180000, riskLevel: "medium", projectedROI: 0.12, status: "open", deadline: Date().addingTimeInterval(86400 * 30), minInvestment: 100),
        InvestmentPool(id: "ip_05", poolName: "Crypto Innovation", description: "Blockchain and cryptocurrency projects with disruptive potential.", fundingGoal: 400000, currentAmount: 300000, riskLevel: "high", projectedROI: 0.45, status: "open", deadline: Date().addingTimeInterval(86400 * 20), minInvestment: 500),
        InvestmentPool(id: "ip_06", poolName: "Index Fund S&P 500", description: "Track the S&P 500 index with low fees and broad market exposure.", fundingGoal: 2000000, currentAmount: 2000000, riskLevel: "low", projectedROI: 0.10, status: "funded", deadline: Date().addingTimeInterval(-86400 * 5), minInvestment: 50),
    ]
}

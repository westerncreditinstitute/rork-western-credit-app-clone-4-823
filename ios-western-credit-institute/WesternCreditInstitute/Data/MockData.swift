//
//  MockData.swift
//  WesternCreditInstitute
//

import Foundation

nonisolated enum MockData {

    // MARK: - Helpers

    private static func date(_ iso: String) -> Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let parsed = formatter.date(from: iso) { return parsed }

        let plain = ISO8601DateFormatter()
        if let parsed = plain.date(from: iso) { return parsed }

        let dayOnly = DateFormatter()
        dayOnly.dateFormat = "yyyy-MM-dd"
        dayOnly.timeZone = TimeZone(identifier: "UTC")
        return dayOnly.date(from: iso) ?? Date()
    }

    // MARK: - User

    static let currentUser = AppUser(
        id: "1",
        name: "John Mitchell",
        email: "john.mitchell@email.com",
        phone: "(602) 555-0142",
        avatarURL: "https://ui-avatars.com/api/?name=John+Mitchell&background=002B5C&color=fff&size=200&bold=true",
        memberSince: "January 2024",
        role: .cso,
        coursesCompleted: 4,
        totalEarnings: 3250,
        referrals: 12
    )

    // MARK: - Courses

    static let courses: [Course] = [
        Course(
            id: "1",
            title: "CSO Certification Program",
            shortDescription: "Free certification program for students who have completed ACE-1, ACE-2, and ACE-3. Pass the exam to become a certified CSO professional.",
            fullDescription: "The CSO Certification Program is a professional certification focused on the Credit Services Organization Act (CSOA). This FREE program is exclusively available to students who have completed all three Advanced Credit Education courses (ACE-1, ACE-2, and ACE-3). The program includes a comprehensive lecture covering all aspects of the CSOA and a certification exam. Upon passing the exam, you will be eligible for CSO Certification and can legally operate as a Credit Services Organization.",
            duration: "1-2 hours",
            lessons: 3,
            price: 0,
            imageURL: "https://images.unsplash.com/photo-1523287562758-66c7fc58967f?w=800&h=500&fit=crop",
            category: "Certification",
            level: .advanced,
            sections: [
                CourseSection(id: "1", title: "Credit Services Organization Act Lecture", steps: 1, symbol: "graduationcap.fill"),
                CourseSection(id: "2", title: "Credit Laws Compliance", steps: 1, symbol: "scalemass.fill"),
                CourseSection(id: "3", title: "CSO Certification Exam", steps: 1, symbol: "checklist"),
            ],
            features: [
                "Credit Services Organization Act Lecture",
                "Credit Laws Compliance (FCRA, FDCPA)",
                "CSO Certification Exam",
                "Professional CSO Certification upon passing",
                "Digital Certificate",
            ],
            isFree: true,
            requiresCompletedCourses: ["3", "4", "5"],
            requiresCompletedCoursesNames: ["ACE-1", "ACE-2", "ACE-3"]
        ),
        Course(
            id: "3",
            title: "Advanced Credit Repair (ACE-1)",
            shortDescription: "Master advanced credit repair techniques with AI-powered guidance. Interactive avatar provides personalized instruction through complex dispute strategies.",
            fullDescription: "This Advanced Credit Education course is designed to teach insider secrets and advanced techniques to successfully repair credit. This course is 1 of 4 in the (ACE) Advanced Credit Education program. ACE-1 is FREE for 60 days - you only pay the $99.99 certificate fee to enroll!",
            duration: "6 weeks",
            lessons: 41,
            price: 499.99,
            certificationFee: 99.99,
            freeTrialDays: 60,
            imageURL: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/520eex3l9y7mr3n4el5xk",
            category: "Strategy",
            level: .advanced,
            enrolled: true,
            progress: 45,
            sections: [
                CourseSection(id: "1", title: "Introduction", steps: 2, symbol: "book.fill"),
                CourseSection(id: "2", title: "Interactive Study Guide", steps: 1, symbol: "doc.text.fill"),
                CourseSection(id: "3", title: "How To Pull Your Credit Report", steps: 3, symbol: "arrow.down.circle.fill"),
                CourseSection(id: "4", title: "How To Analyze Your Credit Report", steps: 3, symbol: "magnifyingglass"),
                CourseSection(id: "5", title: "Disputing Negative Items", steps: 6, symbol: "exclamationmark.triangle.fill"),
                CourseSection(id: "6", title: "Suing For Violations", steps: 5, symbol: "scalemass.fill"),
                CourseSection(id: "7", title: "Defending Lawsuits", steps: 7, symbol: "shield.fill"),
                CourseSection(id: "8", title: "Debt Settlement Strategies", steps: 3, symbol: "hands.clap.fill"),
                CourseSection(id: "9", title: "Fair Debt Collection Practice Act (FDCPA)", steps: 2, symbol: "hammer.fill"),
                CourseSection(id: "10", title: "Fair Credit Reporting Act (FCRA)", steps: 3, symbol: "doc.badge.checkmark"),
                CourseSection(id: "11", title: "Affiliate Section", steps: 1, symbol: "person.2.fill"),
            ],
            features: [
                "AI Credit Repair Coach",
                "AI Dispute Assistant",
                "AI Lawsuit Assistant",
                "Cloud Dispute Tracker",
                "Video Lectures",
                "Interactive Study Guide",
                "Quizzes & Exams",
                "Community Forum",
            ],
            learningObjectives: [
                "Late Payments", "Charge Offs", "Collections", "Bankruptcies",
                "Foreclosures", "Repossessions", "Tax Liens", "Judgements",
                "Pull your credit report", "Debt Settlement Strategies",
                "Remove inquiries", "Resolve identity theft",
                "Prevent identity theft", "Lock credit report",
            ]
        ),
        Course(
            id: "4",
            title: "Advanced Credit Building (ACE-2)",
            shortDescription: "Master advanced credit building techniques with decades of industry expertise. Learn to establish an 800+ FICO score in as little as 90 days.",
            fullDescription: "This Advanced Credit Education (A.C.E) course is designed to teach insider secrets and advanced techniques to successfully build credit. Learn from industry experts with decades of experience in business and consumer credit. Why wait 7-10 years for a second chance at good credit, when you could have better credit in as little as 90 days.",
            duration: "Self-paced",
            lessons: 32,
            price: 499.98,
            certificationFee: 99.99,
            monthlyInstallment: 166.66,
            installmentMonths: 3,
            imageURL: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/z1iewfugzf3uiyqfepkw6",
            category: "Strategy",
            level: .advanced,
            sections: [
                CourseSection(id: "1", title: "Introduction", steps: 2, symbol: "book.fill"),
                CourseSection(id: "2", title: "Interactive Study Guide", steps: 1, symbol: "doc.text.fill"),
                CourseSection(id: "3", title: "Building New Credit", steps: 14, symbol: "chart.line.uptrend.xyaxis"),
                CourseSection(id: "4", title: "Credit Scoring", steps: 5, symbol: "chart.bar.fill"),
                CourseSection(id: "5", title: "Managing Credit", steps: 6, symbol: "slider.horizontal.3"),
                CourseSection(id: "6", title: "New Credit File", steps: 4, symbol: "folder.badge.plus"),
            ],
            features: [
                "Video Lectures",
                "Interactive Study Guide",
                "Quizzes & Exams",
                "Community Forum (free membership)",
            ],
            learningObjectives: [
                "Establish New Credit", "Add years of credit history",
                "Credit Chain Strategies", "Manage credit scores",
                "Establish an 800+ Fico Score", "Build a Healthy Debt to Credit Rating",
                "Get Pre Approvals Without Inquiry", "Get Signature Loans",
                "Resolve identity theft", "Prevent identity theft", "Lock credit report",
            ],
            autoDebitOnly: true,
            autoDebitLockoutPolicy: "If auto debit fails, user will be immediately locked out of the course until payment is received."
        ),
        Course(
            id: "5",
            title: "Advanced Business Credit (ACE-3)",
            shortDescription: "Master business credit strategies to build and leverage corporate credit for business growth.",
            fullDescription: "This Advanced Credit Education course is designed to teach insider secrets and advanced techniques to successfully build business credit. Learn how to establish corporate credit, secure business funding, and leverage credit for business expansion. This course is 3 of 4 in the Advanced Credit Education program.",
            duration: "Self-paced",
            lessons: 28,
            price: 499.98,
            certificationFee: 99.99,
            monthlyInstallment: 166.66,
            installmentMonths: 3,
            imageURL: "https://pub-e001eb4506b145aa938b5d3badbff6a5.r2.dev/attachments/ok1udgooc5tn4gg09uvn0",
            category: "Strategy",
            level: .advanced,
            sections: [
                CourseSection(id: "1", title: "Introduction to Business Credit", steps: 3, symbol: "briefcase.fill"),
                CourseSection(id: "2", title: "Establishing Your Business Entity", steps: 4, symbol: "building.2.fill"),
                CourseSection(id: "3", title: "Building Business Credit Profile", steps: 6, symbol: "creditcard.fill"),
                CourseSection(id: "4", title: "Trade Credit & Vendor Accounts", steps: 5, symbol: "hands.clap.fill"),
                CourseSection(id: "5", title: "Business Credit Cards", steps: 4, symbol: "wallet.pass.fill"),
                CourseSection(id: "6", title: "Business Loans & Financing", steps: 6, symbol: "dollarsign.circle.fill"),
            ],
            features: [
                "Video Lectures",
                "Interactive Study Guide",
                "Business Credit Templates",
                "Quizzes & Exams",
                "Community Forum",
            ],
            learningObjectives: [
                "Establish Business Credit Profile", "Corporate Credit Building Strategies",
                "Business Funding Sources", "Trade Credit Lines", "Business Credit Cards",
                "SBA Loans & Financing", "Vendor Credit Applications",
                "Business Credit Monitoring", "Separate Personal & Business Credit",
                "Credit Utilization for Businesses",
            ],
            autoDebitOnly: true,
            autoDebitLockoutPolicy: "If auto debit fails, user will be immediately locked out of the course until payment is received."
        ),
        Course(
            id: "9",
            title: "Complete ACE Bundle (ACE-4)",
            shortDescription: "Save with our complete bundle! Includes ACE-1, ACE-2, and ACE-3 courses at a discounted price with certificates for all three courses and CSO Certification eligibility.",
            fullDescription: "The Complete ACE Bundle combines all three Advanced Credit Education courses (ACE-1: Advanced Credit Repair, ACE-2: Advanced Credit Building, and ACE-3: Advanced Business Credit) into one comprehensive package at a discounted price of $1,299.00. This bundle includes certificates for all three courses and upon completion, you will be eligible for CSO Certification.",
            duration: "Self-paced",
            lessons: 101,
            price: 1299,
            imageURL: "https://images.unsplash.com/photo-1573164713988-8665fc963095?w=800&h=500&fit=crop",
            category: "Bundle",
            level: .advanced,
            sections: [
                CourseSection(id: "1", title: "ACE-1: Advanced Credit Repair", steps: 41, symbol: "shield.fill"),
                CourseSection(id: "2", title: "ACE-2: Advanced Credit Building", steps: 32, symbol: "chart.line.uptrend.xyaxis"),
                CourseSection(id: "3", title: "ACE-3: Advanced Business Credit", steps: 28, symbol: "briefcase.fill"),
            ],
            features: [
                "All ACE-1 Features & Content",
                "All ACE-2 Features & Content",
                "All ACE-3 Features & Content",
                "AI Credit Repair Coach",
                "AI Dispute Assistant",
                "AI Lawsuit Assistant",
                "Cloud Dispute Tracker",
                "Video Lectures (All Courses)",
                "Interactive Study Guides",
                "Business Credit Templates",
                "Quizzes & Exams",
                "Community Forum Access",
                "3 Course Certificates Included",
                "CSO Certification Eligibility",
            ],
            learningObjectives: [
                "Complete ACE-1: Advanced Credit Repair Techniques",
                "Complete ACE-2: Advanced Credit Building Strategies",
                "Complete ACE-3: Business Credit Mastery",
                "Certificates for All Three Courses Included",
                "CSO Certification Eligibility Upon Completion",
                "Late Payments, Charge Offs, Collections Removal",
                "Establish 800+ FICO Score",
                "Build Business Credit Profile",
                "Debt Settlement Strategies",
                "Consumer Protection Laws (FCRA, FDCPA)",
            ],
            isBundle: true,
            bundleIncludes: ["ACE-1", "ACE-2", "ACE-3"],
            includesCertificates: true,
            csoEligible: true,
            noPaymentPlan: true
        ),
    ]

    static let categories = ["All", "Certification", "Strategy", "Business", "Legal", "Bundle"]

    // MARK: - Earnings

    static let earnings: [EarningRecord] = [
        EarningRecord(id: "1", type: .referral, amount: 150, date: date("2024-12-28"), detail: "New student referral - Sarah Johnson", status: .completed),
        EarningRecord(id: "2", type: .commission, amount: 250, date: date("2024-12-25"), detail: "CSO Certification course sale", status: .completed),
        EarningRecord(id: "3", type: .residual, amount: 75, date: date("2024-12-20"), detail: "Monthly membership residual", status: .completed),
        EarningRecord(id: "4", type: .coaching, amount: 200, date: date("2024-12-15"), detail: "1-on-1 coaching session", status: .completed),
        EarningRecord(id: "5", type: .referral, amount: 150, date: date("2024-12-10"), detail: "New student referral - Mike Brown", status: .completed),
        EarningRecord(id: "6", type: .commission, amount: 125, date: date("2025-01-02"), detail: "Credit Fundamentals course sale", status: .pending),
    ]

    // MARK: - Wallet

    static let wallet = WalletSummary(
        availableBalance: 1250,
        pendingBalance: 375,
        totalEarned: 3250,
        totalWithdrawn: 1625
    )

    static let walletTransactions: [WalletTransaction] = [
        WalletTransaction(id: "1", type: .referralBonus, amount: 25, status: .completed, detail: "ACE-1 Student Referral - Sarah Johnson", createdAt: date("2025-01-08T10:30:00Z")),
        WalletTransaction(id: "2", type: .residualIncome, amount: 24.99, status: .pending, detail: "CSO Affiliate Residual Income (50%) - January 2025", createdAt: date("2025-01-07T00:00:00Z")),
        WalletTransaction(id: "3", type: .commission, amount: 79.99, status: .completed, detail: "20% Commission - ACE-1 Course Sale", createdAt: date("2025-01-05T14:22:00Z")),
        WalletTransaction(id: "4", type: .payout, amount: -500, status: .completed, detail: "Payout Request - PayPal", createdAt: date("2025-01-01T09:00:00Z")),
        WalletTransaction(id: "5", type: .consultation, amount: 74.99, status: .completed, detail: "Consultation Fee - Mike Brown", createdAt: date("2024-12-28T16:45:00Z")),
        WalletTransaction(id: "6", type: .referralBonus, amount: 25, status: .completed, detail: "ACE-1 Student Referral - James Wilson", createdAt: date("2024-12-25T11:00:00Z")),
    ]

    // MARK: - Notifications

    static let notifications: [AppNotification] = [
        AppNotification(id: "1", title: "New Lesson Available", message: "Module 5 of CSO Certification is now unlocked", date: date("2025-01-07"), read: false, type: .course),
        AppNotification(id: "2", title: "Commission Received", message: "You earned $250 from a course sale", date: date("2025-01-05"), read: false, type: .earning),
        AppNotification(id: "3", title: "Welcome New Referral", message: "Sarah Johnson joined through your link", date: date("2025-01-03"), read: true, type: .earning),
    ]

    // MARK: - Credit tips

    static let creditTips: [CreditTip] = [
        CreditTip(id: "1", title: "Check Your Credit Reports Regularly", content: "You are entitled to one free credit report from each of the three major bureaus (Equifax, Experian, TransUnion) annually through AnnualCreditReport.com. Review them for errors that could be dragging down your score.", category: .management, publishDate: date("2025-01-06")),
        CreditTip(id: "2", title: "Keep Credit Utilization Below 30%", content: "Your credit utilization ratio (how much credit you use vs. your total available credit) significantly impacts your score. Aim to keep it below 30%, and ideally under 10% for the best results.", category: .building, publishDate: date("2025-01-07")),
        CreditTip(id: "3", title: "Never Close Old Credit Cards", content: "The length of your credit history matters. Closing old accounts can shorten your credit history and increase your utilization ratio. Keep old cards open, even if you rarely use them.", category: .management, publishDate: date("2025-01-08")),
        CreditTip(id: "4", title: "Dispute Errors Immediately", content: "Under the Fair Credit Reporting Act (FCRA), you have the right to dispute any inaccurate information on your credit report. Credit bureaus must investigate disputes within 30 days.", category: .repair, publishDate: date("2025-01-09")),
        CreditTip(id: "5", title: "Set Up Payment Reminders", content: "Payment history is the most important factor in your credit score (35%). Set up automatic payments or calendar reminders to ensure you never miss a due date.", category: .management, publishDate: date("2025-01-10")),
        CreditTip(id: "6", title: "Become an Authorized User", content: "Being added as an authorized user on a family member's credit card with a good payment history can help boost your score. Make sure the card issuer reports authorized users to the credit bureaus.", category: .building, publishDate: date("2025-01-11")),
        CreditTip(id: "7", title: "Know Your Rights Under FDCPA", content: "The Fair Debt Collection Practices Act protects you from abusive debt collection practices. Collectors cannot harass you, call at unreasonable hours, or make false statements about your debt.", category: .legal, publishDate: date("2025-01-12")),
        CreditTip(id: "8", title: "Prevent Identity Theft with These Strategies", content: "Identity theft is a growing concern in the digital age. Protect yourself by monitoring your accounts regularly, using strong unique passwords, enabling two-factor authentication, and being cautious with personal information online.", category: .identity, publishDate: date("2025-01-13")),
        CreditTip(id: "9", title: "Five Proven Ways to Prevent Identity Theft", content: "Protect your identity with these five methods: 1) Freeze your credit with all three bureaus, 2) Use two-factor authentication everywhere, 3) Monitor your credit reports weekly, 4) Shred sensitive documents, 5) Be wary of phishing attempts.", category: .identity, publishDate: date("2025-01-14")),
    ]

    static var tipOfTheWeek: CreditTip {
        let week = Calendar.current.component(.weekOfYear, from: Date())
        return creditTips[week % creditTips.count]
    }

    static var recentTips: [CreditTip] {
        creditTips.sorted { $0.publishDate > $1.publishDate }.prefix(3).map { $0 }
    }

    // MARK: - Featured videos

    static let featuredVideos: [FeaturedVideo] = [
        FeaturedVideo(id: "1", youtubeId: "dQw4w9WgXcQ", title: "Getting Started with Credit Repair", duration: "5:32"),
        FeaturedVideo(id: "2", youtubeId: "9bZkp7q19f0", title: "Understanding Credit Scores", duration: "8:15"),
        FeaturedVideo(id: "3", youtubeId: "kJQP7kiw5Fk", title: "Dispute Letter Basics", duration: "6:48"),
        FeaturedVideo(id: "4", youtubeId: "RgKAFK5djSk", title: "Building Business Credit", duration: "10:22"),
    ]

    // MARK: - CSO providers

    static let specialties = [
        "Credit Repair",
        "Debt Settlement",
        "Identity Theft",
        "Credit Building",
        "Bankruptcy Recovery",
        "Student Loans",
        "Business Credit",
    ]

    static let providers: [CSOProvider] = [
        CSOProvider(
            id: "cso-001", userId: "user-001", name: "Marcus Thompson",
            email: "marcus.thompson@creditpro.com", phone: "(404) 555-0123",
            avatarURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
            bio: "With over 15 years of experience in credit repair and financial consulting, I've helped thousands of clients achieve their credit goals. I specialize in removing negative items, disputing inaccuracies, and building sustainable credit strategies.",
            specialties: ["Credit Repair", "Debt Settlement", "Identity Theft"],
            yearsExperience: 15, location: "Atlanta, GA", rating: 4.9, reviewCount: 127,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2020"
        ),
        CSOProvider(
            id: "cso-002", userId: "user-002", name: "Jennifer Williams",
            email: "jennifer.williams@creditmastery.com", phone: "(213) 555-0456",
            avatarURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
            bio: "As a former banker turned credit specialist, I bring unique insights into how creditors think. My approach combines traditional credit repair with strategic credit building to get you where you need to be faster.",
            specialties: ["Credit Building", "Credit Repair", "Student Loans"],
            yearsExperience: 12, location: "Los Angeles, CA", rating: 4.8, reviewCount: 98,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2019"
        ),
        CSOProvider(
            id: "cso-003", userId: "user-003", name: "David Rodriguez",
            email: "david.rodriguez@texascredit.com", phone: "(214) 555-0789",
            avatarURL: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200&h=200&fit=crop&crop=face",
            bio: "Specializing in bankruptcy recovery and foreclosure prevention, I've dedicated my career to helping families rebuild their financial futures. Fluent in English and Spanish, serving the diverse Texas community.",
            specialties: ["Bankruptcy Recovery", "Credit Repair", "Debt Settlement"],
            yearsExperience: 10, location: "Dallas, TX", rating: 4.7, reviewCount: 76,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2021"
        ),
        CSOProvider(
            id: "cso-004", userId: "user-004", name: "Samantha Chen",
            email: "samantha.chen@nycreditexpert.com", phone: "(212) 555-0321",
            avatarURL: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200&h=200&fit=crop&crop=face",
            bio: "Manhattan-based credit expert with a background in corporate finance. I help professionals and entrepreneurs optimize their credit profiles for business loans, mortgages, and investment opportunities.",
            specialties: ["Business Credit", "Credit Building", "Credit Repair"],
            yearsExperience: 8, location: "New York, NY", rating: 4.9, reviewCount: 112,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2022"
        ),
        CSOProvider(
            id: "cso-005", userId: "user-005", name: "Robert Jackson",
            email: "robert.jackson@chicagocredit.com", phone: "(312) 555-0654",
            avatarURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200&h=200&fit=crop&crop=face",
            bio: "Former collection agency manager who switched sides to help consumers fight back. I know exactly how creditors and collectors operate, and I use that knowledge to get results for my clients.",
            specialties: ["Debt Settlement", "Credit Repair", "Identity Theft"],
            yearsExperience: 14, location: "Chicago, IL", rating: 4.6, reviewCount: 89,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2020"
        ),
        CSOProvider(
            id: "cso-006", userId: "user-006", name: "Michelle Davis",
            email: "michelle.davis@phoenixcredit.com", phone: "(602) 555-0987",
            avatarURL: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop&crop=face",
            bio: "Arizona's top-rated credit repair specialist with a focus on identity theft recovery. I've helped hundreds of victims reclaim their credit and their lives after fraud. Fast, thorough, and compassionate service.",
            specialties: ["Identity Theft", "Credit Repair", "Credit Building"],
            yearsExperience: 9, location: "Phoenix, AZ", rating: 4.8, reviewCount: 67,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2021"
        ),
    ]

    static let reviews: [CSOReview] = [
        CSOReview(id: "r1", providerId: "cso-001", reviewerName: "Angela Peters", reviewerAvatarURL: "https://ui-avatars.com/api/?name=Angela+Peters&background=10B981&color=fff", rating: 5, comment: "Marcus removed four collections in under 90 days. My score jumped 118 points. Worth every penny.", createdAt: date("2024-12-18")),
        CSOReview(id: "r2", providerId: "cso-001", reviewerName: "Tyler Brooks", reviewerAvatarURL: "https://ui-avatars.com/api/?name=Tyler+Brooks&background=3B82F6&color=fff", rating: 5, comment: "Extremely knowledgeable about FCRA. He explained every step and never over-promised.", createdAt: date("2024-11-02")),
        CSOReview(id: "r3", providerId: "cso-002", reviewerName: "Rosa Delgado", reviewerAvatarURL: "https://ui-avatars.com/api/?name=Rosa+Delgado&background=F59E0B&color=fff", rating: 5, comment: "Jennifer's banking background is a superpower. She got me approved for a mortgage I thought was years away.", createdAt: date("2024-12-05")),
        CSOReview(id: "r4", providerId: "cso-003", reviewerName: "Kevin Alvarez", reviewerAvatarURL: "https://ui-avatars.com/api/?name=Kevin+Alvarez&background=EF4444&color=fff", rating: 4, comment: "Helped my family recover after Chapter 7. Patient and bilingual, which made it easy for my parents.", createdAt: date("2024-10-21")),
        CSOReview(id: "r5", providerId: "cso-004", reviewerName: "Priya Raman", reviewerAvatarURL: "https://ui-avatars.com/api/?name=Priya+Raman&background=8B5CF6&color=fff", rating: 5, comment: "Samantha structured my business credit so I could get a $150k line without a personal guarantee.", createdAt: date("2025-01-04")),
    ]

    // MARK: - Admin

    static let adminStats: [AdminStat] = [
        AdminStat(id: "1", label: "Active Students", value: "2,847", change: "+12.4%", trendUp: true, symbol: "person.3.fill"),
        AdminStat(id: "2", label: "Monthly Revenue", value: "$184,290", change: "+8.1%", trendUp: true, symbol: "dollarsign.circle.fill"),
        AdminStat(id: "3", label: "Course Completions", value: "1,213", change: "+3.6%", trendUp: true, symbol: "checkmark.seal.fill"),
        AdminStat(id: "4", label: "Payouts Pending", value: "$12,455", change: "-2.2%", trendUp: false, symbol: "arrow.up.circle.fill"),
    ]
}

nonisolated struct AdminStat: Identifiable, Hashable, Sendable {
    let id: String
    let label: String
    let value: String
    let change: String
    let trendUp: Bool
    let symbol: String
}

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
        CSOProvider(
            id: "cso-007", userId: "user-007", name: "James Wilson",
            email: "james.wilson@seattlecredit.com", phone: "(206) 555-0147",
            avatarURL: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=200&h=200&fit=crop&crop=face",
            bio: "Tech industry professional turned credit consultant. I understand the unique financial challenges facing tech workers with stock options, RSUs, and variable income. Let me help you maximize your credit potential.",
            specialties: ["Credit Building", "Business Credit", "Credit Repair"],
            yearsExperience: 7, location: "Seattle, WA", rating: 4.7, reviewCount: 54,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2022"
        ),
        CSOProvider(
            id: "cso-008", userId: "user-008", name: "Angela Martinez",
            email: "angela.martinez@miamicredit.com", phone: "(305) 555-0258",
            avatarURL: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=200&h=200&fit=crop&crop=face",
            bio: "Serving South Florida's diverse community with bilingual credit repair services. I specialize in helping first-time homebuyers achieve mortgage-ready credit scores. Your dream home is closer than you think!",
            specialties: ["Credit Repair", "Credit Building", "Debt Settlement"],
            yearsExperience: 11, location: "Miami, FL", rating: 4.9, reviewCount: 103,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2020"
        ),
        CSOProvider(
            id: "cso-009", userId: "user-009", name: "William Brown",
            email: "william.brown@denvercredit.com", phone: "(303) 555-0369",
            avatarURL: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=200&h=200&fit=crop&crop=face",
            bio: "Colorado's leading expert in student loan credit issues. I've helped thousands of graduates navigate the complex world of student debt while building strong credit foundations for their futures.",
            specialties: ["Student Loans", "Credit Building", "Credit Repair"],
            yearsExperience: 13, location: "Denver, CO", rating: 4.5, reviewCount: 82,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2019"
        ),
        CSOProvider(
            id: "cso-010", userId: "user-010", name: "Patricia Taylor",
            email: "patricia.taylor@bostoncredit.com", phone: "(617) 555-0471",
            avatarURL: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&crop=face",
            bio: "Harvard-educated financial advisor specializing in comprehensive credit management for high-net-worth individuals. Discreet, professional service focused on protecting and enhancing your financial reputation.",
            specialties: ["Business Credit", "Credit Building", "Identity Theft"],
            yearsExperience: 16, location: "Boston, MA", rating: 4.8, reviewCount: 71,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2018"
        ),
        CSOProvider(
            id: "cso-011", userId: "user-011", name: "Christopher Lee",
            email: "christopher.lee@lasvegascredit.com", phone: "(702) 555-0582",
            avatarURL: "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=200&h=200&fit=crop&crop=face",
            bio: "Helping Las Vegas residents recover from financial setbacks. Whether it's gaming debt, job loss, or other challenges, I provide judgment-free credit repair services tailored to your unique situation.",
            specialties: ["Debt Settlement", "Bankruptcy Recovery", "Credit Repair"],
            yearsExperience: 6, location: "Las Vegas, NV", rating: 4.6, reviewCount: 48,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2023"
        ),
        CSOProvider(
            id: "cso-012", userId: "user-012", name: "Lisa Anderson",
            email: "lisa.anderson@nashvillecredit.com", phone: "(615) 555-0693",
            avatarURL: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face",
            bio: "Nashville's trusted credit repair expert with a heart for helping families achieve their dreams. Specializing in first-time homebuyer preparation and debt management strategies that work.",
            specialties: ["Credit Repair", "Debt Settlement", "Credit Building"],
            yearsExperience: 10, location: "Nashville, TN", rating: 4.9, reviewCount: 95,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2021"
        ),
        CSOProvider(
            id: "cso-013", userId: "user-013", name: "Michael Johnson",
            email: "michael.johnson@detroitcredit.com", phone: "(313) 555-0804",
            avatarURL: "https://images.unsplash.com/photo-1463453091185-61582044d556?w=200&h=200&fit=crop&crop=face",
            bio: "Proudly serving Detroit and the greater Michigan area. I believe everyone deserves a second chance at good credit. Affordable rates and flexible payment plans available for all my services.",
            specialties: ["Credit Repair", "Bankruptcy Recovery", "Debt Settlement"],
            yearsExperience: 8, location: "Detroit, MI", rating: 4.4, reviewCount: 62,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2022"
        ),
        CSOProvider(
            id: "cso-014", userId: "user-014", name: "Sarah White",
            email: "sarah.white@portlandcredit.com", phone: "(503) 555-0915",
            avatarURL: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=200&h=200&fit=crop&crop=face",
            bio: "Portland's eco-conscious credit consultant. I help clients build sustainable financial habits alongside their credit scores. Specializing in helping small business owners and freelancers establish credit.",
            specialties: ["Business Credit", "Credit Building", "Credit Repair"],
            yearsExperience: 5, location: "Portland, OR", rating: 4.7, reviewCount: 41,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2023"
        ),
        CSOProvider(
            id: "cso-015", userId: "user-015", name: "Daniel Harris",
            email: "daniel.harris@houstoncredit.com", phone: "(713) 555-1026",
            avatarURL: "https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=200&h=200&fit=crop&crop=face",
            bio: "Houston's oil and gas industry credit specialist. I understand the unique boom-and-bust nature of energy sector employment and help workers maintain stable credit through economic cycles.",
            specialties: ["Credit Repair", "Debt Settlement", "Credit Building"],
            yearsExperience: 12, location: "Houston, TX", rating: 4.8, reviewCount: 88,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2020"
        ),
        CSOProvider(
            id: "cso-016", userId: "user-016", name: "Emily Clark",
            email: "emily.clark@philadelphiacredit.com", phone: "(215) 555-1137",
            avatarURL: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=200&h=200&fit=crop&crop=face",
            bio: "Dedicated to helping Philadelphia families build generational wealth through strong credit. I offer comprehensive credit education alongside repair services to ensure lasting results.",
            specialties: ["Credit Building", "Credit Repair", "Student Loans"],
            yearsExperience: 9, location: "Philadelphia, PA", rating: 4.6, reviewCount: 73,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2021"
        ),
        CSOProvider(
            id: "cso-017", userId: "user-017", name: "Kevin Moore",
            email: "kevin.moore@sandiegocredit.com", phone: "(619) 555-1248",
            avatarURL: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=200&h=200&fit=crop&crop=face",
            bio: "Military veteran helping fellow service members and their families navigate credit challenges. Specializing in deployment-related credit issues and VA loan preparation.",
            specialties: ["Credit Repair", "Credit Building", "Identity Theft"],
            yearsExperience: 7, location: "San Diego, CA", rating: 4.9, reviewCount: 59,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2022"
        ),
        CSOProvider(
            id: "cso-018", userId: "user-018", name: "Amanda Lewis",
            email: "amanda.lewis@minneapoliscredit.com", phone: "(612) 555-1359",
            avatarURL: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=200&h=200&fit=crop&crop=face",
            bio: "Minnesota's cold weather doesn't slow down my dedication to helping clients achieve hot credit scores! Expert in medical debt removal and healthcare-related credit issues.",
            specialties: ["Debt Settlement", "Credit Repair", "Credit Building"],
            yearsExperience: 11, location: "Minneapolis, MN", rating: 4.7, reviewCount: 66,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2020"
        ),
        CSOProvider(
            id: "cso-019", userId: "user-019", name: "Brian Scott",
            email: "brian.scott@charlottecredit.com", phone: "(704) 555-1460",
            avatarURL: "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=200&h=200&fit=crop&crop=face",
            bio: "Charlotte banking hub insider turned consumer advocate. With experience from both sides of the industry, I know exactly what it takes to get creditors to listen and take action.",
            specialties: ["Credit Repair", "Business Credit", "Debt Settlement"],
            yearsExperience: 14, location: "Charlotte, NC", rating: 4.8, reviewCount: 91,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2019"
        ),
        CSOProvider(
            id: "cso-020", userId: "user-020", name: "Rachel Green",
            email: "rachel.green@austincredit.com", phone: "(512) 555-1571",
            avatarURL: "https://images.unsplash.com/photo-1546961342-ea5f71b193f3?w=200&h=200&fit=crop&crop=face",
            bio: "Keep Austin weird, but keep your credit score high! I help Austin's creative community—artists, musicians, and entrepreneurs—build the credit they need to pursue their passions.",
            specialties: ["Business Credit", "Credit Building", "Credit Repair"],
            yearsExperience: 6, location: "Austin, TX", rating: 4.5, reviewCount: 52,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2023"
        ),
        CSOProvider(
            id: "cso-021", userId: "user-021", name: "Terrence Washington",
            email: "terrence.washington@baltcredit.com", phone: "(410) 555-2001",
            avatarURL: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=200&h=200&fit=crop&crop=face",
            bio: "Baltimore native dedicated to rebuilding credit in my community. Specializing in helping working families overcome financial obstacles and achieve homeownership dreams.",
            specialties: ["Credit Repair", "Debt Settlement", "Credit Building"],
            yearsExperience: 9, location: "Baltimore, MD", rating: 4.7, reviewCount: 68,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2021"
        ),
        CSOProvider(
            id: "cso-022", userId: "user-022", name: "Kristina Novak",
            email: "kristina.novak@clevelcredit.com", phone: "(216) 555-2002",
            avatarURL: "https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=200&h=200&fit=crop&crop=face",
            bio: "Cleveland's go-to credit expert for medical debt and healthcare-related credit issues. Former hospital billing manager now fighting for patients' credit rights.",
            specialties: ["Debt Settlement", "Credit Repair", "Identity Theft"],
            yearsExperience: 11, location: "Cleveland, OH", rating: 4.8, reviewCount: 84,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2020"
        ),
        CSOProvider(
            id: "cso-023", userId: "user-023", name: "Andre Coleman",
            email: "andre.coleman@memphiscredit.com", phone: "(901) 555-2003",
            avatarURL: "https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=200&h=200&fit=crop&crop=face",
            bio: "Memphis soul with financial wisdom. I help families across Tennessee build credit legacies that last generations. Specializing in first-time homebuyer preparation.",
            specialties: ["Credit Building", "Credit Repair", "Student Loans"],
            yearsExperience: 8, location: "Memphis, TN", rating: 4.6, reviewCount: 57,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2022"
        ),
        CSOProvider(
            id: "cso-024", userId: "user-024", name: "Priya Sharma",
            email: "priya.sharma@sanjosecredit.com", phone: "(408) 555-2004",
            avatarURL: "https://images.unsplash.com/photo-1593104547489-5cfb3839a3b5?w=200&h=200&fit=crop&crop=face",
            bio: "Silicon Valley credit specialist helping tech professionals maximize their financial potential. Expert in stock compensation, startup equity, and business credit building.",
            specialties: ["Business Credit", "Credit Building", "Credit Repair"],
            yearsExperience: 7, location: "San Jose, CA", rating: 4.9, reviewCount: 93,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2022"
        ),
        CSOProvider(
            id: "cso-025", userId: "user-025", name: "Antonio Rivera",
            email: "antonio.rivera@sanantoniocredit.com", phone: "(210) 555-2005",
            avatarURL: "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=200&h=200&fit=crop&crop=face",
            bio: "San Antonio's trusted bilingual credit advisor. I serve military families at nearby bases and help them navigate the unique credit challenges of service life.",
            specialties: ["Credit Repair", "Identity Theft", "Credit Building"],
            yearsExperience: 10, location: "San Antonio, TX", rating: 4.7, reviewCount: 79,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2021"
        ),
        CSOProvider(
            id: "cso-026", userId: "user-026", name: "Stephanie Brooks",
            email: "stephanie.brooks@indycredit.com", phone: "(317) 555-2006",
            avatarURL: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=200&h=200&fit=crop&crop=face",
            bio: "Indianapolis credit expert with a passion for helping young professionals build strong financial foundations. Specializing in student loan strategies and first-time credit building.",
            specialties: ["Student Loans", "Credit Building", "Credit Repair"],
            yearsExperience: 6, location: "Indianapolis, IN", rating: 4.5, reviewCount: 44,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2023"
        ),
        CSOProvider(
            id: "cso-027", userId: "user-027", name: "Darnell Henderson",
            email: "darnell.henderson@columbuscredit.com", phone: "(614) 555-2007",
            avatarURL: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=200&h=200&fit=crop&crop=face",
            bio: "Columbus-based credit repair specialist with deep ties to Ohio's diverse communities. I believe everyone deserves access to quality credit services at fair prices.",
            specialties: ["Credit Repair", "Debt Settlement", "Bankruptcy Recovery"],
            yearsExperience: 12, location: "Columbus, OH", rating: 4.8, reviewCount: 91,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2020"
        ),
        CSOProvider(
            id: "cso-028", userId: "user-028", name: "Victoria Huang",
            email: "victoria.huang@sfcredit.com", phone: "(415) 555-2008",
            avatarURL: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=200&h=200&fit=crop&crop=face",
            bio: "San Francisco financial consultant specializing in helping entrepreneurs and gig economy workers build business credit. Fluent in Mandarin and Cantonese.",
            specialties: ["Business Credit", "Credit Building", "Credit Repair"],
            yearsExperience: 9, location: "San Francisco, CA", rating: 4.9, reviewCount: 107,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2021"
        ),
        CSOProvider(
            id: "cso-029", userId: "user-029", name: "Tony Russo",
            email: "tony.russo@newjerseycredit.com", phone: "(973) 555-2009",
            avatarURL: "https://images.unsplash.com/photo-1564564321837-a57b7070ac4f?w=200&h=200&fit=crop&crop=face",
            bio: "Newark's straight-talking credit expert. Former debt collector who now fights for consumers. I know every trick in the book and use them all to help my clients.",
            specialties: ["Debt Settlement", "Credit Repair", "Identity Theft"],
            yearsExperience: 15, location: "Newark, NJ", rating: 4.6, reviewCount: 76,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2019"
        ),
        CSOProvider(
            id: "cso-030", userId: "user-030", name: "Latoya Williams",
            email: "latoya.williams@orlcredit.com", phone: "(407) 555-2010",
            avatarURL: "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=200&h=200&fit=crop&crop=face",
            bio: "Orlando's trusted credit advisor specializing in hospitality and tourism industry workers. I understand seasonal income and help you maintain stable credit year-round.",
            specialties: ["Credit Repair", "Credit Building", "Debt Settlement"],
            yearsExperience: 8, location: "Orlando, FL", rating: 4.7, reviewCount: 63,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2022"
        ),
        CSOProvider(
            id: "cso-031", userId: "user-031", name: "Gregory Kim",
            email: "gregory.kim@hawaiicredit.com", phone: "(808) 555-2011",
            avatarURL: "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=200&h=200&fit=crop&crop=face",
            bio: "Aloha! Hawaii's premier credit specialist helping island residents navigate the unique financial challenges of living in paradise. Expert in military family credit issues.",
            specialties: ["Credit Repair", "Credit Building", "Identity Theft"],
            yearsExperience: 11, location: "Honolulu, HI", rating: 4.8, reviewCount: 72,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2020"
        ),
        CSOProvider(
            id: "cso-032", userId: "user-032", name: "Carmen Delgado",
            email: "carmen.delgado@abqcredit.com", phone: "(505) 555-2012",
            avatarURL: "https://images.unsplash.com/photo-1551836022-deb4988cc6c0?w=200&h=200&fit=crop&crop=face",
            bio: "New Mexico's bilingual credit champion. I serve the diverse communities of Albuquerque with culturally sensitive financial guidance and proven credit repair strategies.",
            specialties: ["Credit Repair", "Debt Settlement", "Credit Building"],
            yearsExperience: 10, location: "Albuquerque, NM", rating: 4.6, reviewCount: 58,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2021"
        ),
        CSOProvider(
            id: "cso-033", userId: "user-033", name: "Brandon Mitchell",
            email: "brandon.mitchell@kccredit.com", phone: "(816) 555-2013",
            avatarURL: "https://images.unsplash.com/photo-1548372290-8d01b6c8e78c?w=200&h=200&fit=crop&crop=face",
            bio: "Kansas City's hometown credit expert. I help Midwest families build strong credit foundations while staying true to heartland values of honesty and hard work.",
            specialties: ["Credit Building", "Credit Repair", "Student Loans"],
            yearsExperience: 7, location: "Kansas City, MO", rating: 4.5, reviewCount: 49,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2022"
        ),
        CSOProvider(
            id: "cso-034", userId: "user-034", name: "Natasha Petrov",
            email: "natasha.petrov@pittsburghcredit.com", phone: "(412) 555-2014",
            avatarURL: "https://images.unsplash.com/photo-1589571894960-20bbe2828d0a?w=200&h=200&fit=crop&crop=face",
            bio: "Steel City strong! Pittsburgh credit specialist helping families transition from traditional industries to new economy opportunities with solid credit foundations.",
            specialties: ["Credit Repair", "Bankruptcy Recovery", "Debt Settlement"],
            yearsExperience: 13, location: "Pittsburgh, PA", rating: 4.7, reviewCount: 81,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2020"
        ),
        CSOProvider(
            id: "cso-035", userId: "user-035", name: "Derek Palmer",
            email: "derek.palmer@raleighcredit.com", phone: "(919) 555-2015",
            avatarURL: "https://images.unsplash.com/photo-1603415526960-f7e0328c63b1?w=200&h=200&fit=crop&crop=face",
            bio: "Research Triangle credit expert helping tech workers and academics build business credit. Understanding complex compensation packages is my specialty.",
            specialties: ["Business Credit", "Credit Building", "Credit Repair"],
            yearsExperience: 8, location: "Raleigh, NC", rating: 4.8, reviewCount: 67,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2022"
        ),
        CSOProvider(
            id: "cso-036", userId: "user-036", name: "Amara Okonkwo",
            email: "amara.okonkwo@stlcredit.com", phone: "(314) 555-2016",
            avatarURL: "https://images.unsplash.com/photo-1607746882042-944635dfe10e?w=200&h=200&fit=crop&crop=face",
            bio: "St. Louis credit advocate with a mission to close the wealth gap. I provide affordable credit repair services and financial education to underserved communities.",
            specialties: ["Credit Repair", "Credit Building", "Debt Settlement"],
            yearsExperience: 9, location: "St. Louis, MO", rating: 4.9, reviewCount: 88,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2021"
        ),
        CSOProvider(
            id: "cso-037", userId: "user-037", name: "Jason Park",
            email: "jason.park@saltlakecredit.com", phone: "(801) 555-2017",
            avatarURL: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&h=200&fit=crop&crop=face",
            bio: "Salt Lake City's trusted credit consultant for growing families. I help young couples prepare for mortgages and build credit for their family's future.",
            specialties: ["Credit Building", "Credit Repair", "Student Loans"],
            yearsExperience: 6, location: "Salt Lake City, UT", rating: 4.6, reviewCount: 52,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2023"
        ),
        CSOProvider(
            id: "cso-038", userId: "user-038", name: "Vanessa Torres",
            email: "vanessa.torres@tampacredit.com", phone: "(813) 555-2018",
            avatarURL: "https://images.unsplash.com/photo-1558898479-33c0057a5d12?w=200&h=200&fit=crop&crop=face",
            bio: "Tampa Bay's bilingual credit expert. I specialize in helping small business owners establish business credit and separate personal from business finances.",
            specialties: ["Business Credit", "Credit Repair", "Credit Building"],
            yearsExperience: 10, location: "Tampa, FL", rating: 4.7, reviewCount: 74,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2021"
        ),
        CSOProvider(
            id: "cso-039", userId: "user-039", name: "Jerome Brown",
            email: "jerome.brown@nolacredit.com", phone: "(504) 555-2019",
            avatarURL: "https://images.unsplash.com/photo-1579038773867-044c48829161?w=200&h=200&fit=crop&crop=face",
            bio: "New Orleans proud! I help my community rebuild credit after natural disasters and economic hardships. Specializing in insurance claim disputes and recovery.",
            specialties: ["Credit Repair", "Bankruptcy Recovery", "Debt Settlement"],
            yearsExperience: 14, location: "New Orleans, LA", rating: 4.8, reviewCount: 96,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2019"
        ),
        CSOProvider(
            id: "cso-040", userId: "user-040", name: "Heather Collins",
            email: "heather.collins@okccredit.com", phone: "(405) 555-2020",
            avatarURL: "https://images.unsplash.com/photo-1569913486515-b74bf7751574?w=200&h=200&fit=crop&crop=face",
            bio: "Oklahoma City credit specialist serving the heartland. I help families affected by energy sector fluctuations maintain stable credit through economic ups and downs.",
            specialties: ["Credit Repair", "Debt Settlement", "Credit Building"],
            yearsExperience: 11, location: "Oklahoma City, OK", rating: 4.5, reviewCount: 61,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2020"
        ),
        CSOProvider(
            id: "cso-041", userId: "user-041", name: "Tommy Nguyen",
            email: "tommy.nguyen@richmondcredit.com", phone: "(804) 555-2021",
            avatarURL: "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=200&h=200&fit=crop&crop=face",
            bio: "Richmond's detail-oriented credit analyst. I take a methodical approach to credit repair, documenting every dispute and following up relentlessly until resolved.",
            specialties: ["Credit Repair", "Identity Theft", "Credit Building"],
            yearsExperience: 8, location: "Richmond, VA", rating: 4.7, reviewCount: 59,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2022"
        ),
        CSOProvider(
            id: "cso-042", userId: "user-042", name: "Ashley Morgan",
            email: "ashley.morgan@louisvillecredit.com", phone: "(502) 555-2022",
            avatarURL: "https://images.unsplash.com/photo-1567532939604-b6b5b0db2604?w=200&h=200&fit=crop&crop=face",
            bio: "Louisville's friendly neighborhood credit expert. I make credit repair approachable and understandable for everyone, from college students to retirees.",
            specialties: ["Credit Building", "Student Loans", "Credit Repair"],
            yearsExperience: 7, location: "Louisville, KY", rating: 4.6, reviewCount: 53,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2022"
        ),
        CSOProvider(
            id: "cso-043", userId: "user-043", name: "Jonathan Edwards",
            email: "jonathan.edwards@hartfordcredit.com", phone: "(860) 555-2023",
            avatarURL: "https://images.unsplash.com/photo-1557862921-37829c790f19?w=200&h=200&fit=crop&crop=face",
            bio: "Insurance capital expertise! Hartford-based credit specialist with deep knowledge of insurance-related credit issues and claims-based disputes.",
            specialties: ["Credit Repair", "Identity Theft", "Debt Settlement"],
            yearsExperience: 12, location: "Hartford, CT", rating: 4.8, reviewCount: 77,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2020"
        ),
        CSOProvider(
            id: "cso-044", userId: "user-044", name: "Nicole Baptiste",
            email: "nicole.baptiste@providencecredit.com", phone: "(401) 555-2024",
            avatarURL: "https://images.unsplash.com/photo-1596215143922-eedeaba0d91c?w=200&h=200&fit=crop&crop=face",
            bio: "Rhode Island's dedicated credit advocate. Small state, big results! I provide personalized attention to every client and fight for maximum credit improvement.",
            specialties: ["Credit Repair", "Credit Building", "Debt Settlement"],
            yearsExperience: 9, location: "Providence, RI", rating: 4.9, reviewCount: 69,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2021"
        ),
        CSOProvider(
            id: "cso-045", userId: "user-045", name: "Robert Olsen",
            email: "robert.olsen@milwaukeecredit.com", phone: "(414) 555-2025",
            avatarURL: "https://images.unsplash.com/photo-1504593811423-6dd665756598?w=200&h=200&fit=crop&crop=face",
            bio: "Milwaukee's hardworking credit specialist. I understand blue-collar finances and help working families build credit that opens doors to homeownership.",
            specialties: ["Credit Repair", "Credit Building", "Bankruptcy Recovery"],
            yearsExperience: 10, location: "Milwaukee, WI", rating: 4.6, reviewCount: 64,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2021"
        ),
        CSOProvider(
            id: "cso-046", userId: "user-046", name: "Diana Ramirez",
            email: "diana.ramirez@tuconcredit.com", phone: "(520) 555-2026",
            avatarURL: "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=200&h=200&fit=crop&crop=face",
            bio: "Tucson's bilingual credit expert serving Southern Arizona. I help families navigate cross-border credit challenges and build strong financial foundations.",
            specialties: ["Credit Repair", "Credit Building", "Debt Settlement"],
            yearsExperience: 8, location: "Tucson, AZ", rating: 4.7, reviewCount: 56,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2022"
        ),
        CSOProvider(
            id: "cso-047", userId: "user-047", name: "Sean O'Brien",
            email: "sean.obrien@buffcredit.com", phone: "(716) 555-2027",
            avatarURL: "https://images.unsplash.com/photo-1618077360395-f3068be8e001?w=200&h=200&fit=crop&crop=face",
            bio: "Buffalo tough on bad credit! I help Western New York families overcome financial setbacks and build credit that survives economic winters.",
            specialties: ["Credit Repair", "Bankruptcy Recovery", "Debt Settlement"],
            yearsExperience: 11, location: "Buffalo, NY", rating: 4.5, reviewCount: 62,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2020"
        ),
        CSOProvider(
            id: "cso-048", userId: "user-048", name: "Jasmine Carter",
            email: "jasmine.carter@birmcredit.com", phone: "(205) 555-2028",
            avatarURL: "https://images.unsplash.com/photo-1611432579699-484f7990b127?w=200&h=200&fit=crop&crop=face",
            bio: "Birmingham's credit champion dedicated to building generational wealth in Alabama communities. I believe financial literacy is the foundation of credit success.",
            specialties: ["Credit Building", "Credit Repair", "Student Loans"],
            yearsExperience: 7, location: "Birmingham, AL", rating: 4.8, reviewCount: 71,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2022"
        ),
        CSOProvider(
            id: "cso-049", userId: "user-049", name: "Erik Lindberg",
            email: "erik.lindberg@boisecredit.com", phone: "(208) 555-2029",
            avatarURL: "https://images.unsplash.com/photo-1600180758890-6b94519a8ba6?w=200&h=200&fit=crop&crop=face",
            bio: "Idaho's trusted credit advisor for growing families and businesses. I help newcomers to Boise establish credit in their new home state.",
            specialties: ["Credit Building", "Business Credit", "Credit Repair"],
            yearsExperience: 6, location: "Boise, ID", rating: 4.6, reviewCount: 47,
            consultationFee: 99.99, isAvailable: true, certifiedAt: "2023"
        ),
        CSOProvider(
            id: "cso-050", userId: "user-050", name: "Sandra Nakamura",
            email: "sandra.nakamura@anchoragecredit.com", phone: "(907) 555-2030",
            avatarURL: "https://images.unsplash.com/photo-1614204424926-196a80bf0be8?w=200&h=200&fit=crop&crop=face",
            bio: "Alaska's premier credit specialist! I help residents navigate the unique financial challenges of frontier living, including seasonal employment and remote work credit issues.",
            specialties: ["Credit Repair", "Credit Building", "Identity Theft"],
            yearsExperience: 9, location: "Anchorage, AK", rating: 4.7, reviewCount: 54,
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

import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Animated,
  Linking,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Search,
  ChevronDown,
  ChevronUp,
  BookOpen,
  CreditCard,
  Users,
  Shield,
  HelpCircle,
  Cloud,
  Bot,
  DollarSign,
  Award,
  Briefcase,
  Phone,
  Mail,
  X,
  GraduationCap,
  Scale,
} from "lucide-react-native";
import { useTheme } from "@/contexts/ThemeContext";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
}

interface FAQCategory {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  faqs: FAQItem[];
}

export default function HelpCenterScreen() {
  const router = useRouter();
  const { colors, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
  
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const faqCategories: FAQCategory[] = [
    {
      id: "getting-started",
      title: "Getting Started",
      icon: <GraduationCap color={colors.primary} size={22} />,
      color: colors.primary,
      faqs: [
        {
          id: "gs-1",
          question: "What is Western Credit Institute?",
          answer: "Western Credit Institute (WCI) is an online educational platform offering comprehensive credit education through the Advanced Credit Education (ACE) program. Our courses teach advanced credit repair, credit building, and business credit strategies. We provide AI-powered tools, professional certification, and a marketplace to connect with certified credit professionals."
        },
        {
          id: "gs-2",
          question: "How do I create an account?",
          answer: "To create an account:\n\n1. Download the Western Credit Institute app or visit our website\n2. Tap 'Register' or 'Sign Up'\n3. Enter your full name, email address, and create a password\n4. Verify your email address\n5. Complete your profile information\n\nOnce registered, you can browse courses and enroll in the ACE program."
        },
        {
          id: "gs-3",
          question: "What courses are available?",
          answer: "We offer the following courses:\n\n• ACE-1: Advanced Credit Repair - Master techniques to legally remove negative items from your credit report (60-day free trial, $99.99 certificate fee)\n\n• ACE-2: Advanced Credit Building - Learn to establish an 800+ FICO score in as little as 90 days ($499.98 + $99.99 cert fee, payment plan available)\n\n• ACE-3: Advanced Business Credit - Master business credit strategies for business growth ($499.98 + $99.99 cert fee, payment plan available)\n\n• ACE-4: Complete Bundle - All three courses at a discounted price of $1,299 (includes all certificates)\n\n• CSO Certification - FREE program for students who complete ACE-1, ACE-2, and ACE-3"
        },
        {
          id: "gs-4",
          question: "Is there a free trial?",
          answer: "Yes! ACE-1 (Advanced Credit Repair) offers a 60-day FREE trial. You only pay the $99.99 certificate fee to enroll. This gives you full access to:\n\n• All course materials and video lectures\n• AI Credit Repair Coach\n• AI Dispute Assistant\n• AI Lawsuit Assistant\n• Cloud Dispute Tracker\n• Interactive Study Guide\n\nAfter 60 days, continue access for just $25/month."
        },
      ]
    },
    {
      id: "credit-simulator",
      title: "Credit Life Simulator Guide",
      icon: <GraduationCap color="#10B981" size={22} />,
      color: "#10B981",
      faqs: [
        {
          id: "sim-1",
          question: "What is the Credit Life Simulator?",
          answer: "The Credit Life Simulator is an interactive game that teaches you how credit works in real life. You'll manage a virtual financial life - get jobs, apply for credit cards and loans, buy cars and homes, manage expenses, and watch how your decisions affect your credit score. It's a safe way to learn credit strategies without real-world consequences!"
        },
        {
          id: "sim-2",
          question: "How do I get started?",
          answer: "To get started with the Credit Life Simulator:\n\n1. Navigate to the 'Credit Simulator' from the main menu\n2. You'll start with $2,500 in your bank account and a 720 credit score\n3. First, get a job in the 'Career' section to earn income\n4. Then apply for your first credit card at the 'Bank'\n5. Manage your budget and advance through months to build your credit history\n\nTip: Buy groceries regularly in the Marketplace to stay healthy!"
        },
        {
          id: "sim-3",
          question: "How does the credit score work?",
          answer: "Your credit score (300-850) is calculated based on real FICO scoring factors:\n\n• Payment History (35%): Pay bills on time to build positive history\n• Credit Utilization (30%): Keep credit card balances below 30% of limits\n• Credit Age (15%): Longer account history is better\n• Credit Mix (10%): Having different types of credit helps\n• New Credit (10%): Too many applications hurt your score\n\nView detailed score breakdown by tapping the 'i' icon on your credit score."
        },
        {
          id: "sim-4",
          question: "How do I buy a car? What's the difference between gas and electric?",
          answer: "To buy a car:\n\n1. Go to Bank > Apply for Auto Loan\n2. Choose a vehicle from the Marketplace\n3. Get approved based on your credit score\n\n🚗 GAS CARS: Cheaper upfront but require monthly gas purchases\n• You'll see low fuel warnings when tank drops below 25%\n• Buy gas in the Marketplace to refill\n• Monthly fuel costs: $140-$300 depending on vehicle\n\n⚡ ELECTRIC CARS: Higher price but budget-friendly long-term\n• No gas needed - saves $100-$200+/month\n• Upgrade option for eco-conscious players\n• Lower monthly operating costs"
        },
        {
          id: "sim-5",
          question: "How do I buy a house and what are solar panels?",
          answer: "To buy a house:\n\n1. Go to Bank > Apply for Mortgage\n2. Browse properties in the Marketplace\n3. You'll need good credit (620+) and a down payment\n\n☀️ SOLAR PANEL UPGRADE:\n• Cost: $15,000 one-time installation\n• Saves $75/month on utility bills\n• Available for any owned property\n• Access via your property details or Budget section\n• Pays for itself in about 17 months, then pure savings!\n\nTip: Solar is great for long-term players who want to reduce monthly expenses."
        },
        {
          id: "sim-6",
          question: "When do I get paid? How do payday alerts work?",
          answer: "💰 PAYDAY NOTIFICATIONS:\n\nWhen you have a job, you'll receive payday alerts:\n• 1st of month: Main salary deposit\n• 15th of month: Bi-weekly pay notification\n\nYour monthly income appears in the Monthly Report when you advance to the next month. The report shows:\n• Total income deposited\n• Expenses paid\n• Net savings/loss\n• Credit score changes\n\nManage alerts in your Profile > Alerts settings."
        },
        {
          id: "sim-7",
          question: "What happens if I run out of gas?",
          answer: "⛽ LOW FUEL WARNINGS:\n\nIf you own a gas vehicle:\n• You'll get warnings when fuel drops below 25%\n• Warnings appear in your Monthly Report\n• You can see fuel level in the Marketplace under your vehicles\n\nTO REFUEL:\n1. Go to Marketplace > Cars section\n2. Find your owned vehicle\n3. Purchase gas (price varies around $3.50/gallon)\n\nElectric vehicles don't need refueling - they charge automatically with minimal cost!"
        },
        {
          id: "sim-8",
          question: "How do I improve my credit score?",
          answer: "Tips to improve your credit score:\n\n✅ ALWAYS pay bills on time - this is the #1 factor\n\n✅ Keep credit utilization low - use less than 30% of your credit limit\n\n✅ Don't apply for too many cards at once - each application is a hard inquiry\n\n✅ Keep old accounts open - longer credit history helps\n\n✅ Have a mix of credit types - cards, auto loans, mortgage\n\n❌ Avoid late payments - they stay on your record\n\n❌ Don't max out credit cards\n\n❌ Avoid collections and negative marks"
        },
        {
          id: "sim-9",
          question: "What are achievements and how do I unlock them?",
          answer: "Achievements reward you for financial milestones:\n\n🏆 Credit Achievements:\n• First Credit Card - Open your first card\n• Credit Builder - Reach 680 score\n• Excellent Credit - Reach 760 score\n• Perfect Score - Achieve 850!\n\n💼 Career Achievements:\n• Employed - Get your first job\n• Six Figures - Earn $100k+ salary\n\n🏠 Property Achievements:\n• Homeowner - Buy your first property\n\n💰 Each achievement earns you a cash bonus!\n\nView all achievements in the Achievements section."
        },
        {
          id: "sim-10",
          question: "What is the Leaderboard?",
          answer: "The Leaderboard ranks players by:\n\n1. Credit Score\n2. Net Worth\n3. Lifestyle (housing, vehicles, fashion)\n\nClimb the ranks by:\n• Building excellent credit\n• Accumulating wealth and assets\n• Buying property and vehicles\n• Building your wardrobe\n\nMake your profile public to appear on the leaderboard and compete with other players!"
        },
        {
          id: "sim-11",
          question: "How do I manage my budget?",
          answer: "The Budget section shows:\n\n📊 Income vs. Expenses breakdown\n• Housing (rent/mortgage)\n• Utilities (reduced with solar!)\n• Transportation (gas for vehicles)\n• Insurance\n• Groceries\n• Subscriptions\n\n💡 Tips:\n• Keep expenses below income\n• Build an emergency fund\n• Install solar panels to reduce utility costs\n• Buy an electric car to eliminate gas costs\n• Monitor your spending each month"
        },
        {
          id: "sim-12",
          question: "What happens if I don't buy groceries?",
          answer: "⚠️ HEALTH SYSTEM:\n\nYou must buy groceries regularly to stay healthy!\n\n• If you don't buy food for a full month, you'll be hospitalized\n• Hospital bill: $2,500\n• Your credit score drops 15 points\n• Your health drops to 30%\n\nTO STAY HEALTHY:\n1. Go to Marketplace > Food section\n2. Buy groceries at least once per month\n3. Different foods have different health impacts\n4. Watch the health indicator in the Marketplace\n\nOrganic groceries provide better health boosts!"
        },
      ]
    },
    {
      id: "courses-enrollment",
      title: "Courses & Enrollment",
      icon: <BookOpen color={colors.secondary} size={22} />,
      color: colors.secondary,
      faqs: [
        {
          id: "ce-1",
          question: "How do I enroll in a course?",
          answer: "To enroll in a course:\n\n1. Navigate to the 'Courses' tab\n2. Browse available courses or use the search function\n3. Tap on a course to view details\n4. Review course content, pricing, and features\n5. Tap 'Enroll Now' and follow the payment instructions\n\nFor ACE-1, you'll pay the $99.99 certificate fee to start your 60-day free trial. For ACE-2 and ACE-3, you can choose the auto-debit payment plan."
        },
        {
          id: "ce-2",
          question: "What payment options are available?",
          answer: "Payment options vary by course:\n\n• ACE-1: $99.99 certificate fee (one-time), then $25/month after 60-day trial\n\n• ACE-2 & ACE-3: $99.99 enrollment fee + 3 monthly payments of $166.66 (auto-debit only). After completion, $25/month to continue access.\n\n• ACE-4 Bundle: $1,299 one-time payment (no payment plan)\n\n• CSO Certification: FREE for students who complete ACE-1, ACE-2, and ACE-3\n\nWe accept major credit cards, debit cards, and PayPal."
        },
        {
          id: "ce-3",
          question: "What is the auto-debit policy?",
          answer: "For ACE-2 and ACE-3 courses, enrollment is AUTO-DEBIT ONLY. This means:\n\n• Monthly payments are automatically charged to your payment method\n• You cannot skip or delay payments\n• IMPORTANT: If an auto-debit payment fails, you will be immediately locked out of the course until payment is received\n\nPlease ensure your payment method has sufficient funds before each billing date."
        },
        {
          id: "ce-4",
          question: "Can I get a refund?",
          answer: "Due to the nature of our digital educational content and immediate access granted upon enrollment, ALL SALES ARE FINAL. We do not offer refunds, exchanges, or credits for any purchases.\n\nWe encourage you to:\n• Review all course information before purchasing\n• Take advantage of the 60-day free trial for ACE-1\n• Contact support with any questions before enrolling\n\nPlease review our full Terms & Conditions for more details."
        },
        {
          id: "ce-5",
          question: "How do I access my enrolled courses?",
          answer: "To access your enrolled courses:\n\n1. Go to the 'Courses' tab\n2. Tap 'My Courses' to filter your enrolled courses\n3. Tap on any course to continue learning\n4. Your progress is automatically saved\n\nYou can also see your course progress on the home screen dashboard."
        },
        {
          id: "ce-6",
          question: "What is the CSO Certification?",
          answer: "The CSO (Credit Services Organization) Certification is a professional certification that qualifies you to legally operate as a Credit Services Organization. This FREE program is available only to students who have completed:\n\n• ACE-1: Advanced Credit Repair\n• ACE-2: Advanced Credit Building\n• ACE-3: Advanced Business Credit\n\nThe certification includes a comprehensive CSOA lecture, credit laws compliance training (FCRA, FDCPA), and a certification exam. Upon passing, you receive a digital certificate."
        },
      ]
    },
    {
      id: "ai-tools",
      title: "AI Tools & Features",
      icon: <Bot color={colors.accent} size={22} />,
      color: colors.accent,
      faqs: [
        {
          id: "ai-1",
          question: "What is the AI Credit Repair Coach?",
          answer: "The AI Credit Repair Coach is an interactive AI-powered assistant available to ACE-1 students. It provides:\n\n• Personalized credit repair guidance\n• Answers to credit-related questions\n• Step-by-step dispute strategies\n• Real-time advice based on your situation\n\nAccess the AI Coach from your ACE-1 course dashboard or the Interactive Coach section."
        },
        {
          id: "ai-2",
          question: "How does the AI Dispute Assistant work?",
          answer: "The AI Dispute Assistant helps you create professional dispute letters:\n\n1. Upload or paste your credit report\n2. The AI identifies negative accounts\n3. Select accounts you want to dispute\n4. Answer guided questions about each account\n5. The AI generates customized dispute letters\n6. Copy, print, or save letters to Cloud Dispute Tracker\n\nSupported letter types include: 623 Letter, 809 Letter, 611 Letter, 609 Letter, Intent to Sue letters, and more."
        },
        {
          id: "ai-3",
          question: "What is the AI Lawsuit Assistant?",
          answer: "The AI Lawsuit Assistant helps ACE-1 students who may have grounds to sue creditors or debt collectors for violations. It provides:\n\n• Violation identification guidance\n• Legal document templates\n• Small claims court information\n• Step-by-step lawsuit filing guidance\n\nNote: This tool is for educational purposes only and does not constitute legal advice. Consult with a qualified attorney for legal matters."
        },
        {
          id: "ai-4",
          question: "What is the Cloud Dispute Tracker?",
          answer: "The Cloud Dispute Tracker is a powerful tool to manage your credit disputes:\n\n• Track disputes across all three credit bureaus (Equifax, Experian, TransUnion)\n• Monitor dispute status (Sent, In-Progress, Resolved, Rejected)\n• View response deadlines and get alerts for overdue responses\n• Store dispute letters and timeline notes\n• Bulk select and update multiple disputes\n• Copy or print dispute letters directly\n\nYour disputes are securely stored in the cloud and accessible from any device."
        },
        {
          id: "ai-5",
          question: "How do I upload my credit report?",
          answer: "To upload your credit report in the AI Dispute Assistant:\n\n1. Obtain your credit report from AnnualCreditReport.com (free) or a credit monitoring service\n2. Save or download the report as text or PDF\n3. In the AI Dispute Assistant, tap 'Upload Credit Report'\n4. Paste the text content or upload the file\n5. The AI will automatically detect the credit bureau and parse negative accounts\n\nSupported formats: Equifax, Experian, and TransUnion reports."
        },
      ]
    },
    {
      id: "subscriptions-billing",
      title: "Subscriptions & Billing",
      icon: <CreditCard color={colors.info} size={22} />,
      color: colors.info,
      faqs: [
        {
          id: "sb-1",
          question: "What subscription plans are available?",
          answer: "We offer the following subscription tiers:\n\n• Free Plan: Browse courses, limited access to features\n\n• ACE-1 Student ($25/month after 60-day trial):\n  - Full ACE-1 course access\n  - All AI tools (Coach, Dispute Assistant, Lawsuit Assistant)\n  - Cloud Dispute Tracker\n  - $25 referral bonus per student\n\n• CSO Affiliate ($49.99/month):\n  - All course content included\n  - 50-75% residual income on referrals\n  - 20% sales commission\n  - Listed in Hire A Pro marketplace\n  - Priority support"
        },
        {
          id: "sb-2",
          question: "How do I upgrade my subscription?",
          answer: "To upgrade your subscription:\n\n1. Go to your Profile\n2. Find the 'Subscription' section\n3. View your current plan and upgrade options\n4. For CSO Affiliate upgrade, you must first:\n   - Complete all 4 ACE courses (ACE-1 through ACE-4)\n   - Receive your CSO Certification badge\n5. Tap 'Upgrade' and complete payment\n\nYour new benefits will be available immediately."
        },
        {
          id: "sb-3",
          question: "How do I cancel my subscription?",
          answer: "To cancel your subscription:\n\n1. Go to Profile > Subscription\n2. Tap 'Manage Subscription'\n3. Select 'Cancel Subscription'\n4. Confirm cancellation\n\nNote: Cancellation takes effect at the end of your current billing period. You will retain access until then. For courses with payment plans, all remaining payments are still due."
        },
        {
          id: "sb-4",
          question: "When am I billed?",
          answer: "Billing occurs as follows:\n\n• ACE-1: Certificate fee ($99.99) upon enrollment, then $25/month starting after your 60-day trial\n\n• ACE-2/ACE-3: Enrollment fee ($99.99) upon enrollment, then monthly installments on the same date each month for 3 months\n\n• CSO Affiliate: $49.99 on your subscription anniversary date each month\n\nAll renewals are automatic. You can view your next billing date in Profile > Subscription."
        },
        {
          id: "sb-5",
          question: "How do I update my payment method?",
          answer: "To update your payment method:\n\n1. Go to Profile > Payment Methods\n2. Tap 'Add Payment Method' to add a new card\n3. Enter your card details\n4. Set as default payment method if desired\n5. Remove old payment methods if needed\n\nEnsure your payment method is updated before your next billing date to avoid service interruption."
        },
      ]
    },
    {
      id: "earnings-referrals",
      title: "Earnings & Referrals",
      icon: <DollarSign color={colors.success} size={22} />,
      color: colors.success,
      faqs: [
        {
          id: "er-1",
          question: "How does the referral program work?",
          answer: "Our referral program allows you to earn money by referring new students:\n\n• ACE-1 Students: Earn $25 for every ACE-1 student referral who enrolls\n\n• CSO Affiliates: Earn 50-75% residual income on CSO referrals + 20% commission on all course sales\n\nTo refer someone:\n1. Go to Earnings > Refer & Earn\n2. Copy your unique referral link\n3. Share via social media, email, or text\n4. Earn when your referral enrolls"
        },
        {
          id: "er-2",
          question: "When do I get paid?",
          answer: "Referral earnings are paid monthly:\n\n• All referral earnings are processed once per month\n• Pending earnings become available after the billing cycle closes\n• Payouts are processed within 5-7 business days\n• Minimum payout amount is $25\n\nYou can request a payout in the Wallet tab once your available balance meets the minimum."
        },
        {
          id: "er-3",
          question: "How do I request a payout?",
          answer: "To request a payout:\n\n1. Go to the Wallet tab\n2. Check your Available Balance (must be at least $25)\n3. Tap 'Request Payout'\n4. Enter the amount you want to withdraw\n5. Select payment method (PayPal or Bank Transfer)\n6. Submit your request\n\nPayouts are processed monthly and typically arrive within 5-7 business days."
        },
        {
          id: "er-4",
          question: "What is residual income for CSO Affiliates?",
          answer: "CSO Affiliates earn residual income on their CSO referrals:\n\n• 50% residual income: Default rate for all CSO Affiliates\n• 75% residual income: Unlocked when you reach 100+ CSO referrals\n\nResidual income is recurring - you earn every month as long as your referral maintains their subscription. This creates a sustainable passive income stream."
        },
        {
          id: "er-5",
          question: "How can I earn from consultations?",
          answer: "CSO Certified professionals can earn $74.99 per consultation through the Hire A Pro marketplace:\n\n1. Complete your CSO Certification\n2. Your profile is listed in Hire A Pro\n3. Clients pay $99.99 to unlock your contact info\n4. You receive $74.99 per consultation (WCI retains $25 platform fee)\n\nBuild your reputation through client reviews to attract more consultations."
        },
      ]
    },
    {
      id: "hire-pro",
      title: "Hire A Pro",
      icon: <Briefcase color={colors.warning} size={22} />,
      color: colors.warning,
      faqs: [
        {
          id: "hp-1",
          question: "What is Hire A Pro?",
          answer: "Hire A Pro is our marketplace connecting users with CSO Certified credit professionals. Features include:\n\n• Browse certified credit repair specialists\n• Filter by specialty (Credit Repair, Debt Settlement, Identity Theft, Credit Building, Business Credit, etc.)\n• View ratings, reviews, and experience\n• Pay to unlock contact information\n• Leave reviews after consultations\n\nAll professionals are CSO Certified and have completed the full ACE program."
        },
        {
          id: "hp-2",
          question: "How much does it cost to hire a professional?",
          answer: "The consultation fee is $99.99 per professional. This one-time fee unlocks:\n\n• Phone number and email address\n• Direct messaging capability\n• Ability to leave a review\n\nThe fee breakdown:\n• $74.99 goes to the professional\n• $25.00 platform fee to WCI"
        },
        {
          id: "hp-3",
          question: "How do I become listed in Hire A Pro?",
          answer: "To be listed as a professional in Hire A Pro:\n\n1. Complete all ACE courses (ACE-1, ACE-2, ACE-3)\n2. Pass the CSO Certification exam\n3. Upgrade to CSO Affiliate subscription ($49.99/month)\n\nOnce certified, your profile automatically appears in the Hire A Pro marketplace with your specialties, bio, and rating."
        },
        {
          id: "hp-4",
          question: "How do reviews work?",
          answer: "Reviews help build trust in the marketplace:\n\n• Only clients who paid for your contact info can leave reviews\n• Reviews include a 1-5 star rating and written comment\n• Your overall rating is displayed on your profile\n• Higher ratings help you attract more clients\n\nTo leave a review, open the professional's profile and tap 'Write Review' after your consultation."
        },
      ]
    },
    {
      id: "certificates",
      title: "Certificates & Credentials",
      icon: <Award color={colors.error} size={22} />,
      color: colors.error,
      faqs: [
        {
          id: "cert-1",
          question: "How do I earn a certificate?",
          answer: "To earn a Certificate of Completion:\n\n1. Enroll in a course (ACE-1, ACE-2, ACE-3, or Bundle)\n2. Complete all course sections and lessons\n3. Pass all quizzes and exams with required score\n4. Your certificate is automatically generated\n\nView your certificates in Profile > My Certificates. Each certificate includes your name, course completed, completion date, and unique certificate ID."
        },
        {
          id: "cert-2",
          question: "What is CSO Certification?",
          answer: "CSO (Credit Services Organization) Certification is a professional credential showing you're qualified to operate as a credit services professional. Requirements:\n\n1. Complete ACE-1: Advanced Credit Repair\n2. Complete ACE-2: Advanced Credit Building\n3. Complete ACE-3: Advanced Business Credit\n4. Pass the CSO Certification Exam\n\nBenefits:\n• Professional CSO badge on your profile\n• Eligibility for CSO Affiliate program\n• Listed in Hire A Pro marketplace\n• Higher earning potential"
        },
        {
          id: "cert-3",
          question: "Can I verify my certificate?",
          answer: "Yes, all certificates can be verified:\n\n• Each certificate has a unique Certificate ID\n• Share your certificate via link or download\n• Anyone can verify authenticity on our website\n\nCertificates are stored securely and remain accessible from your profile indefinitely."
        },
      ]
    },
    {
      id: "account-security",
      title: "Account & Security",
      icon: <Shield color={colors.primary} size={22} />,
      color: colors.primary,
      faqs: [
        {
          id: "as-1",
          question: "How do I reset my password?",
          answer: "To reset your password:\n\n1. On the login screen, tap 'Forgot Password'\n2. Enter your registered email address\n3. Check your email for a password reset link\n4. Click the link and create a new password\n5. Log in with your new password\n\nIf you don't receive the email, check your spam folder or contact support."
        },
        {
          id: "as-2",
          question: "How do I update my profile information?",
          answer: "To update your profile:\n\n1. Go to Profile > Personal Information\n2. Tap 'Edit' to modify your details\n3. Update your name, email, phone, or address\n4. Save your changes\n\nNote: Changing your email may require verification."
        },
        {
          id: "as-3",
          question: "Is my data secure?",
          answer: "Yes, we take data security seriously:\n\n• All data is encrypted in transit and at rest\n• Secure payment processing through PCI-compliant providers\n• Regular security assessments and updates\n• Access controls and authentication measures\n• We never sell your personal information\n\nFor full details, review our Privacy Policy in Profile > Legal."
        },
        {
          id: "as-4",
          question: "How do I delete my account?",
          answer: "To delete your account:\n\n1. Contact support at support@westerncreditinstitute.com\n2. Request account deletion\n3. Verify your identity\n4. Your account will be deleted within 30 days\n\nNote: Account deletion is permanent. All data, progress, and certificates will be lost. Active subscriptions must be cancelled first."
        },
      ]
    },
    {
      id: "legal-disclaimers",
      title: "Legal & Disclaimers",
      icon: <Scale color={colors.textSecondary} size={22} />,
      color: colors.textSecondary,
      faqs: [
        {
          id: "ld-1",
          question: "Is this legal advice?",
          answer: "NO. All content provided by Western Credit Institute, including courses, AI tools, and materials, is for EDUCATIONAL PURPOSES ONLY. This content does not constitute legal, financial, or professional advice.\n\nWe strongly recommend consulting with qualified legal, financial, or credit professionals before making decisions that may affect your credit, finances, or legal standing.\n\nYou are solely responsible for any actions you take based on information provided."
        },
        {
          id: "ld-2",
          question: "What laws govern credit repair?",
          answer: "Credit repair is governed by several federal laws:\n\n• Fair Credit Reporting Act (FCRA): Governs how credit bureaus collect, use, and share your information\n\n• Fair Debt Collection Practices Act (FDCPA): Regulates how debt collectors can contact and collect from you\n\n• Credit Services Organization Act (CSOA): Regulates businesses that offer credit repair services\n\nOur courses teach you how to use these laws to protect your rights. We also cover compliance requirements for those seeking CSO Certification."
        },
        {
          id: "ld-3",
          question: "What are the Terms & Conditions?",
          answer: "Key points of our Terms & Conditions:\n\n• All sales are final - no refunds\n• Content is for educational purposes only\n• You may not reproduce or distribute our materials\n• Limitation of liability applies\n• Governed by California state law\n• Disputes subject to Orange County, CA jurisdiction\n\nView the full Terms & Conditions in Profile > Legal."
        },
        {
          id: "ld-4",
          question: "How is my privacy protected?",
          answer: "We protect your privacy by:\n\n• Collecting only necessary information\n• Using secure encryption for all data\n• Never selling your personal information\n• Providing opt-out options for marketing\n• Giving you access to your data upon request\n• Complying with GDPR and CCPA regulations\n\nView our full Privacy Policy in Profile > Legal."
        },
      ]
    },
  ];

  const toggleCategory = (categoryId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
    setExpandedFAQ(null);
  };

  const toggleFAQ = (faqId: string) => {
    Haptics.selectionAsync();
    setExpandedFAQ(expandedFAQ === faqId ? null : faqId);
  };

  const filteredCategories = faqCategories.map(category => ({
    ...category,
    faqs: category.faqs.filter(faq =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => searchQuery === "" || category.faqs.length > 0);

  const handleContact = (type: "phone" | "email") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (type === "phone") {
      Linking.openURL("tel:+18004378557");
    } else {
      Linking.openURL("mailto:support@westerncreditinstitute.com");
    }
  };

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Help Center",
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.text,
          headerShadowVisible: false,
        }}
      />

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={{ opacity: fadeAnim }}>
          <View style={styles.header}>
            <Text style={styles.title}>How can we help?</Text>
            <Text style={styles.subtitle}>
              Search our FAQs or browse by topic
            </Text>
          </View>

          <View style={styles.searchContainer}>
            <Search color={colors.textLight} size={20} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search for help..."
              placeholderTextColor={colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <X color={colors.textLight} size={18} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.quickLinks}>
            <Text style={styles.sectionTitle}>Quick Links</Text>
            <View style={styles.quickLinksGrid}>
              <TouchableOpacity
                style={[styles.quickLinkCard, { borderColor: colors.border }]}
                onPress={() => router.push("/courses" as any)}
              >
                <BookOpen color={colors.primary} size={24} />
                <Text style={styles.quickLinkText}>View Courses</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickLinkCard, { borderColor: colors.border }]}
                onPress={() => router.push("/subscription-plans" as any)}
              >
                <CreditCard color={colors.secondary} size={24} />
                <Text style={styles.quickLinkText}>Plans & Pricing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickLinkCard, { borderColor: colors.border }]}
                onPress={() => router.push("/dispute-tracker" as any)}
              >
                <Cloud color={colors.accent} size={24} />
                <Text style={styles.quickLinkText}>Dispute Tracker</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickLinkCard, { borderColor: colors.border }]}
                onPress={() => router.push("/hire-pro" as any)}
              >
                <Users color={colors.success} size={24} />
                <Text style={styles.quickLinkText}>Hire A Pro</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.faqSection}>
            <Text style={styles.sectionTitle}>
              {searchQuery ? `Search Results (${filteredCategories.reduce((sum, cat) => sum + cat.faqs.length, 0)})` : "Frequently Asked Questions"}
            </Text>

            {filteredCategories.map((category) => (
              <View key={category.id} style={styles.categoryContainer}>
                <TouchableOpacity
                  style={[
                    styles.categoryHeader,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    expandedCategory === category.id && { borderColor: category.color },
                  ]}
                  onPress={() => toggleCategory(category.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.categoryHeaderLeft}>
                    <View style={[styles.categoryIcon, { backgroundColor: category.color + "15" }]}>
                      {category.icon}
                    </View>
                    <View>
                      <Text style={styles.categoryTitle}>{category.title}</Text>
                      <Text style={styles.categoryCount}>
                        {category.faqs.length} question{category.faqs.length !== 1 ? "s" : ""}
                      </Text>
                    </View>
                  </View>
                  {expandedCategory === category.id ? (
                    <ChevronUp color={colors.text} size={20} />
                  ) : (
                    <ChevronDown color={colors.textLight} size={20} />
                  )}
                </TouchableOpacity>

                {expandedCategory === category.id && (
                  <View style={styles.faqList}>
                    {category.faqs.map((faq) => (
                      <View key={faq.id} style={styles.faqItem}>
                        <TouchableOpacity
                          style={[
                            styles.faqQuestion,
                            { backgroundColor: colors.surfaceAlt },
                            expandedFAQ === faq.id && { backgroundColor: colors.primary + "10" },
                          ]}
                          onPress={() => toggleFAQ(faq.id)}
                          activeOpacity={0.7}
                        >
                          <HelpCircle
                            color={expandedFAQ === faq.id ? colors.primary : colors.textSecondary}
                            size={18}
                          />
                          <Text style={[
                            styles.faqQuestionText,
                            expandedFAQ === faq.id && { color: colors.primary }
                          ]}>
                            {faq.question}
                          </Text>
                          {expandedFAQ === faq.id ? (
                            <ChevronUp color={colors.primary} size={18} />
                          ) : (
                            <ChevronDown color={colors.textLight} size={18} />
                          )}
                        </TouchableOpacity>

                        {expandedFAQ === faq.id && (
                          <View style={[styles.faqAnswer, { backgroundColor: colors.surface }]}>
                            <Text style={styles.faqAnswerText}>{faq.answer}</Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {filteredCategories.length === 0 && (
              <View style={styles.noResults}>
                <HelpCircle color={colors.textLight} size={48} />
                <Text style={styles.noResultsTitle}>No results found</Text>
                <Text style={styles.noResultsText}>
                  Try different keywords or contact support for help
                </Text>
              </View>
            )}
          </View>

          <View style={styles.contactSection}>
            <Text style={styles.sectionTitle}>Still Need Help?</Text>
            <View style={[styles.contactCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={styles.contactTitle}>Contact Support</Text>
              <Text style={styles.contactDescription}>
                Our support team is available Monday - Friday, 9am - 6pm PST
              </Text>
              <View style={styles.contactButtons}>
                <TouchableOpacity
                  style={[styles.contactButton, { backgroundColor: colors.primary }]}
                  onPress={() => handleContact("phone")}
                >
                  <Phone color={colors.white} size={18} />
                  <Text style={styles.contactButtonText}>Call Us</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.contactButton, { backgroundColor: colors.secondary }]}
                  onPress={() => handleContact("email")}
                >
                  <Mail color={colors.white} size={18} />
                  <Text style={styles.contactButtonText}>Email Us</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.contactInfo}>
                <Text style={styles.contactInfoText}>Phone: 1-800-437-8557</Text>
                <Text style={styles.contactInfoText}>Email: support@westerncreditinstitute.com</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 40 }} />
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any, isDark: boolean) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
    },
    contentContainer: {
      padding: 20,
    },
    header: {
      marginBottom: 24,
    },
    title: {
      fontSize: 28,
      fontWeight: "800" as const,
      color: colors.text,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 15,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    searchContainer: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      backgroundColor: colors.surface,
      borderRadius: 14,
      paddingHorizontal: 16,
      paddingVertical: 12,
      marginBottom: 24,
      gap: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    searchInput: {
      flex: 1,
      fontSize: 16,
      color: colors.text,
    },
    quickLinks: {
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.text,
      marginBottom: 16,
    },
    quickLinksGrid: {
      flexDirection: "row" as const,
      flexWrap: "wrap" as const,
      gap: 12,
    },
    quickLinkCard: {
      width: "48%" as any,
      flexGrow: 1,
      backgroundColor: colors.surface,
      borderRadius: 14,
      padding: 16,
      alignItems: "center" as const,
      gap: 10,
      borderWidth: 1,
    },
    quickLinkText: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.text,
      textAlign: "center" as const,
    },
    faqSection: {
      marginBottom: 24,
    },
    categoryContainer: {
      marginBottom: 12,
    },
    categoryHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
      padding: 16,
      borderRadius: 14,
      borderWidth: 1,
    },
    categoryHeaderLeft: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 14,
    },
    categoryIcon: {
      width: 44,
      height: 44,
      borderRadius: 12,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    categoryTitle: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: colors.text,
    },
    categoryCount: {
      fontSize: 12,
      color: colors.textSecondary,
      marginTop: 2,
    },
    faqList: {
      paddingTop: 8,
    },
    faqItem: {
      marginBottom: 8,
    },
    faqQuestion: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      padding: 14,
      borderRadius: 12,
      gap: 12,
    },
    faqQuestionText: {
      flex: 1,
      fontSize: 14,
      fontWeight: "500" as const,
      color: colors.text,
      lineHeight: 20,
    },
    faqAnswer: {
      padding: 16,
      borderRadius: 12,
      marginTop: 4,
      marginLeft: 16,
    },
    faqAnswerText: {
      fontSize: 14,
      color: colors.textSecondary,
      lineHeight: 22,
    },
    noResults: {
      alignItems: "center" as const,
      paddingVertical: 40,
    },
    noResultsTitle: {
      fontSize: 18,
      fontWeight: "600" as const,
      color: colors.text,
      marginTop: 16,
      marginBottom: 8,
    },
    noResultsText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: "center" as const,
    },
    contactSection: {
      marginBottom: 24,
    },
    contactCard: {
      borderRadius: 16,
      padding: 20,
      borderWidth: 1,
    },
    contactTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.text,
      marginBottom: 8,
    },
    contactDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 16,
      lineHeight: 20,
    },
    contactButtons: {
      flexDirection: "row" as const,
      gap: 12,
      marginBottom: 16,
    },
    contactButton: {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      paddingVertical: 14,
      borderRadius: 12,
      gap: 8,
    },
    contactButtonText: {
      fontSize: 15,
      fontWeight: "600" as const,
      color: colors.white,
    },
    contactInfo: {
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      gap: 4,
    },
    contactInfoText: {
      fontSize: 13,
      color: colors.textSecondary,
    },
  });

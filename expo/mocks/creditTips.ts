import { CreditTip } from '@/types';

export type TipCategory = "repair" | "building" | "management" | "legal" | "business" | "identity";

export const weeklyCredTips: CreditTip[] = [
  {
    id: '1',
    title: 'Check Your Credit Reports Regularly',
    content: 'You are entitled to one free credit report from each of the three major bureaus (Equifax, Experian, TransUnion) annually through AnnualCreditReport.com. Review them for errors that could be dragging down your score.',
    category: 'management',
    publishDate: '2025-01-06',
    isActive: true,
    createdAt: '2025-01-06T00:00:00Z',
  },
  {
    id: '2',
    title: 'Keep Credit Utilization Below 30%',
    content: 'Your credit utilization ratio (how much credit you use vs. your total available credit) significantly impacts your score. Aim to keep it below 30%, and ideally under 10% for the best results.',
    category: 'building',
    publishDate: '2025-01-07',
    isActive: true,
    createdAt: '2025-01-07T00:00:00Z',
  },
  {
    id: '3',
    title: 'Never Close Old Credit Cards',
    content: 'The length of your credit history matters. Closing old accounts can shorten your credit history and increase your utilization ratio. Keep old cards open, even if you rarely use them.',
    category: 'management',
    publishDate: '2025-01-08',
    isActive: true,
    createdAt: '2025-01-08T00:00:00Z',
  },
  {
    id: '4',
    title: 'Dispute Errors Immediately',
    content: 'Under the Fair Credit Reporting Act (FCRA), you have the right to dispute any inaccurate information on your credit report. Credit bureaus must investigate disputes within 30 days.',
    category: 'repair',
    publishDate: '2025-01-09',
    isActive: true,
    createdAt: '2025-01-09T00:00:00Z',
  },
  {
    id: '5',
    title: 'Set Up Payment Reminders',
    content: 'Payment history is the most important factor in your credit score (35%). Set up automatic payments or calendar reminders to ensure you never miss a due date.',
    category: 'management',
    publishDate: '2025-01-10',
    isActive: true,
    createdAt: '2025-01-10T00:00:00Z',
  },
  {
    id: '6',
    title: 'Become an Authorized User',
    content: 'Being added as an authorized user on a family member\'s credit card with a good payment history can help boost your score. Make sure the card issuer reports authorized users to the credit bureaus.',
    category: 'building',
    publishDate: '2025-01-11',
    isActive: true,
    createdAt: '2025-01-11T00:00:00Z',
  },
  {
    id: '7',
    title: 'Know Your Rights Under FDCPA',
    content: 'The Fair Debt Collection Practices Act protects you from abusive debt collection practices. Collectors cannot harass you, call at unreasonable hours, or make false statements about your debt.',
    category: 'legal',
    publishDate: '2025-01-12',
    isActive: true,
    createdAt: '2025-01-12T00:00:00Z',
  },
  {
    id: '8',
    title: 'Prevent Identity Theft with These Strategies',
    content: 'Identity theft is a growing concern in the digital age. Protect yourself by monitoring your accounts regularly, using strong unique passwords, enabling two-factor authentication, and being cautious with personal information online.',
    category: 'identity',
    publishDate: '2025-01-13',
    isActive: true,
    createdAt: '2025-01-13T00:00:00Z',
  },
  {
    id: '9',
    title: 'Five Proven Ways to Prevent Identity Theft',
    content: 'Protect your identity with these five methods: 1) Freeze your credit with all three bureaus, 2) Use two-factor authentication everywhere, 3) Monitor your credit reports weekly, 4) Shred sensitive documents, 5) Be wary of phishing attempts.',
    category: 'identity',
    publishDate: '2025-01-14',
    isActive: true,
    createdAt: '2025-01-14T00:00:00Z',
  },
];

export const getTipOfTheWeek = (): CreditTip => {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const weekNumber = Math.floor((now.getTime() - startOfYear.getTime()) / (7 * 24 * 60 * 60 * 1000));
  const tipIndex = weekNumber % weeklyCredTips.length;
  return weeklyCredTips[tipIndex];
};

export const getCategoryColor = (category: TipCategory): string => {
  switch (category) {
    case 'repair':
      return '#E74C3C';
    case 'building':
      return '#27AE60';
    case 'management':
      return '#3498DB';
    case 'legal':
      return '#F39C12';
    case 'business':
      return '#9B59B6';
    case 'identity':
      return '#E67E22';
    default:
      return '#3498DB';
  }
};

export const getRecentTips = (count: number = 3): CreditTip[] => {
  return weeklyCredTips
    .filter(tip => tip.isActive)
    .sort((a, b) => new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime())
    .slice(0, count);
};

export const getTipById = (id: string): CreditTip | null => {
  return weeklyCredTips.find(tip => tip.id === id) || null;
};

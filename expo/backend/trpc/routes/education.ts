import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../create-context";
import type {
  School,
  Degree,
  Major,
  FinancialAid,
  LoanType,
} from "@/types/education";

const schools: School[] = [
  {
    id: "school_community_1",
    name: "Metro Community College",
    type: "community_college",
    location: "Metro City",
    tuitionCostPerYear: 4500,
    tuitionCostPerCredit: 150,
    reputationScore: 5,
    acceptanceRate: 95,
    minimumGPA: 2.0,
    availableDegrees: ["degree_certificate", "degree_associate"],
    availableMajors: ["major_business_admin", "major_it", "major_healthcare", "major_trades"],
    booksCostPerSemester: 400,
    imageUrl: "https://images.unsplash.com/photo-1562774053-701939374585?w=800",
    description: "Affordable education with flexible schedules for working adults.",
    isOnline: false,
    financialAidAvailable: true,
  },
  {
    id: "school_state_1",
    name: "State University",
    type: "state_university",
    location: "Capital City",
    tuitionCostPerYear: 12000,
    tuitionCostPerCredit: 400,
    reputationScore: 7,
    acceptanceRate: 65,
    minimumGPA: 2.5,
    minimumCreditScore: 600,
    availableDegrees: ["degree_associate", "degree_bachelor", "degree_master"],
    availableMajors: ["major_business_admin", "major_cs", "major_finance", "major_engineering", "major_healthcare"],
    housingCostPerSemester: 4500,
    booksCostPerSemester: 600,
    imageUrl: "https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800",
    description: "Quality public education with diverse programs and research opportunities.",
    isOnline: false,
    financialAidAvailable: true,
  },
  {
    id: "school_private_1",
    name: "Prestige University",
    type: "private_university",
    location: "Highland Park",
    tuitionCostPerYear: 52000,
    tuitionCostPerCredit: 1750,
    reputationScore: 9,
    acceptanceRate: 15,
    minimumGPA: 3.5,
    minimumCreditScore: 700,
    availableDegrees: ["degree_bachelor", "degree_master", "degree_doctorate"],
    availableMajors: ["major_business_admin", "major_cs", "major_finance", "major_engineering", "major_law"],
    housingCostPerSemester: 8000,
    booksCostPerSemester: 800,
    imageUrl: "https://images.unsplash.com/photo-1607237138185-eedd9c632b0b?w=800",
    description: "Elite institution with world-renowned faculty and extensive alumni network.",
    isOnline: false,
    financialAidAvailable: true,
  },
  {
    id: "school_trade_1",
    name: "Technical Trade Institute",
    type: "trade_school",
    location: "Industrial District",
    tuitionCostPerYear: 8000,
    tuitionCostPerCredit: 275,
    reputationScore: 6,
    acceptanceRate: 85,
    minimumGPA: 2.0,
    availableDegrees: ["degree_certificate"],
    availableMajors: ["major_trades", "major_it", "major_healthcare"],
    booksCostPerSemester: 350,
    imageUrl: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800",
    description: "Hands-on training for high-demand skilled trades and certifications.",
    isOnline: false,
    financialAidAvailable: true,
  },
  {
    id: "school_online_1",
    name: "FlexLearn Online University",
    type: "online_university",
    location: "Online",
    tuitionCostPerYear: 7500,
    tuitionCostPerCredit: 250,
    reputationScore: 5,
    acceptanceRate: 90,
    minimumGPA: 2.0,
    availableDegrees: ["degree_certificate", "degree_associate", "degree_bachelor", "degree_master"],
    availableMajors: ["major_business_admin", "major_cs", "major_it", "major_finance"],
    booksCostPerSemester: 300,
    imageUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800",
    description: "Flexible online education that fits your schedule.",
    isOnline: true,
    financialAidAvailable: true,
  },
];

const degrees: Degree[] = [
  {
    id: "degree_certificate",
    name: "Certificate Program",
    type: "certificate",
    durationYears: 0.5,
    creditHoursRequired: 18,
    prerequisites: [],
    description: "Quick professional certification for specific skills.",
    averageSalaryIncrease: 10,
    careerAdvancementBonus: 5,
  },
  {
    id: "degree_associate",
    name: "Associate Degree",
    type: "associate",
    durationYears: 2,
    creditHoursRequired: 60,
    prerequisites: [],
    description: "Two-year degree providing foundational knowledge and skills.",
    averageSalaryIncrease: 20,
    careerAdvancementBonus: 10,
  },
  {
    id: "degree_bachelor",
    name: "Bachelor's Degree",
    type: "bachelor",
    durationYears: 4,
    creditHoursRequired: 120,
    prerequisites: [],
    description: "Four-year undergraduate degree for professional careers.",
    averageSalaryIncrease: 45,
    careerAdvancementBonus: 25,
  },
  {
    id: "degree_master",
    name: "Master's Degree",
    type: "master",
    durationYears: 2,
    creditHoursRequired: 36,
    prerequisites: ["degree_bachelor"],
    description: "Advanced graduate degree for specialized expertise.",
    averageSalaryIncrease: 25,
    careerAdvancementBonus: 35,
  },
  {
    id: "degree_doctorate",
    name: "Doctoral Degree",
    type: "doctorate",
    durationYears: 4,
    creditHoursRequired: 60,
    prerequisites: ["degree_master"],
    description: "Terminal degree for academic and research positions.",
    averageSalaryIncrease: 35,
    careerAdvancementBonus: 50,
  },
];

const majors: Major[] = [
  {
    id: "major_business_admin",
    name: "Business Administration",
    degreeTypeIds: ["associate", "bachelor", "master"],
    careerPaths: [
      { jobTitle: "Business Analyst", tier: "entry", salaryRange: { min: 45000, max: 65000 }, yearsExperienceRequired: 0 },
      { jobTitle: "Operations Manager", tier: "mid", salaryRange: { min: 65000, max: 95000 }, yearsExperienceRequired: 3 },
      { jobTitle: "Director of Operations", tier: "senior", salaryRange: { min: 95000, max: 150000 }, yearsExperienceRequired: 7 },
      { jobTitle: "Chief Operating Officer", tier: "executive", salaryRange: { min: 150000, max: 300000 }, yearsExperienceRequired: 12 },
    ],
    averageStartingSalary: 52000,
    requiredCourses: ["Accounting 101", "Management Principles", "Marketing Fundamentals", "Business Law"],
    electiveCourses: ["Entrepreneurship", "International Business", "Human Resources"],
    specializations: [
      { id: "spec_mgmt", name: "Management", description: "Focus on organizational leadership", additionalCredits: 12, salaryBonus: 8, requiredCourses: ["Leadership", "Org Behavior"] },
      { id: "spec_marketing", name: "Marketing", description: "Focus on market strategy", additionalCredits: 12, salaryBonus: 10, requiredCourses: ["Digital Marketing", "Consumer Behavior"] },
    ],
    description: "Comprehensive business education covering management, marketing, and operations.",
    demandLevel: "high",
    difficultyLevel: "moderate",
  },
  {
    id: "major_cs",
    name: "Computer Science",
    degreeTypeIds: ["bachelor", "master", "doctorate"],
    careerPaths: [
      { jobTitle: "Junior Developer", tier: "entry", salaryRange: { min: 55000, max: 75000 }, yearsExperienceRequired: 0 },
      { jobTitle: "Software Engineer", tier: "mid", salaryRange: { min: 85000, max: 130000 }, yearsExperienceRequired: 2 },
      { jobTitle: "Senior Engineer", tier: "senior", salaryRange: { min: 130000, max: 200000 }, yearsExperienceRequired: 5 },
      { jobTitle: "CTO", tier: "executive", salaryRange: { min: 200000, max: 400000 }, yearsExperienceRequired: 10 },
    ],
    averageStartingSalary: 72000,
    requiredCourses: ["Data Structures", "Algorithms", "Operating Systems", "Database Systems"],
    electiveCourses: ["Machine Learning", "Cybersecurity", "Cloud Computing"],
    specializations: [
      { id: "spec_ai", name: "Artificial Intelligence", description: "Focus on AI and ML", additionalCredits: 15, salaryBonus: 20, requiredCourses: ["Deep Learning", "NLP"] },
      { id: "spec_security", name: "Cybersecurity", description: "Focus on security systems", additionalCredits: 15, salaryBonus: 15, requiredCourses: ["Network Security", "Cryptography"] },
    ],
    description: "Study of computational theory, algorithms, and software development.",
    demandLevel: "very_high",
    difficultyLevel: "challenging",
  },
  {
    id: "major_finance",
    name: "Finance",
    degreeTypeIds: ["bachelor", "master"],
    careerPaths: [
      { jobTitle: "Financial Analyst", tier: "entry", salaryRange: { min: 50000, max: 70000 }, yearsExperienceRequired: 0 },
      { jobTitle: "Senior Financial Analyst", tier: "mid", salaryRange: { min: 75000, max: 110000 }, yearsExperienceRequired: 3 },
      { jobTitle: "Finance Manager", tier: "senior", salaryRange: { min: 110000, max: 160000 }, yearsExperienceRequired: 6 },
      { jobTitle: "CFO", tier: "executive", salaryRange: { min: 180000, max: 350000 }, yearsExperienceRequired: 12 },
    ],
    averageStartingSalary: 58000,
    requiredCourses: ["Financial Accounting", "Corporate Finance", "Investment Analysis", "Financial Markets"],
    electiveCourses: ["Risk Management", "Real Estate Finance", "International Finance"],
    specializations: [
      { id: "spec_invest", name: "Investment Management", description: "Focus on portfolio management", additionalCredits: 12, salaryBonus: 15, requiredCourses: ["Portfolio Theory", "Derivatives"] },
      { id: "spec_fintech", name: "Financial Technology", description: "Focus on fintech innovation", additionalCredits: 12, salaryBonus: 18, requiredCourses: ["Blockchain", "Digital Banking"] },
    ],
    description: "Study of financial systems, investments, and corporate finance.",
    demandLevel: "high",
    difficultyLevel: "challenging",
  },
  {
    id: "major_it",
    name: "Information Technology",
    degreeTypeIds: ["certificate", "associate", "bachelor"],
    careerPaths: [
      { jobTitle: "IT Support Specialist", tier: "entry", salaryRange: { min: 40000, max: 55000 }, yearsExperienceRequired: 0 },
      { jobTitle: "Systems Administrator", tier: "mid", salaryRange: { min: 60000, max: 85000 }, yearsExperienceRequired: 2 },
      { jobTitle: "IT Manager", tier: "senior", salaryRange: { min: 90000, max: 130000 }, yearsExperienceRequired: 5 },
      { jobTitle: "IT Director", tier: "executive", salaryRange: { min: 130000, max: 200000 }, yearsExperienceRequired: 10 },
    ],
    averageStartingSalary: 48000,
    requiredCourses: ["Networking Fundamentals", "System Administration", "IT Security Basics"],
    electiveCourses: ["Cloud Services", "Help Desk Management", "IT Project Management"],
    specializations: [
      { id: "spec_cloud", name: "Cloud Computing", description: "Focus on cloud infrastructure", additionalCredits: 9, salaryBonus: 12, requiredCourses: ["AWS/Azure", "Cloud Architecture"] },
    ],
    description: "Practical technology skills for IT infrastructure and support roles.",
    demandLevel: "high",
    difficultyLevel: "moderate",
  },
  {
    id: "major_healthcare",
    name: "Healthcare Administration",
    degreeTypeIds: ["certificate", "associate", "bachelor", "master"],
    careerPaths: [
      { jobTitle: "Medical Office Assistant", tier: "entry", salaryRange: { min: 35000, max: 45000 }, yearsExperienceRequired: 0 },
      { jobTitle: "Healthcare Coordinator", tier: "mid", salaryRange: { min: 50000, max: 70000 }, yearsExperienceRequired: 2 },
      { jobTitle: "Healthcare Administrator", tier: "senior", salaryRange: { min: 80000, max: 120000 }, yearsExperienceRequired: 5 },
      { jobTitle: "Hospital CEO", tier: "executive", salaryRange: { min: 150000, max: 300000 }, yearsExperienceRequired: 12 },
    ],
    averageStartingSalary: 42000,
    requiredCourses: ["Healthcare Systems", "Medical Terminology", "Healthcare Finance", "Health Law"],
    electiveCourses: ["Public Health", "Healthcare Technology", "Quality Improvement"],
    specializations: [],
    description: "Management and administration of healthcare organizations.",
    demandLevel: "very_high",
    difficultyLevel: "moderate",
  },
  {
    id: "major_engineering",
    name: "Engineering",
    degreeTypeIds: ["bachelor", "master", "doctorate"],
    careerPaths: [
      { jobTitle: "Junior Engineer", tier: "entry", salaryRange: { min: 60000, max: 75000 }, yearsExperienceRequired: 0 },
      { jobTitle: "Engineer", tier: "mid", salaryRange: { min: 80000, max: 110000 }, yearsExperienceRequired: 3 },
      { jobTitle: "Senior Engineer", tier: "senior", salaryRange: { min: 120000, max: 170000 }, yearsExperienceRequired: 7 },
      { jobTitle: "VP of Engineering", tier: "executive", salaryRange: { min: 180000, max: 300000 }, yearsExperienceRequired: 12 },
    ],
    averageStartingSalary: 68000,
    requiredCourses: ["Calculus", "Physics", "Engineering Mechanics", "Materials Science"],
    electiveCourses: ["Robotics", "Sustainable Engineering", "Project Management"],
    specializations: [
      { id: "spec_civil", name: "Civil Engineering", description: "Infrastructure and construction", additionalCredits: 18, salaryBonus: 10, requiredCourses: ["Structural Analysis", "Geotechnical"] },
      { id: "spec_mech", name: "Mechanical Engineering", description: "Mechanical systems design", additionalCredits: 18, salaryBonus: 12, requiredCourses: ["Thermodynamics", "Machine Design"] },
    ],
    description: "Application of science and math to solve real-world problems.",
    demandLevel: "high",
    difficultyLevel: "very_challenging",
  },
  {
    id: "major_trades",
    name: "Skilled Trades",
    degreeTypeIds: ["certificate"],
    careerPaths: [
      { jobTitle: "Apprentice", tier: "entry", salaryRange: { min: 30000, max: 40000 }, yearsExperienceRequired: 0 },
      { jobTitle: "Journeyman", tier: "mid", salaryRange: { min: 50000, max: 75000 }, yearsExperienceRequired: 2 },
      { jobTitle: "Master Tradesperson", tier: "senior", salaryRange: { min: 75000, max: 100000 }, yearsExperienceRequired: 5 },
      { jobTitle: "Contractor/Business Owner", tier: "executive", salaryRange: { min: 100000, max: 200000 }, yearsExperienceRequired: 8 },
    ],
    averageStartingSalary: 38000,
    requiredCourses: ["Safety Training", "Blueprint Reading", "Tools & Equipment"],
    electiveCourses: ["Business Basics", "Estimating", "Customer Service"],
    specializations: [
      { id: "spec_elec", name: "Electrical", description: "Electrical systems installation", additionalCredits: 6, salaryBonus: 15, requiredCourses: ["Electrical Code", "Wiring"] },
      { id: "spec_plumb", name: "Plumbing", description: "Plumbing systems", additionalCredits: 6, salaryBonus: 12, requiredCourses: ["Plumbing Code", "Pipe Fitting"] },
      { id: "spec_hvac", name: "HVAC", description: "Heating and cooling systems", additionalCredits: 6, salaryBonus: 14, requiredCourses: ["Refrigeration", "HVAC Systems"] },
    ],
    description: "Hands-on training for high-demand skilled trade careers.",
    demandLevel: "very_high",
    difficultyLevel: "moderate",
  },
  {
    id: "major_law",
    name: "Pre-Law / Legal Studies",
    degreeTypeIds: ["bachelor", "master", "doctorate"],
    careerPaths: [
      { jobTitle: "Paralegal", tier: "entry", salaryRange: { min: 45000, max: 60000 }, yearsExperienceRequired: 0 },
      { jobTitle: "Associate Attorney", tier: "mid", salaryRange: { min: 80000, max: 130000 }, yearsExperienceRequired: 3 },
      { jobTitle: "Senior Attorney", tier: "senior", salaryRange: { min: 140000, max: 250000 }, yearsExperienceRequired: 7 },
      { jobTitle: "Partner/General Counsel", tier: "executive", salaryRange: { min: 250000, max: 500000 }, yearsExperienceRequired: 12 },
    ],
    averageStartingSalary: 55000,
    requiredCourses: ["Constitutional Law", "Legal Writing", "Civil Procedure", "Contracts"],
    electiveCourses: ["Corporate Law", "Criminal Law", "Intellectual Property"],
    specializations: [],
    description: "Foundation for law school and legal careers.",
    demandLevel: "medium",
    difficultyLevel: "challenging",
  },
];

const availableScholarships: Omit<FinancialAid, "id" | "playerId" | "studentEducationId" | "status" | "applicationDate" | "approvalDate" | "disbursementDate">[] = [
  {
    aidType: "scholarship",
    name: "Academic Excellence Scholarship",
    amount: 10000,
    amountPerSemester: 5000,
    description: "Awarded to students with outstanding academic achievement.",
    requirements: [
      { type: "gpa", description: "Maintain 3.5 GPA or higher", value: 3.5, isMet: false },
      { type: "enrollment", description: "Full-time enrollment required", isMet: false },
    ],
    isRenewable: true,
    renewalRequirements: "Maintain 3.5 GPA each semester",
    minimumGPARequired: 3.5,
  },
  {
    aidType: "grant",
    name: "Need-Based Federal Grant",
    amount: 6500,
    amountPerSemester: 3250,
    description: "Federal grant for students demonstrating financial need.",
    requirements: [
      { type: "income", description: "Household income under $50,000", value: 50000, isMet: false },
      { type: "enrollment", description: "At least half-time enrollment", isMet: false },
    ],
    isRenewable: true,
    renewalRequirements: "Maintain satisfactory academic progress",
    minimumGPARequired: 2.0,
  },
  {
    aidType: "scholarship",
    name: "STEM Excellence Award",
    amount: 15000,
    amountPerSemester: 7500,
    description: "For students pursuing STEM degrees with exceptional promise.",
    requirements: [
      { type: "major", description: "Must be enrolled in a STEM major", isMet: false },
      { type: "gpa", description: "Maintain 3.3 GPA or higher", value: 3.3, isMet: false },
    ],
    isRenewable: true,
    renewalRequirements: "Maintain 3.3 GPA and STEM major",
    minimumGPARequired: 3.3,
  },
  {
    aidType: "work_study",
    name: "Campus Work-Study Program",
    amount: 4000,
    amountPerSemester: 2000,
    description: "Part-time campus employment for eligible students.",
    requirements: [
      { type: "enrollment", description: "Full-time enrollment required", isMet: false },
      { type: "community_service", description: "10 hours/week campus work", isMet: false },
    ],
    isRenewable: true,
    renewalRequirements: "Maintain enrollment and work requirements",
    minimumGPARequired: 2.0,
  },
  {
    aidType: "scholarship",
    name: "First Generation College Student Grant",
    amount: 5000,
    amountPerSemester: 2500,
    description: "Supporting first-generation college students.",
    requirements: [
      { type: "essay", description: "Submit personal statement", isMet: false },
      { type: "enrollment", description: "Full-time enrollment required", isMet: false },
    ],
    isRenewable: true,
    renewalRequirements: "Maintain 2.5 GPA",
    minimumGPARequired: 2.5,
  },
];

export const educationRouter = createTRPCRouter({
  getSchools: publicProcedure
    .input(z.object({
      type: z.enum(["community_college", "state_university", "private_university", "trade_school", "online_university"]).optional(),
      minReputationScore: z.number().optional(),
      maxTuition: z.number().optional(),
    }).optional())
    .query(async ({ input }) => {
      let filteredSchools = [...schools];
      
      if (input?.type) {
        filteredSchools = filteredSchools.filter(s => s.type === input.type);
      }
      if (input?.minReputationScore) {
        filteredSchools = filteredSchools.filter(s => s.reputationScore >= input.minReputationScore!);
      }
      if (input?.maxTuition) {
        filteredSchools = filteredSchools.filter(s => s.tuitionCostPerYear <= input.maxTuition!);
      }
      
      return filteredSchools;
    }),

  getSchoolById: publicProcedure
    .input(z.object({ schoolId: z.string() }))
    .query(async ({ input }) => {
      const school = schools.find(s => s.id === input.schoolId);
      if (!school) {
        throw new Error("School not found");
      }
      return school;
    }),

  getDegrees: publicProcedure
    .input(z.object({
      type: z.enum(["certificate", "associate", "bachelor", "master", "doctorate"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      if (input?.type) {
        return degrees.filter(d => d.type === input.type);
      }
      return degrees;
    }),

  getMajors: publicProcedure
    .input(z.object({
      degreeType: z.enum(["certificate", "associate", "bachelor", "master", "doctorate"]).optional(),
      demandLevel: z.enum(["low", "medium", "high", "very_high"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      let filteredMajors = [...majors];
      
      if (input?.degreeType) {
        filteredMajors = filteredMajors.filter(m => m.degreeTypeIds.includes(input.degreeType!));
      }
      if (input?.demandLevel) {
        filteredMajors = filteredMajors.filter(m => m.demandLevel === input.demandLevel);
      }
      
      return filteredMajors;
    }),

  getMajorById: publicProcedure
    .input(z.object({ majorId: z.string() }))
    .query(async ({ input }) => {
      const major = majors.find(m => m.id === input.majorId);
      if (!major) {
        throw new Error("Major not found");
      }
      return major;
    }),

  getAvailableFinancialAid: publicProcedure
    .input(z.object({
      aidType: z.enum(["grant", "scholarship", "work_study", "fellowship"]).optional(),
    }).optional())
    .query(async ({ input }) => {
      if (input?.aidType) {
        return availableScholarships.filter(a => a.aidType === input.aidType);
      }
      return availableScholarships;
    }),

  calculateTuitionCost: publicProcedure
    .input(z.object({
      schoolId: z.string(),
      degreeId: z.string(),
      isFullTime: z.boolean(),
      isOnCampus: z.boolean(),
    }))
    .query(async ({ input }) => {
      const school = schools.find(s => s.id === input.schoolId);
      const degree = degrees.find(d => d.id === input.degreeId);
      
      if (!school || !degree) {
        throw new Error("School or degree not found");
      }
      
      const totalSemesters = degree.durationYears * 2;
      const creditsPerSemester = Math.ceil(degree.creditHoursRequired / totalSemesters);
      
      const tuitionPerSemester = school.tuitionCostPerCredit * creditsPerSemester;
      const housingPerSemester = input.isOnCampus && school.housingCostPerSemester ? school.housingCostPerSemester : 0;
      const booksPerSemester = school.booksCostPerSemester;
      
      const totalPerSemester = tuitionPerSemester + housingPerSemester + booksPerSemester;
      const totalCost = totalPerSemester * totalSemesters;
      
      return {
        tuitionPerSemester,
        housingPerSemester,
        booksPerSemester,
        totalPerSemester,
        totalSemesters,
        totalCost,
        creditsPerSemester,
        degreeCredits: degree.creditHoursRequired,
      };
    }),

  getLoanOptions: publicProcedure
    .input(z.object({
      amount: z.number(),
      creditScore: z.number(),
    }))
    .query(async ({ input }) => {
      const loanOptions = [];
      
      loanOptions.push({
        loanType: "federal_subsidized" as LoanType,
        lenderName: "Federal Direct Loans",
        maxAmount: Math.min(input.amount, 5500),
        interestRate: 5.5,
        termMonths: 120,
        isSubsidized: true,
        description: "Interest does not accrue while in school",
        requirements: "FAFSA required, demonstrated financial need",
      });
      
      loanOptions.push({
        loanType: "federal_unsubsidized" as LoanType,
        lenderName: "Federal Direct Loans",
        maxAmount: Math.min(input.amount, 20500),
        interestRate: 6.5,
        termMonths: 120,
        isSubsidized: false,
        description: "Available regardless of financial need",
        requirements: "FAFSA required",
      });
      
      if (input.creditScore >= 650) {
        loanOptions.push({
          loanType: "private" as LoanType,
          lenderName: "Private Student Lenders",
          maxAmount: input.amount,
          interestRate: input.creditScore >= 750 ? 7.5 : input.creditScore >= 700 ? 9.0 : 11.0,
          termMonths: 180,
          isSubsidized: false,
          description: "Private loan with variable rates based on credit",
          requirements: `Credit score 650+ required (yours: ${input.creditScore})`,
        });
      }
      
      return loanOptions;
    }),

  getCareerPathsForMajor: publicProcedure
    .input(z.object({ majorId: z.string() }))
    .query(async ({ input }) => {
      const major = majors.find(m => m.id === input.majorId);
      if (!major) {
        throw new Error("Major not found");
      }
      return major.careerPaths;
    }),

  getEducationStats: publicProcedure.query(async () => {
    return {
      totalStudentsEnrolled: 15420,
      averageStudentDebt: 32500,
      graduationRate: 68,
      averageGPA: 3.12,
      mostPopularMajor: "Business Administration",
      mostPopularSchool: "State University",
      averageTimeToGraduation: 4.5,
    };
  }),

  checkEligibility: publicProcedure
    .input(z.object({
      schoolId: z.string(),
      gpa: z.number(),
      creditScore: z.number().optional(),
    }))
    .query(async ({ input }) => {
      const school = schools.find(s => s.id === input.schoolId);
      if (!school) {
        throw new Error("School not found");
      }
      
      const issues: string[] = [];
      let isEligible = true;
      
      if (input.gpa < school.minimumGPA) {
        issues.push(`GPA ${input.gpa.toFixed(2)} is below minimum requirement of ${school.minimumGPA.toFixed(2)}`);
        isEligible = false;
      }
      
      if (school.minimumCreditScore && input.creditScore) {
        if (input.creditScore < school.minimumCreditScore) {
          issues.push(`Credit score ${input.creditScore} is below minimum requirement of ${school.minimumCreditScore}`);
          isEligible = false;
        }
      }
      
      const acceptanceChance = isEligible 
        ? Math.min(95, school.acceptanceRate + (input.gpa - school.minimumGPA) * 10)
        : 0;
      
      return {
        isEligible,
        issues,
        acceptanceChance: Math.round(acceptanceChance),
        school,
      };
    }),
});

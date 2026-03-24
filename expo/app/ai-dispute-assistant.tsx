import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  FileText,
  Printer,
  Eye,
  PieChart,
  Download,
  Copy,
  CloudUpload,
  CheckCircle2,
} from "lucide-react-native";
import * as Clipboard from 'expo-clipboard';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import Colors from "@/constants/colors";
import CreditReportParser, { ParsedAccount } from "@/components/CreditReportParser";
import { useDisputes } from "@/contexts/DisputesContext";
import { useUser } from "@/contexts/UserContext";

const DARK_LOGO_URL = "https://static.wixstatic.com/media/ec0146_ce8d0d3506564ee1841686216fee5650~mv2.png";

interface NegativeAccount {
  id: number;
  name: string;
  accountNumber: string;
  status: string;
  negativeType: string;
  address?: string;
  phone?: string;
  selected?: boolean;
  recommendation?: string;
  answers?: Record<string, string>;
  bureau?: string;
}

interface Dispute {
  id: number;
  creditor: string;
  accountNumber: string;
  disputeType: string;
  dateSent: string;
  status: "sent" | "in-progress" | "resolved" | "rejected";
  lastUpdated: string;
  responseBy: string;
  timeline: { date: string; action: string; note?: string }[];
  letterContent?: string;
}



const QUESTIONS = [
  { id: "disputeType", title: "Are you disputing Original Creditor or Debt Collector?", options: [
    { value: "originalCreditorOpen", label: "Original Creditor (Open Account)" },
    { value: "originalCreditorClosed", label: "Original Creditor (Closed Account)" },
    { value: "debtCollector", label: "Debt Collector" },
  ]},
  { id: "step1", title: "Did you dispute with the Credit Reporting Agency Online?", options: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ]},
  { id: "step2", title: "Did you send a certified mail dispute to the information furnisher?", options: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ]},
  { id: "step3", title: "Did you send an Intent to sue letter to the information furnisher?", options: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ]},
  { id: "step4", title: "Did you request the method of verification from the Credit Reporting Agency?", options: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ]},
  { id: "step5", title: "Did you send 609 Letter to the Credit Reporting Agency demanding removal?", options: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ]},
  { id: "step6", title: "Did you try advanced dispute method for the Credit Reporting Agency?", options: [
    { value: "yes", label: "Yes" },
    { value: "no", label: "No" },
  ]},
];

export default function AIDisputeAssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { createDispute } = useDisputes();
  const { user } = useUser();

  const [currentStep, setCurrentStep] = useState(1);
  const [detectedBureau, setDetectedBureau] = useState<string>("auto");
  const [negativeAccounts, setNegativeAccounts] = useState<NegativeAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<NegativeAccount[]>([]);
  const [currentAccountIndex, setCurrentAccountIndex] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [isParserLoading, setIsParserLoading] = useState(false);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [expandedLetter, setExpandedLetter] = useState<number | null>(null);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);
  const [savedToCloud, setSavedToCloud] = useState(false);
  const [manualAccount, setManualAccount] = useState({
    name: "",
    accountNumber: "",
    status: "",
    negativeType: "Collection Account",
    address: "",
    phone: "",
    bureau: "auto",
  });

  const [formData, setFormData] = useState({
    fullName: "",
    phoneNumber: "",
    address: "",
    cityStateZip: "",
    certifiedMailNumber: "",
  });
  const [viewingLetter, setViewingLetter] = useState<Dispute | null>(null);

  const handleAccountsParsed = useCallback((accounts: ParsedAccount[], bureau: string) => {
    console.log("Parsed accounts:", accounts.length, "from bureau:", bureau);
    setDetectedBureau(bureau);
    
    if (accounts.length === 0) {
      Alert.alert(
        "No Negative Accounts Found",
        "No potentially negative accounts were found in your credit report. You can add accounts manually if needed.",
        [
          {
            text: "Add Manually",
            onPress: () => {
              setShowManualEntry(true);
              setCurrentStep(2);
            },
          },
          { text: "OK", style: "cancel" },
        ]
      );
      return;
    }

    const newAccounts: NegativeAccount[] = accounts.map((acc, index) => ({
      id: Date.now() + index,
      name: acc.creditor.toUpperCase(),
      accountNumber: acc.accountNumber,
      status: acc.status,
      negativeType: acc.negativeType || "Derogatory Status",
      selected: false,
      bureau: bureau,
    }));

    setNegativeAccounts(newAccounts);
    setCurrentStep(2);
    
    Alert.alert(
      "Parsing Complete",
      `Found ${accounts.length} potentially negative account(s) from your ${bureau.charAt(0).toUpperCase() + bureau.slice(1)} report.`
    );
  }, []);

  const handleParserError = useCallback((error: string) => {
    console.error("Parser error:", error);
    Alert.alert(
      "Parsing Error",
      `There was an error parsing your credit report: ${error}. You can try again or add accounts manually.`,
      [
        {
          text: "Add Manually",
          onPress: () => {
            setShowManualEntry(true);
            setCurrentStep(2);
          },
        },
        { text: "OK", style: "cancel" },
      ]
    );
  }, []);

  const handleParserLoading = useCallback((loading: boolean) => {
    setIsParserLoading(loading);
  }, []);

  const handleAddManualAccount = useCallback(() => {
    if (!manualAccount.name || !manualAccount.accountNumber || !manualAccount.status) {
      Alert.alert("Required Fields", "Please fill in Account Name, Account Number, and Status.");
      return;
    }

    const newAccount: NegativeAccount = {
      id: Date.now(),
      name: manualAccount.name.toUpperCase(),
      accountNumber: manualAccount.accountNumber,
      status: manualAccount.status,
      negativeType: manualAccount.negativeType,
      address: manualAccount.address || undefined,
      phone: manualAccount.phone || undefined,
      selected: false,
      bureau: manualAccount.bureau || detectedBureau,
    };

    setNegativeAccounts(prev => [...prev, newAccount]);
    setManualAccount({
      name: "",
      accountNumber: "",
      status: "",
      negativeType: "Collection Account",
      address: "",
      phone: "",
      bureau: "auto",
    });
    setShowManualEntry(false);
  }, [manualAccount, detectedBureau]);

  const toggleAccountSelection = useCallback((id: number) => {
    setNegativeAccounts(prev => 
      prev.map(acc => acc.id === id ? { ...acc, selected: !acc.selected } : acc)
    );
  }, []);

  const selectAllAccounts = useCallback(() => {
    const allSelected = negativeAccounts.every(acc => acc.selected);
    setNegativeAccounts(prev => prev.map(acc => ({ ...acc, selected: !allSelected })));
  }, [negativeAccounts]);

  const proceedToQuestions = useCallback(() => {
    const selected = negativeAccounts.filter(acc => acc.selected);
    if (selected.length === 0) {
      Alert.alert("Selection Required", "Please select at least one account to dispute.");
      return;
    }
    setSelectedAccounts(selected.map(acc => ({ ...acc, answers: {}, recommendation: undefined })));
    setCurrentAccountIndex(0);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setRecommendation(null);
    setCurrentStep(3);
  }, [negativeAccounts]);

  const getRecommendation = useCallback((accountAnswers: Record<string, string>): string => {
    const disputeType = accountAnswers["disputeType"];

    if (accountAnswers["step1"] === "no") return "Online Disputes";
    
    if (accountAnswers["step2"] === "no") {
      if (disputeType === "originalCreditorClosed") return "623 Letter";
      if (disputeType === "originalCreditorOpen") return "Open Account Dispute";
      if (disputeType === "debtCollector") return "809 Letter";
    }
    
    if (accountAnswers["step3"] === "no") {
      if (disputeType === "originalCreditorOpen" || disputeType === "originalCreditorClosed") return "Intent to Sue Creditor";
      if (disputeType === "debtCollector") return "Intent to Sue Debt Collector";
    }
    
    if (accountAnswers["step4"] === "no") return "611 Letter";
    if (accountAnswers["step5"] === "no") return "609 Letter";
    if (accountAnswers["step6"] === "no") return "Hand Written Dispute Letter";
    
    return "Legal Action";
  }, []);

  const handleAnswerSelect = useCallback((questionId: string, value: string) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);

    let shouldShowRecommendation = false;
    let rec = "";

    if (questionId === "step1" && value === "no") {
      rec = "Online Disputes";
      shouldShowRecommendation = true;
    } else if (questionId === "step2" && value === "no") {
      rec = getRecommendation(newAnswers);
      shouldShowRecommendation = true;
    } else if (questionId === "step3" && value === "no") {
      rec = getRecommendation(newAnswers);
      shouldShowRecommendation = true;
    } else if (questionId === "step4" && value === "no") {
      rec = "611 Letter";
      shouldShowRecommendation = true;
    } else if (questionId === "step5" && value === "no") {
      rec = "609 Letter";
      shouldShowRecommendation = true;
    } else if (questionId === "step6") {
      rec = value === "no" ? "Hand Written Dispute Letter" : "Legal Action";
      shouldShowRecommendation = true;
    }

    if (shouldShowRecommendation) {
      setRecommendation(rec);
      setSelectedAccounts(prev => {
        const updated = [...prev];
        updated[currentAccountIndex] = {
          ...updated[currentAccountIndex],
          answers: newAnswers,
          recommendation: rec,
        };
        return updated;
      });
    } else {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  }, [answers, currentAccountIndex, getRecommendation]);

  const proceedToNextAccount = useCallback(() => {
    if (currentAccountIndex < selectedAccounts.length - 1) {
      setCurrentAccountIndex(prev => prev + 1);
      setCurrentQuestionIndex(0);
      setAnswers({});
      setRecommendation(null);
    } else {
      setCurrentStep(4);
    }
  }, [currentAccountIndex, selectedAccounts.length]);

  const generateLetterContent = useCallback((account: NegativeAccount): string => {
    const currentDate = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const rec = account.recommendation || "";

    let letterBody = "";
    switch (rec) {
      case "623 Letter":
        letterBody = `This letter is a formal request under the Fair Credit Reporting Act, Section 623, regarding the above-referenced account.\n\nI am disputing the accuracy of the information you are reporting to the credit bureaus. After reviewing my credit report, I have found that this account contains inaccurate information.\n\nAs required by federal law, I am requesting that you conduct an investigation and provide me with:\n\n1. All documentation relating to the account\n2. Verification that you have reviewed all relevant information\n3. Confirmation that you have reported the results to all credit bureaus\n\nIf you cannot verify this information, I demand immediate deletion from all three credit bureaus.`;
        break;
      case "809 Letter":
        letterBody = `I am writing in response to your claim regarding the above-referenced account. I do not believe I owe this debt.\n\nUnder the Fair Debt Collection Practices Act (FDCPA), Section 809(b), I am requesting validation of the debt:\n\n1. The amount of the debt\n2. The name of the original creditor\n3. Proof that you are licensed to collect debts in my state\n4. A copy of the original signed loan agreement\n\nPlease cease all collection activities until you have provided the requested validation.`;
        break;
      case "Intent to Sue Creditor":
      case "Intent to Sue Debt Collector":
        letterBody = `RE: NOTICE OF INTENT TO FILE LAWSUIT\n\nThis letter serves as my final attempt to resolve the dispute regarding the above-referenced account before I pursue legal action.\n\nDespite my previous efforts, you have failed to properly investigate and correct the inaccurate information. Your failure to comply with the Fair Credit Reporting Act constitutes willful noncompliance.\n\nI am prepared to file a lawsuit in 15 days if this matter is not resolved. To avoid litigation, you must:\n\n1. Conduct a proper investigation\n2. Remove all inaccurate information from my credit reports\n3. Provide written confirmation of the corrections`;
        break;
      case "611 Letter":
        letterBody = `RE: Request for Method of Verification Under FCRA Section 611\n\nI recently disputed inaccurate information on my credit report. You have responded claiming the information was "verified."\n\nPursuant to FCRA Section 611(a)(7), I am requesting:\n\n1. The name, address, and telephone number of each source contacted\n2. Copies of all documents used in your verification\n3. A detailed explanation of the verification method\n4. The name of the person who conducted the reinvestigation`;
        break;
      case "609 Letter":
        letterBody = `RE: Request for Documentation Under FCRA Section 609\n\nI am requesting copies of all documentation related to the above-referenced account:\n\n1. Any documents bearing my signature\n2. The name and address of the original creditor\n3. Documentation showing proper verification procedures\n4. Proof of your legal right to report this account\n\nIf you cannot provide these documents, you must remove this account immediately.`;
        break;
      case "Hand Written Dispute Letter":
        letterBody = `I am writing to dispute inaccurate information on my credit report regarding the above-referenced account.\n\nAccount: ${account.name}\nAccount Number: ${account.accountNumber}\nReported Status: ${account.status}\n\nUnder the Fair Credit Reporting Act, you are required to investigate this dispute and correct any inaccurate or unverifiable information.\n\nPlease conduct a thorough investigation and provide me with an updated credit report showing the corrections.`;
        break;
      default:
        letterBody = `I am writing to dispute the above-referenced account on my credit report. Please investigate and correct any inaccurate information.`;
    }

    return `${formData.fullName}\n${formData.address}\n${formData.cityStateZip}\n${formData.phoneNumber ? `Phone: ${formData.phoneNumber}` : ""}\n\n${currentDate}\n\n${account.name}\n${account.address || "[Creditor Address]"}\n\n${formData.certifiedMailNumber ? `CERTIFIED MAIL #: ${formData.certifiedMailNumber}\n\n` : ""}RE: Account #${account.accountNumber}\n\nTo Whom It May Concern:\n\n${letterBody}\n\nSincerely,\n\n${formData.fullName}`;
  }, [formData]);

  const saveDisputesToCloud = useCallback(async (disputesToSave: Dispute[]) => {
    if (!user?.id) {
      console.log("No user logged in, skipping cloud save");
      return;
    }

    setIsSavingToCloud(true);
    let savedCount = 0;

    for (const dispute of disputesToSave) {
      try {
        const account = selectedAccounts.find(a => a.name === dispute.creditor);
        await createDispute({
          creditor: dispute.creditor,
          accountNumber: dispute.accountNumber,
          disputeType: dispute.disputeType,
          dateSent: dispute.dateSent,
          status: dispute.status,
          responseBy: dispute.responseBy,
          letterContent: dispute.letterContent,
          notes: `${dispute.disputeType} letter generated via AI Dispute Assistant. Bureau: ${account?.bureau || detectedBureau || 'Unknown'}`,
        });
        savedCount++;
        console.log(`Saved dispute for ${dispute.creditor} to cloud`);
      } catch (error) {
        console.error(`Error saving dispute for ${dispute.creditor}:`, error);
      }
    }

    setIsSavingToCloud(false);
    setSavedToCloud(true);

    if (savedCount > 0) {
      Alert.alert(
        "Saved to Cloud",
        `${savedCount} dispute(s) have been automatically saved to your Cloud Dispute Tracker. You can view and manage them from the Dispute Tracker screen.`,
        [{ text: "OK" }]
      );
    }
  }, [user?.id, createDispute, selectedAccounts, detectedBureau]);

  const generateAllLetters = useCallback(async () => {
    if (!formData.fullName || !formData.address || !formData.cityStateZip) {
      Alert.alert("Required Fields", "Please fill in your name, address, and city/state/zip.");
      return;
    }

    const today = new Date();
    const responseDate = new Date();
    responseDate.setDate(today.getDate() + 30);

    const newDisputes: Dispute[] = selectedAccounts.map((account, index) => ({
      id: Date.now() + index,
      creditor: account.name,
      accountNumber: account.accountNumber,
      disputeType: account.recommendation || "General Dispute",
      dateSent: today.toISOString().split("T")[0],
      status: "sent" as const,
      lastUpdated: today.toISOString().split("T")[0],
      responseBy: responseDate.toISOString().split("T")[0],
      timeline: [{ date: today.toISOString().split("T")[0], action: "Letter generated", note: `${account.recommendation} letter created` }],
      letterContent: generateLetterContent(account),
    }));

    setDisputes(newDisputes);
    setCurrentStep(5);

    // Auto-save to cloud tracker
    if (user?.id) {
      await saveDisputesToCloud(newDisputes);
    }
  }, [formData, selectedAccounts, generateLetterContent, user?.id, saveDisputesToCloud]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "sent": return Colors.primary;
      case "in-progress": return Colors.warning;
      case "resolved": return Colors.success;
      case "rejected": return Colors.error;
      default: return Colors.textLight;
    }
  };

  const handlePrintLetter = useCallback((dispute: Dispute) => {
    if (Platform.OS === "web") {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`
          <html>
          <head>
            <title>${dispute.disputeType} Letter for ${dispute.creditor}</title>
            <style>
              body { font-family: 'Courier New', monospace; line-height: 1.6; padding: 40px; white-space: pre-wrap; }
            </style>
          </head>
          <body>${dispute.letterContent?.replace(/\n/g, "<br>")}</body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 300);
      }
    } else {
      Alert.alert(
        "Print Letter",
        "To print this letter, please use the Download or Share option to save the letter, then print from your device.",
        [{ text: "OK" }]
      );
    }
  }, []);

  const handleViewLetter = useCallback((dispute: Dispute) => {
    setViewingLetter(dispute);
  }, []);

  const handleDownloadLetter = useCallback(async (dispute: Dispute) => {
    const content = dispute.letterContent || "";
    const fileName = `${dispute.disputeType.replace(/\s+/g, "_")}_${dispute.creditor.replace(/\s+/g, "_")}.txt`;

    if (Platform.OS === "web") {
      const blob = new Blob([content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Alert.alert("Success", "Letter downloaded successfully!");
    } else {
      try {
        const fileUri = FileSystem.documentDirectory + fileName;
        await FileSystem.writeAsStringAsync(fileUri, content, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "text/plain",
            dialogTitle: "Save Dispute Letter",
          });
        } else {
          Alert.alert("Success", `Letter saved to: ${fileUri}`);
        }
      } catch (error) {
        console.error("Error saving letter:", error);
        Alert.alert("Error", "Failed to save letter. Please try copying to clipboard instead.");
      }
    }
  }, []);

  const handleCopyLetter = useCallback(async (dispute: Dispute) => {
    try {
      await Clipboard.setStringAsync(dispute.letterContent || "");
      Alert.alert("Copied!", "Letter content copied to clipboard.");
    } catch (error) {
      console.error("Error copying to clipboard:", error);
      Alert.alert("Error", "Failed to copy letter to clipboard.");
    }
  }, []);

  const handlePrintAllLetters = useCallback(() => {
    if (disputes.length === 0) {
      Alert.alert("No Letters", "No dispute letters to print.");
      return;
    }

    if (Platform.OS === "web") {
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        let content = "";
        disputes.forEach((dispute, index) => {
          content += `
            <div style="page-break-after: ${index < disputes.length - 1 ? "always" : "auto"};">
              <h2>${dispute.disputeType} Letter for ${dispute.creditor}</h2>
              <div style="white-space: pre-wrap;">${dispute.letterContent?.replace(/\n/g, "<br>")}</div>
            </div>
          `;
        });
        
        printWindow.document.write(`
          <html>
          <head>
            <title>Dispute Letters</title>
            <style>
              body { font-family: 'Courier New', monospace; line-height: 1.6; padding: 40px; }
              h2 { color: #1a4b84; margin-bottom: 20px; }
            </style>
          </head>
          <body>${content}</body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 500);
      }
    } else {
      Alert.alert(
        "Print All Letters",
        "To print all letters, please download them individually using the Download button on each letter, then print from your device.",
        [{ text: "OK" }]
      );
    }
  }, [disputes]);

  const handleDownloadAllLetters = useCallback(async () => {
    if (disputes.length === 0) {
      Alert.alert("No Letters", "No dispute letters to download.");
      return;
    }

    if (Platform.OS === "web") {
      let allContent = "";
      disputes.forEach((dispute, index) => {
        allContent += `\n\n${"-".repeat(60)}\n${dispute.disputeType} LETTER FOR ${dispute.creditor}\n${"-".repeat(60)}\n\n`;
        allContent += dispute.letterContent || "";
        if (index < disputes.length - 1) {
          allContent += "\n\n";
        }
      });

      const blob = new Blob([allContent], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "All_Dispute_Letters.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      Alert.alert("Success", "All letters downloaded successfully!");
    } else {
      try {
        let allContent = "";
        disputes.forEach((dispute, index) => {
          allContent += `\n\n${"-".repeat(60)}\n${dispute.disputeType} LETTER FOR ${dispute.creditor}\n${"-".repeat(60)}\n\n`;
          allContent += dispute.letterContent || "";
          if (index < disputes.length - 1) {
            allContent += "\n\n";
          }
        });

        const fileUri = FileSystem.documentDirectory + "All_Dispute_Letters.txt";
        await FileSystem.writeAsStringAsync(fileUri, allContent, {
          encoding: FileSystem.EncodingType.UTF8,
        });

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, {
            mimeType: "text/plain",
            dialogTitle: "Save All Dispute Letters",
          });
        } else {
          Alert.alert("Success", `All letters saved to: ${fileUri}`);
        }
      } catch (error) {
        console.error("Error saving all letters:", error);
        Alert.alert("Error", "Failed to save letters.");
      }
    }
  }, [disputes]);

  const getRecommendationDescription = (rec: string): string => {
    const descriptions: Record<string, string> = {
      "Online Disputes": "We recommend you first dispute with the Credit Reporting Agency online. This is the quickest way to start the dispute process.",
      "623 Letter": "We recommend sending a 623 Letter to the original creditor requesting verification and correction of inaccurate information.",
      "Open Account Dispute": "We recommend sending an Open Account Dispute letter challenging the accuracy of the information for your open account.",
      "809 Letter": "We recommend sending an 809 Letter to the debt collector requesting validation of the debt within 30 days.",
      "Intent to Sue Creditor": "We recommend sending an Intent to Sue letter informing them of your intention to take legal action.",
      "Intent to Sue Debt Collector": "We recommend sending an Intent to Sue letter to the debt collector.",
      "611 Letter": "We recommend sending a 611 Letter to request the method of verification from the Credit Reporting Agency.",
      "609 Letter": "We recommend sending a 609 Letter demanding removal and requesting all verification documents.",
      "Hand Written Dispute Letter": "We recommend trying an advanced dispute method with a hand-written letter.",
      "Legal Action": "You have exhausted all standard dispute options. Consider consulting with a consumer law attorney.",
    };
    return descriptions[rec] || "";
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3, 4, 5].map((step, index) => (
        <React.Fragment key={step}>
          <View style={styles.stepItem}>
            <View style={[
              styles.stepCircle,
              currentStep >= step && styles.stepCircleActive,
              currentStep > step && styles.stepCircleCompleted,
            ]}>
              {currentStep > step ? (
                <CheckCircle color={Colors.surface} size={16} />
              ) : (
                <Text style={[styles.stepNumber, currentStep >= step && styles.stepNumberActive]}>{step}</Text>
              )}
            </View>
            <Text style={[styles.stepLabel, currentStep >= step && styles.stepLabelActive]}>
              {["Upload", "Select", "Questions", "Generate", "Track"][index]}
            </Text>
          </View>
          {index < 4 && <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />}
        </React.Fragment>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.headerCard}>
        <Image
          source={{ uri: DARK_LOGO_URL }}
          style={styles.logo}
          resizeMode="contain"
        />
        <Text style={styles.headerTitle}>AI Dispute Assistant</Text>
        <Text style={styles.headerSubtitle}>Find and dispute negative accounts on your credit report</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Upload & Parse Credit Report</Text>
        <Text style={styles.cardSubtitle}>
          Select your credit bureau and upload your PDF credit report. Our AI will automatically extract negative accounts.
        </Text>

        <View style={styles.parserContainer}>
          <CreditReportParser
            onAccountsParsed={handleAccountsParsed}
            onError={handleParserError}
            onLoadingChange={handleParserLoading}
          />
        </View>

        {isParserLoading && (
          <View style={styles.loadingOverlay}>
            <View style={styles.loadingContainer}>
              <View style={styles.loadingSpinner} />
              <Text style={styles.loadingText}>Processing credit report...</Text>
            </View>
          </View>
        )}

        <View style={styles.manualEntryPrompt}>
          <Text style={styles.manualEntryText}>No PDF file? </Text>
          <TouchableOpacity onPress={() => { setShowManualEntry(true); setCurrentStep(2); }}>
            <Text style={styles.manualEntryLink}>Add accounts manually</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      {showManualEntry ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Add Account Manually</Text>
          <Text style={styles.cardSubtitle}>Enter the details of the negative account you want to dispute.</Text>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Account/Creditor Name *</Text>
            <TextInput
              style={styles.input}
              value={manualAccount.name}
              onChangeText={(text) => setManualAccount(prev => ({ ...prev, name: text }))}
              placeholder="e.g., Capital One"
              placeholderTextColor={Colors.textLight}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Account Number *</Text>
            <TextInput
              style={styles.input}
              value={manualAccount.accountNumber}
              onChangeText={(text) => setManualAccount(prev => ({ ...prev, accountNumber: text }))}
              placeholder="e.g., XXXX-XXXX-1234"
              placeholderTextColor={Colors.textLight}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Account Status *</Text>
            <TextInput
              style={styles.input}
              value={manualAccount.status}
              onChangeText={(text) => setManualAccount(prev => ({ ...prev, status: text }))}
              placeholder="e.g., Collection account, Charge-off"
              placeholderTextColor={Colors.textLight}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Type of Negative Item</Text>
            <View style={styles.negativeTypeSelector}>
              {["Collection Account", "Charge-off", "Late Payments", "Derogatory Status"].map((type) => (
                <TouchableOpacity
                  key={type}
                  style={[styles.negativeTypeButton, manualAccount.negativeType === type && styles.negativeTypeButtonActive]}
                  onPress={() => setManualAccount(prev => ({ ...prev, negativeType: type }))}
                >
                  <Text style={[styles.negativeTypeText, manualAccount.negativeType === type && styles.negativeTypeTextActive]}>
                    {type}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Creditor Address (optional)</Text>
            <TextInput
              style={styles.input}
              value={manualAccount.address}
              onChangeText={(text) => setManualAccount(prev => ({ ...prev, address: text }))}
              placeholder="Street, City, State ZIP"
              placeholderTextColor={Colors.textLight}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone Number (optional)</Text>
            <TextInput
              style={styles.input}
              value={manualAccount.phone}
              onChangeText={(text) => setManualAccount(prev => ({ ...prev, phone: text }))}
              placeholder="(800) 555-5555"
              placeholderTextColor={Colors.textLight}
              keyboardType="phone-pad"
            />
          </View>

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setShowManualEntry(false)}>
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.primaryButton} onPress={handleAddManualAccount}>
              <Text style={styles.primaryButtonText}>Add Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Select Accounts to Dispute</Text>
          <Text style={styles.cardSubtitle}>
            {negativeAccounts.length > 0
              ? `You have ${negativeAccounts.length} account(s). Select the ones you want to dispute.`
              : "No accounts added yet. Add accounts manually to get started."}
          </Text>

          <TouchableOpacity 
            style={[styles.primaryButton, { marginBottom: 16 }]} 
            onPress={() => setShowManualEntry(true)}
          >
            <Text style={styles.primaryButtonText}>+ Add Account Manually</Text>
          </TouchableOpacity>

          {negativeAccounts.length > 0 && (
            <>
              <TouchableOpacity style={styles.selectAllRow} onPress={selectAllAccounts}>
                <View style={[styles.checkbox, negativeAccounts.every(acc => acc.selected) && styles.checkboxChecked]}>
                  {negativeAccounts.every(acc => acc.selected) && <CheckCircle color={Colors.surface} size={14} />}
                </View>
                <Text style={styles.selectAllText}>Select All</Text>
              </TouchableOpacity>

              <ScrollView style={styles.accountsList} showsVerticalScrollIndicator={false}>
                {negativeAccounts.map((account) => (
                  <TouchableOpacity
                    key={account.id}
                    style={[styles.accountItem, account.selected && styles.accountItemSelected]}
                    onPress={() => toggleAccountSelection(account.id)}
                  >
                    <View style={[styles.checkbox, account.selected && styles.checkboxChecked]}>
                      {account.selected && <CheckCircle color={Colors.surface} size={14} />}
                    </View>
                    <View style={styles.accountInfo}>
                      <Text style={styles.accountName}>{account.name}</Text>
                      <Text style={styles.accountNumber}>{account.accountNumber}</Text>
                      <View style={styles.accountStatusRow}>
                        <View style={[styles.statusBadge, { backgroundColor: Colors.error + "20" }]}>
                          <Text style={[styles.statusBadgeText, { color: Colors.error }]}>{account.negativeType}</Text>
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentStep(1)}>
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.primaryButton, negativeAccounts.filter(a => a.selected).length === 0 && styles.buttonDisabled]} 
              onPress={proceedToQuestions}
              disabled={negativeAccounts.filter(a => a.selected).length === 0}
            >
              <Text style={styles.primaryButtonText}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );

  const renderStep3 = () => {
    const currentAccount = selectedAccounts[currentAccountIndex];
    const currentQuestion = QUESTIONS[currentQuestionIndex];

    return (
      <View style={styles.stepContent}>
        <View style={styles.card}>
          <View style={styles.accountSummary}>
            <Text style={styles.accountSummaryTitle}>{currentAccount?.name}</Text>
            <Text style={styles.accountSummaryDetail}>Account: {currentAccount?.accountNumber}</Text>
            <Text style={styles.accountSummaryDetail}>Status: {currentAccount?.status}</Text>
            <Text style={styles.accountSummaryDetail}>
              Account {currentAccountIndex + 1} of {selectedAccounts.length}
            </Text>
          </View>

          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${((currentQuestionIndex + 1) / QUESTIONS.length) * 100}%` }]} />
          </View>

          {recommendation ? (
            <View style={styles.recommendationCard}>
              <Text style={styles.recommendationTitle}>Recommendation</Text>
              <View style={styles.recommendationBadge}>
                <Text style={styles.recommendationBadgeText}>{recommendation}</Text>
              </View>
              <Text style={styles.recommendationDescription}>
                {getRecommendationDescription(recommendation)}
              </Text>
              <TouchableOpacity style={styles.primaryButton} onPress={proceedToNextAccount}>
                <Text style={styles.primaryButtonText}>
                  {currentAccountIndex < selectedAccounts.length - 1 ? "Next Account" : "Generate Letters"}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.questionTitle}>
                <Text style={styles.questionNumber}>{currentQuestionIndex + 1}. </Text>
                {currentQuestion?.title}
              </Text>
              <View style={styles.optionsContainer}>
                {currentQuestion?.options.map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.optionButton,
                      answers[currentQuestion.id] === option.value && styles.optionButtonSelected,
                    ]}
                    onPress={() => handleAnswerSelect(currentQuestion.id, option.value)}
                  >
                    <View style={[
                      styles.radioCircle,
                      answers[currentQuestion.id] === option.value && styles.radioCircleSelected,
                    ]}>
                      {answers[currentQuestion.id] === option.value && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[
                      styles.optionText,
                      answers[currentQuestion.id] === option.value && styles.optionTextSelected,
                    ]}>
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => {
                if (currentQuestionIndex > 0) {
                  setCurrentQuestionIndex(prev => prev - 1);
                  setRecommendation(null);
                } else if (currentAccountIndex > 0) {
                  setCurrentAccountIndex(prev => prev - 1);
                  setCurrentQuestionIndex(QUESTIONS.length - 1);
                  setRecommendation(null);
                } else {
                  setCurrentStep(2);
                }
              }}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderStep4 = () => (
    <View style={styles.stepContent}>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Generate Dispute Letters</Text>
        <Text style={styles.cardSubtitle}>Complete your information to generate personalized dispute letters</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Your Full Name *</Text>
          <TextInput
            style={styles.input}
            value={formData.fullName}
            onChangeText={(text) => setFormData(prev => ({ ...prev, fullName: text }))}
            placeholder="Enter your full name"
            placeholderTextColor={Colors.textLight}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Phone Number</Text>
          <TextInput
            style={styles.input}
            value={formData.phoneNumber}
            onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
            placeholder="(555) 555-5555"
            placeholderTextColor={Colors.textLight}
            keyboardType="phone-pad"
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Your Address *</Text>
          <TextInput
            style={styles.input}
            value={formData.address}
            onChangeText={(text) => setFormData(prev => ({ ...prev, address: text }))}
            placeholder="Street address"
            placeholderTextColor={Colors.textLight}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>City, State ZIP *</Text>
          <TextInput
            style={styles.input}
            value={formData.cityStateZip}
            onChangeText={(text) => setFormData(prev => ({ ...prev, cityStateZip: text }))}
            placeholder="City, State 12345"
            placeholderTextColor={Colors.textLight}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Certified Mail Number (optional)</Text>
          <TextInput
            style={styles.input}
            value={formData.certifiedMailNumber}
            onChangeText={(text) => setFormData(prev => ({ ...prev, certifiedMailNumber: text }))}
            placeholder="Enter certified mail number"
            placeholderTextColor={Colors.textLight}
          />
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentStep(3)}>
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.primaryButton} onPress={generateAllLetters}>
            <Text style={styles.primaryButtonText}>Generate Letters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderStep5 = () => (
    <View style={styles.stepContent}>
      {viewingLetter && (
        <View style={styles.fullLetterModal}>
          <View style={styles.fullLetterContainer}>
            <View style={styles.fullLetterHeader}>
              <Text style={styles.fullLetterTitle}>{viewingLetter.disputeType}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setViewingLetter(null)}
              >
                <Text style={styles.closeButtonText}>×</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.fullLetterCreditor}>{viewingLetter.creditor}</Text>
            <ScrollView style={styles.fullLetterScroll} showsVerticalScrollIndicator={true}>
              <Text style={styles.fullLetterText}>{viewingLetter.letterContent}</Text>
            </ScrollView>
            <View style={styles.fullLetterActions}>
              <TouchableOpacity
                style={styles.fullLetterActionButton}
                onPress={() => handleCopyLetter(viewingLetter)}
              >
                <Copy color={Colors.primary} size={18} />
                <Text style={styles.letterActionText}>Copy</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fullLetterActionButton}
                onPress={() => handleDownloadLetter(viewingLetter)}
              >
                <Download color={Colors.primary} size={18} />
                <Text style={styles.letterActionText}>Download</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.fullLetterActionButton}
                onPress={() => handlePrintLetter(viewingLetter)}
              >
                <Printer color={Colors.primary} size={18} />
                <Text style={styles.letterActionText}>Print</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      <View style={styles.analyticsCard}>
        <View style={styles.analyticsHeader}>
          <PieChart color={Colors.primary} size={24} />
          <Text style={styles.analyticsTitle}>Dispute Analytics</Text>
        </View>
        <View style={styles.analyticsGrid}>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsValue}>{disputes.length}</Text>
            <Text style={styles.analyticsLabel}>Total Disputes</Text>
          </View>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsValue}>
              {disputes.filter(d => d.status === "resolved").length}
            </Text>
            <Text style={styles.analyticsLabel}>Resolved</Text>
          </View>
          <View style={styles.analyticsItem}>
            <Text style={styles.analyticsValue}>
              {disputes.filter(d => d.status === "sent" || d.status === "in-progress").length}
            </Text>
            <Text style={styles.analyticsLabel}>Pending</Text>
          </View>
        </View>
        
        {/* Cloud Sync Status */}
        {user?.id && (
          <View style={styles.cloudSyncStatus}>
            {isSavingToCloud ? (
              <View style={styles.cloudSyncRow}>
                <CloudUpload color={Colors.primary} size={18} />
                <Text style={styles.cloudSyncText}>Saving to Cloud Tracker...</Text>
              </View>
            ) : savedToCloud ? (
              <View style={styles.cloudSyncRow}>
                <CheckCircle2 color={Colors.success} size={18} />
                <Text style={[styles.cloudSyncText, { color: Colors.success }]}>Saved to Cloud Dispute Tracker</Text>
              </View>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Generated Letters</Text>
        
        <ScrollView style={styles.lettersList} showsVerticalScrollIndicator={false}>
          {disputes.map((dispute, index) => (
            <View key={dispute.id} style={styles.letterItem}>
              <TouchableOpacity
                style={styles.letterHeader}
                onPress={() => setExpandedLetter(expandedLetter === index ? null : index)}
              >
                <View style={styles.letterHeaderLeft}>
                  <FileText color={Colors.primary} size={20} />
                  <View style={styles.letterInfo}>
                    <Text style={styles.letterTitle}>{dispute.creditor}</Text>
                    <Text style={styles.letterType}>{dispute.disputeType}</Text>
                  </View>
                </View>
                <View style={styles.letterHeaderRight}>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(dispute.status) + "20" }]}>
                    <Text style={[styles.statusBadgeText, { color: getStatusColor(dispute.status) }]}>
                      {dispute.status.charAt(0).toUpperCase() + dispute.status.slice(1)}
                    </Text>
                  </View>
                  {expandedLetter === index ? (
                    <ChevronUp color={Colors.textLight} size={20} />
                  ) : (
                    <ChevronDown color={Colors.textLight} size={20} />
                  )}
                </View>
              </TouchableOpacity>
              
              {expandedLetter === index && (
                <View style={styles.letterContent}>
                  <ScrollView style={styles.letterPreview} nestedScrollEnabled={true}>
                    <Text style={styles.letterPreviewText}>{dispute.letterContent}</Text>
                  </ScrollView>
                  <View style={styles.letterActions}>
                    <TouchableOpacity
                      style={styles.letterActionButton}
                      onPress={() => handleViewLetter(dispute)}
                    >
                      <Eye color={Colors.primary} size={18} />
                      <Text style={styles.letterActionText}>View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.letterActionButton}
                      onPress={() => handleDownloadLetter(dispute)}
                    >
                      <Download color={Colors.primary} size={18} />
                      <Text style={styles.letterActionText}>Download</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.letterActionButton}
                      onPress={() => handlePrintLetter(dispute)}
                    >
                      <Printer color={Colors.primary} size={18} />
                      <Text style={styles.letterActionText}>Print</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.letterActionButton}
                      onPress={() => handleCopyLetter(dispute)}
                    >
                      <Copy color={Colors.primary} size={18} />
                      <Text style={styles.letterActionText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          ))}
        </ScrollView>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => setCurrentStep(4)}>
            <Text style={styles.secondaryButtonText}>Edit Info</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, { flex: 0.5 }]}
            onPress={handleDownloadAllLetters}
          >
            <Download color={Colors.surface} size={18} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.primaryButton, { flex: 0.5 }]}
            onPress={handlePrintAllLetters}
          >
            <Printer color={Colors.surface} size={18} />
          </TouchableOpacity>
        </View>

        {/* View Cloud Tracker Button */}
        <TouchableOpacity
          style={styles.viewTrackerButton}
          onPress={() => router.push("/dispute-tracker" as any)}
        >
          <CloudUpload color={Colors.surface} size={20} />
          <Text style={styles.viewTrackerButtonText}>View Cloud Dispute Tracker</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      case 5: return renderStep5();
      default: return renderStep1();
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <ArrowLeft color={Colors.text} size={24} />
          </TouchableOpacity>
          <Text style={styles.headerText}>AI Dispute Assistant</Text>
          <View style={styles.placeholder} />
        </View>

        <ScrollView 
          style={styles.scrollContent} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: insets.bottom + 20 }}
        >
          {renderStepIndicator()}
          {renderCurrentStep()}
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surface,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  placeholder: {
    width: 40,
  },
  scrollContent: {
    flex: 1,
  },
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  stepItem: {
    alignItems: "center",
  },
  stepCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  stepCircleActive: {
    backgroundColor: Colors.primary,
  },
  stepCircleCompleted: {
    backgroundColor: Colors.success,
  },
  stepNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.textLight,
  },
  stepNumberActive: {
    color: Colors.surface,
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.textLight,
  },
  stepLabelActive: {
    color: Colors.primary,
  },
  stepLine: {
    width: 30,
    height: 2,
    backgroundColor: Colors.border,
    marginHorizontal: 4,
    marginBottom: 20,
  },
  stepLineActive: {
    backgroundColor: Colors.success,
  },
  stepContent: {
    paddingHorizontal: 20,
  },
  headerCard: {
    backgroundColor: Colors.primary,
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    marginBottom: 20,
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: Colors.surface,
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: Colors.surface + "CC",
    textAlign: "center",
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  cardSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  bureauSelector: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  bureauButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceAlt,
    alignItems: "center",
  },
  bureauButtonActive: {
    backgroundColor: Colors.primary,
  },
  bureauButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  bureauButtonTextActive: {
    color: Colors.surface,
  },
  parserContainer: {
    minHeight: 450,
    marginBottom: 16,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: Colors.surfaceAlt,
  },
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255,255,255,0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  manualEntryPrompt: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
  },
  manualEntryText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  manualEntryLink: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.primary,
  },
  loadingContainer: {
    alignItems: "center",
    padding: 20,
  },
  loadingSpinner: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 4,
    borderColor: Colors.border,
    borderTopColor: Colors.primary,
    marginBottom: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  primaryButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.surface,
  },
  secondaryButton: {
    backgroundColor: Colors.surfaceAlt,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    flex: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  selectAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
    paddingVertical: 8,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  selectAllText: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  accountsList: {
    maxHeight: 400,
  },
  accountItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    marginBottom: 10,
    gap: 12,
  },
  accountItemSelected: {
    backgroundColor: Colors.primary + "10",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  accountInfo: {
    flex: 1,
  },
  accountName: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  accountNumber: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  accountStatusRow: {
    flexDirection: "row",
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  accountSummary: {
    backgroundColor: Colors.primary + "10",
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  accountSummaryTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 8,
  },
  accountSummaryDetail: {
    fontSize: 13,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 3,
    overflow: "hidden",
    marginBottom: 24,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.primary,
    borderRadius: 3,
  },
  questionTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 20,
    lineHeight: 24,
  },
  questionNumber: {
    color: Colors.primary,
    fontWeight: "700",
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 14,
  },
  optionButtonSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + "10",
  },
  radioCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  radioCircleSelected: {
    borderColor: Colors.primary,
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.primary,
  },
  optionText: {
    fontSize: 15,
    color: Colors.text,
    flex: 1,
  },
  optionTextSelected: {
    fontWeight: "600",
  },
  recommendationCard: {
    backgroundColor: Colors.secondary + "10",
    padding: 20,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
  },
  recommendationTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.secondary,
    marginBottom: 12,
    textTransform: "uppercase",
  },
  recommendationBadge: {
    backgroundColor: Colors.secondary,
    alignSelf: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  recommendationBadgeText: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.surface,
  },
  recommendationDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    lineHeight: 22,
    marginBottom: 20,
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  analyticsCard: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
  },
  analyticsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  analyticsTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
  },
  analyticsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  analyticsItem: {
    flex: 1,
    backgroundColor: Colors.primary + "10",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  analyticsValue: {
    fontSize: 28,
    fontWeight: "800",
    color: Colors.primary,
    marginBottom: 4,
  },
  analyticsLabel: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: "center",
  },
  lettersList: {
    maxHeight: 500,
  },
  letterItem: {
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    marginBottom: 12,
    overflow: "hidden",
  },
  letterHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  letterHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  letterInfo: {
    flex: 1,
  },
  letterTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 2,
  },
  letterType: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  letterHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  letterContent: {
    padding: 16,
    paddingTop: 0,
  },
  letterPreview: {
    backgroundColor: Colors.surface,
    borderRadius: 8,
    padding: 16,
    maxHeight: 200,
    marginBottom: 12,
  },
  letterPreviewText: {
    fontSize: 12,
    color: Colors.text,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    lineHeight: 18,
  },
  letterActions: {
    flexDirection: "row",
    gap: 12,
  },
  letterActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.primary + "10",
    borderRadius: 8,
    flex: 1,
    justifyContent: "center",
  },
  letterActionText: {
    fontSize: 13,
    fontWeight: "600",
    color: Colors.primary,
  },
  fullLetterModal: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  fullLetterContainer: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    width: "100%",
    maxHeight: "90%",
    padding: 20,
  },
  fullLetterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  fullLetterTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  closeButtonText: {
    fontSize: 24,
    color: Colors.textLight,
    lineHeight: 26,
  },
  fullLetterCreditor: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 16,
  },
  fullLetterScroll: {
    maxHeight: 400,
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  fullLetterText: {
    fontSize: 13,
    color: Colors.text,
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    lineHeight: 20,
  },
  fullLetterActions: {
    flexDirection: "row",
    gap: 10,
  },
  fullLetterActionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary + "10",
    borderRadius: 8,
    flex: 1,
  },
  negativeTypeSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  negativeTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  negativeTypeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  negativeTypeText: {
    fontSize: 13,
    fontWeight: "500",
    color: Colors.text,
  },
  negativeTypeTextActive: {
    color: Colors.surface,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  cloudSyncStatus: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  cloudSyncRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cloudSyncText: {
    fontSize: 14,
    fontWeight: "500",
    color: Colors.primary,
  },
  viewTrackerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: Colors.secondary,
    paddingVertical: 16,
    borderRadius: 12,
    marginTop: 12,
  },
  viewTrackerButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.surface,
  },
});

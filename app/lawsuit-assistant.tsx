import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Pressable,
} from "react-native";
import { useRouter, Stack } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Scale,
  ChevronRight,
  CheckCircle,
  AlertTriangle,
  Info,
  Building2,
  CreditCard,
  Phone,
  ChevronDown,
} from "lucide-react-native";
import Colors from "@/constants/colors";

type ViolationType = "credit-reporting" | "creditor" | "debt-collector" | null;
type Section = "intro" | "location" | "violation-type" | "cra-violations" | "creditor-violations" | "collector-violations" | "details" | "results";

interface ViolationCheckbox {
  id: string;
  label: string;
  checked: boolean;
}

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
  { value: "DC", label: "District of Columbia" },
];

export default function LawsuitAssistantScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [currentSection, setCurrentSection] = useState<Section>("intro");
  const [selectedState, setSelectedState] = useState("");
  const [county, setCounty] = useState("");
  const [violationType, setViolationType] = useState<ViolationType>(null);
  const [companyName, setCompanyName] = useState("");
  const [violationDate, setViolationDate] = useState("");
  const [disputeAttempts, setDisputeAttempts] = useState("");
  const [caseDescription, setCaseDescription] = useState("");
  const [evidence, setEvidence] = useState("");
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [showDisputePicker, setShowDisputePicker] = useState(false);

  const [craViolations, setCraViolations] = useState<ViolationCheckbox[]>([
    { id: "inaccurate", label: "Reporting inaccurate information", checked: false },
    { id: "investigation", label: "Failure to properly investigate disputes", checked: false },
    { id: "reinsertion", label: "Reinsertion of previously deleted information without notice", checked: false },
    { id: "disclosure", label: "Improper disclosure of credit information", checked: false },
    { id: "notice", label: "Failure to provide required notices", checked: false },
  ]);

  const [creditorViolations, setCreditorViolations] = useState<ViolationCheckbox[]>([
    { id: "reporting", label: "Reporting inaccurate information to credit bureaus", checked: false },
    { id: "investigation", label: "Failure to investigate disputed information", checked: false },
    { id: "adverse-action", label: "Failure to provide adverse action notice", checked: false },
    { id: "discrimination", label: "Discriminatory lending practices", checked: false },
    { id: "disclosure", label: "Failure to provide required disclosures", checked: false },
  ]);

  const [collectorViolations, setCollectorViolations] = useState<ViolationCheckbox[]>([
    { id: "harassment", label: "Harassment or abusive conduct", checked: false },
    { id: "false-representation", label: "False or misleading representations", checked: false },
    { id: "unfair-practices", label: "Unfair practices", checked: false },
    { id: "validation", label: "Failure to provide debt validation", checked: false },
    { id: "cease", label: "Continuing collection efforts after receiving cease communication request", checked: false },
  ]);

  const [otherViolation, setOtherViolation] = useState("");

  const toggleViolation = useCallback((type: "cra" | "creditor" | "collector", id: string) => {
    if (type === "cra") {
      setCraViolations(prev => prev.map(v => v.id === id ? { ...v, checked: !v.checked } : v));
    } else if (type === "creditor") {
      setCreditorViolations(prev => prev.map(v => v.id === id ? { ...v, checked: !v.checked } : v));
    } else {
      setCollectorViolations(prev => prev.map(v => v.id === id ? { ...v, checked: !v.checked } : v));
    }
  }, []);

  const getSelectedViolations = useCallback(() => {
    let violations: string[] = [];
    if (violationType === "credit-reporting") {
      violations = craViolations.filter(v => v.checked).map(v => v.label);
    } else if (violationType === "creditor") {
      violations = creditorViolations.filter(v => v.checked).map(v => v.label);
    } else if (violationType === "debt-collector") {
      violations = collectorViolations.filter(v => v.checked).map(v => v.label);
    }
    if (otherViolation.trim()) {
      violations.push(`Other: ${otherViolation}`);
    }
    return violations;
  }, [violationType, craViolations, creditorViolations, collectorViolations, otherViolation]);

  const getViolationTypeText = () => {
    if (violationType === "credit-reporting") return "Credit Reporting Agency Violation";
    if (violationType === "creditor") return "Creditor Violation";
    if (violationType === "debt-collector") return "Debt Collector Violation";
    return "";
  };

  const getDefendantType = () => {
    if (violationType === "credit-reporting") return "credit reporting agency";
    if (violationType === "creditor") return "creditor";
    if (violationType === "debt-collector") return "debt collector";
    return "company";
  };

  const navigateToSection = useCallback((section: Section) => {
    console.log('Navigating to section:', section);
    setCurrentSection(section);
  }, []);

  const selectViolationType = useCallback((type: ViolationType) => {
    console.log('Selecting violation type:', type);
    setViolationType(type);
    if (type === "credit-reporting") {
      setCurrentSection("cra-violations");
    } else if (type === "creditor") {
      setCurrentSection("creditor-violations");
    } else if (type === "debt-collector") {
      setCurrentSection("collector-violations");
    }
  }, []);

  const backToViolationSection = useCallback(() => {
    console.log('Going back to violation section, type:', violationType);
    if (violationType === "credit-reporting") {
      setCurrentSection("cra-violations");
    } else if (violationType === "creditor") {
      setCurrentSection("creditor-violations");
    } else if (violationType === "debt-collector") {
      setCurrentSection("collector-violations");
    }
  }, [violationType]);

  const validateAndGenerateGuide = useCallback(() => {
    console.log('Validating and generating guide');
    if (!companyName.trim()) {
      Alert.alert("Required Field", "Please enter the company name");
      return;
    }
    if (!violationDate.trim()) {
      Alert.alert("Required Field", "Please enter the violation date");
      return;
    }
    if (!caseDescription.trim()) {
      Alert.alert("Required Field", "Please describe what happened");
      return;
    }
    console.log('Validation passed, navigating to results');
    setCurrentSection("results");
  }, [companyName, violationDate, caseDescription]);

  const renderIntroSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Welcome to the Credit Reporting Violation Lawsuit Assistant</Text>
      <Text style={styles.sectionText}>
        This tool will guide you through the process of preparing a lawsuit against a credit reporting agency, creditor, or debt collector for potential violations of consumer protection laws.
      </Text>
      <Text style={styles.sectionText}>
        We&apos;ll help you identify potential violations, understand your rights, and prepare the necessary documentation for filing a lawsuit in your jurisdiction.
      </Text>

      <View style={styles.infoBox}>
        <Info color={Colors.primary} size={20} />
        <Text style={styles.infoBoxText}>
          Before proceeding: Make sure you have gathered all relevant documentation related to your case, including credit reports, correspondence with the companies involved, and any evidence of the alleged violations.
        </Text>
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.getStartedButton,
          pressed && styles.buttonPressed
        ]}
        onPress={() => {
          console.log('Get Started button pressed');
          setCurrentSection("location");
        }}
        testID="get-started-button"
      >
        <Text style={styles.primaryButtonText}>Get Started</Text>
        <ChevronRight color={Colors.surface} size={20} />
      </Pressable>
    </View>
  );

  const renderLocationSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Your Location</Text>
      <Text style={styles.sectionText}>
        To provide you with jurisdiction-specific information, we need to know where you&apos;re located.
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>State</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowStatePicker(!showStatePicker)}
        >
          <Text style={[styles.pickerButtonText, !selectedState && styles.placeholderText]}>
            {selectedState ? US_STATES.find(s => s.value === selectedState)?.label : "Select your state"}
          </Text>
          <ChevronDown color={Colors.textSecondary} size={20} />
        </TouchableOpacity>
        {showStatePicker && (
          <ScrollView style={styles.pickerList} nestedScrollEnabled>
            {US_STATES.map((state) => (
              <TouchableOpacity
                key={state.value}
                style={[styles.pickerItem, selectedState === state.value && styles.pickerItemSelected]}
                onPress={() => {
                  setSelectedState(state.value);
                  setShowStatePicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, selectedState === state.value && styles.pickerItemTextSelected]}>
                  {state.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>County</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your county"
          placeholderTextColor={Colors.textLight}
          value={county}
          onChangeText={setCounty}
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            console.log('Back button pressed - going to intro');
            navigateToSection("intro");
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            console.log('Next button pressed - going to violation-type');
            navigateToSection("violation-type");
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.primaryButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderViolationTypeSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Type of Violation</Text>
      <Text style={styles.sectionText}>
        Select the type of entity that committed the alleged violation:
      </Text>

      <TouchableOpacity
        style={styles.violationOption}
        onPress={() => {
          console.log('Credit Reporting option pressed');
          selectViolationType("credit-reporting");
        }}
        activeOpacity={0.7}
      >
        <View style={styles.violationOptionIcon}>
          <Building2 color={Colors.primary} size={24} />
        </View>
        <View style={styles.violationOptionContent}>
          <Text style={styles.violationOptionTitle}>Credit Reporting Agency</Text>
          <Text style={styles.violationOptionSubtitle}>Equifax, Experian, TransUnion</Text>
          <Text style={styles.violationOptionDesc}>
            Common violations include inaccurate reporting, failure to investigate disputes, or improper disclosure.
          </Text>
        </View>
        <ChevronRight color={Colors.textLight} size={20} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.violationOption}
        onPress={() => {
          console.log('Creditor option pressed');
          selectViolationType("creditor");
        }}
        activeOpacity={0.7}
      >
        <View style={styles.violationOptionIcon}>
          <CreditCard color={Colors.primary} size={24} />
        </View>
        <View style={styles.violationOptionContent}>
          <Text style={styles.violationOptionTitle}>Creditor</Text>
          <Text style={styles.violationOptionSubtitle}>Banks, credit card companies, loan providers</Text>
          <Text style={styles.violationOptionDesc}>
            Common violations include reporting inaccurate information, improper credit denial, or failure to provide notices.
          </Text>
        </View>
        <ChevronRight color={Colors.textLight} size={20} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.violationOption}
        onPress={() => {
          console.log('Debt Collector option pressed');
          selectViolationType("debt-collector");
        }}
        activeOpacity={0.7}
      >
        <View style={styles.violationOptionIcon}>
          <Phone color={Colors.primary} size={24} />
        </View>
        <View style={styles.violationOptionContent}>
          <Text style={styles.violationOptionTitle}>Debt Collector</Text>
          <Text style={styles.violationOptionSubtitle}>Collection agencies, debt buyers, attorneys</Text>
          <Text style={styles.violationOptionDesc}>
            Common violations include harassment, false representations, unfair practices, or attempting to collect debts not owed.
          </Text>
        </View>
        <ChevronRight color={Colors.textLight} size={20} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.secondaryButton}
        onPress={() => {
          console.log('Back button pressed - going to location');
          navigateToSection("location");
        }}
        activeOpacity={0.7}
      >
        <Text style={styles.secondaryButtonText}>Back</Text>
      </TouchableOpacity>
    </View>
  );

  const renderViolationsCheckboxes = (
    violations: ViolationCheckbox[],
    type: "cra" | "creditor" | "collector",
    title: string
  ) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>
        Select the specific violation(s) that apply to your situation:
      </Text>

      {violations.map((violation) => (
        <TouchableOpacity
          key={violation.id}
          style={styles.checkboxRow}
          onPress={() => toggleViolation(type, violation.id)}
        >
          <View style={[styles.checkbox, violation.checked && styles.checkboxChecked]}>
            {violation.checked && <CheckCircle color={Colors.surface} size={16} />}
          </View>
          <Text style={styles.checkboxLabel}>{violation.label}</Text>
        </TouchableOpacity>
      ))}

      <View style={styles.formGroup}>
        <Text style={styles.label}>Other Violation (Optional)</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Please describe the violation"
          placeholderTextColor={Colors.textLight}
          value={otherViolation}
          onChangeText={setOtherViolation}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            console.log('Back button pressed - going to violation-type');
            navigateToSection("violation-type");
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            console.log('Next button pressed - going to details');
            navigateToSection("details");
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.primaryButtonText}>Next</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderDetailsSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Case Details</Text>
      <Text style={styles.sectionText}>
        Please provide more information about your situation:
      </Text>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Company Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="Name of the company that committed the violation"
          placeholderTextColor={Colors.textLight}
          value={companyName}
          onChangeText={setCompanyName}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>When did the violation occur? *</Text>
        <TextInput
          style={styles.input}
          placeholder="MM/DD/YYYY or approximate date"
          placeholderTextColor={Colors.textLight}
          value={violationDate}
          onChangeText={setViolationDate}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Have you attempted to resolve this issue?</Text>
        <TouchableOpacity
          style={styles.pickerButton}
          onPress={() => setShowDisputePicker(!showDisputePicker)}
        >
          <Text style={[styles.pickerButtonText, !disputeAttempts && styles.placeholderText]}>
            {disputeAttempts === "yes-writing" ? "Yes, in writing" :
             disputeAttempts === "yes-phone" ? "Yes, by phone only" :
             disputeAttempts === "no" ? "No, I have not attempted to resolve this" :
             "Select an option"}
          </Text>
          <ChevronDown color={Colors.textSecondary} size={20} />
        </TouchableOpacity>
        {showDisputePicker && (
          <View style={styles.pickerListSmall}>
            {[
              { value: "yes-writing", label: "Yes, in writing" },
              { value: "yes-phone", label: "Yes, by phone only" },
              { value: "no", label: "No, I have not attempted to resolve this" },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[styles.pickerItem, disputeAttempts === option.value && styles.pickerItemSelected]}
                onPress={() => {
                  setDisputeAttempts(option.value);
                  setShowDisputePicker(false);
                }}
              >
                <Text style={[styles.pickerItemText, disputeAttempts === option.value && styles.pickerItemTextSelected]}>
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>Please describe what happened *</Text>
        <TextInput
          style={[styles.input, styles.textAreaLarge]}
          placeholder="Provide a detailed description of the events, including dates, communications, and how the violation has affected you"
          placeholderTextColor={Colors.textLight}
          value={caseDescription}
          onChangeText={setCaseDescription}
          multiline
          numberOfLines={5}
        />
      </View>

      <View style={styles.formGroup}>
        <Text style={styles.label}>What evidence do you have?</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="List any documents, communications, or other evidence that supports your claim"
          placeholderTextColor={Colors.textLight}
          value={evidence}
          onChangeText={setEvidence}
          multiline
          numberOfLines={3}
        />
      </View>

      <View style={styles.buttonRow}>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            console.log('Back button pressed - going to violation section');
            backToViolationSection();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.secondaryButtonText}>Back</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => {
            console.log('Generate Guide button pressed');
            validateAndGenerateGuide();
          }}
          activeOpacity={0.7}
        >
          <Text style={styles.primaryButtonText}>Generate Guide</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderResultsSection = () => {
    const selectedViolations = getSelectedViolations();
    const stateName = US_STATES.find(s => s.value === selectedState)?.label || selectedState;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Lawsuit Preparation Guide</Text>

        <View style={styles.resultCard}>
          <Text style={styles.resultLabel}>State</Text>
          <Text style={styles.resultValue}>{stateName}</Text>

          <Text style={styles.resultLabel}>County</Text>
          <Text style={styles.resultValue}>{county || "Not specified"}</Text>

          <Text style={styles.resultLabel}>Defendant</Text>
          <Text style={styles.resultValue}>{companyName}</Text>

          <Text style={styles.resultLabel}>Violation Type</Text>
          <Text style={styles.resultValue}>{getViolationTypeText()}</Text>

          <Text style={styles.resultLabel}>Specific Violations</Text>
          {selectedViolations.map((v, i) => (
            <View key={i} style={styles.violationItem}>
              <CheckCircle color={Colors.secondary} size={14} />
              <Text style={styles.violationItemText}>{v}</Text>
            </View>
          ))}
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.resultCardTitle}>Applicable Laws</Text>
          <View style={styles.lawItem}>
            <Text style={styles.lawTitle}>Fair Credit Reporting Act (FCRA)</Text>
            <Text style={styles.lawDesc}>Federal law that regulates the collection, dissemination, and use of consumer credit information.</Text>
          </View>
          {violationType === "credit-reporting" && (
            <>
              <View style={styles.lawItem}>
                <Text style={styles.lawTitle}>15 U.S.C. § 1681e(b)</Text>
                <Text style={styles.lawDesc}>Requires credit reporting agencies to follow reasonable procedures to assure maximum possible accuracy.</Text>
              </View>
              <View style={styles.lawItem}>
                <Text style={styles.lawTitle}>15 U.S.C. § 1681i</Text>
                <Text style={styles.lawDesc}>Outlines the procedures for disputing inaccurate information with credit reporting agencies.</Text>
              </View>
            </>
          )}
          {violationType === "creditor" && (
            <>
              <View style={styles.lawItem}>
                <Text style={styles.lawTitle}>15 U.S.C. § 1681s-2</Text>
                <Text style={styles.lawDesc}>Outlines responsibilities of furnishers of information to credit reporting agencies.</Text>
              </View>
              <View style={styles.lawItem}>
                <Text style={styles.lawTitle}>Equal Credit Opportunity Act (ECOA)</Text>
                <Text style={styles.lawDesc}>Prohibits discrimination in credit transactions.</Text>
              </View>
            </>
          )}
          {violationType === "debt-collector" && (
            <>
              <View style={styles.lawItem}>
                <Text style={styles.lawTitle}>Fair Debt Collection Practices Act (FDCPA)</Text>
                <Text style={styles.lawDesc}>Prohibits debt collectors from using abusive, unfair, or deceptive practices.</Text>
              </View>
              <View style={styles.lawItem}>
                <Text style={styles.lawTitle}>15 U.S.C. § 1692e</Text>
                <Text style={styles.lawDesc}>Prohibits false or misleading representations by debt collectors.</Text>
              </View>
            </>
          )}
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.resultCardTitle}>Step-by-Step Filing Guide</Text>
          
          {[
            { step: 1, title: "Gather all evidence", desc: `Collect all documentation related to your case including credit reports, correspondence with the ${getDefendantType()}, records of communications, and proof of damages.` },
            { step: 2, title: "Send a demand letter", desc: `Before filing a lawsuit, consider sending a formal demand letter to ${companyName} outlining the violations and requesting specific remedies. Give them 30 days to respond.` },
            { step: 3, title: "Determine the appropriate court", desc: `In ${stateName}, file in Small Claims Court (for small damages), ${county} County Court (for larger claims), or Federal District Court (for federal law violations).` },
            { step: 4, title: "Prepare your complaint", desc: "Include your name and contact information, defendant's name and address, statement of jurisdiction, statement of claims, facts supporting each claim, and request for relief." },
            { step: 5, title: "File your complaint", desc: "Take your completed complaint to the appropriate courthouse, pay the filing fee (or request a fee waiver), receive a case number, and get instructions for serving the defendant." },
            { step: 6, title: "Serve the defendant", desc: "The defendant must be properly notified via a process server, certified mail with return receipt, or sheriff's department." },
            { step: 7, title: "Prepare for response", desc: "The defendant will likely file an answer or a motion to dismiss. Be prepared to respond to their arguments." },
            { step: 8, title: "Discovery phase", desc: "Both parties exchange information through written interrogatories, requests for documents, and depositions." },
            { step: 9, title: "Settlement negotiations", desc: "Many cases settle before trial. Consider any reasonable settlement offers." },
            { step: 10, title: "Trial", desc: "If the case proceeds, present your case before a judge or jury with organized evidence, prepared testimony, and exhibits." },
          ].map((item) => (
            <View key={item.step} style={styles.stepItem}>
              <View style={styles.stepNumber}>
                <Text style={styles.stepNumberText}>{item.step}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{item.title}</Text>
                <Text style={styles.stepDesc}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.resultCardTitle}>Statute of Limitations</Text>
          {violationType === "credit-reporting" && (
            <Text style={styles.lawDesc}>FCRA claims: Generally 2 years from the date you discover the violation, but no more than 5 years from when the violation occurred.</Text>
          )}
          {violationType === "creditor" && (
            <>
              <Text style={styles.lawDesc}>FCRA claims: Generally 2 years from discovery, no more than 5 years from occurrence.</Text>
              <Text style={styles.lawDesc}>TILA claims: Generally 1 year from the violation for most claims.</Text>
              <Text style={styles.lawDesc}>ECOA claims: Generally 5 years from the violation.</Text>
            </>
          )}
          {violationType === "debt-collector" && (
            <Text style={styles.lawDesc}>FDCPA claims: 1 year from the date the violation occurred.</Text>
          )}
        </View>

        <View style={styles.resultCard}>
          <Text style={styles.resultCardTitle}>Potential Damages</Text>
          <View style={styles.damageItem}>
            <CheckCircle color={Colors.secondary} size={14} />
            <Text style={styles.damageText}>Actual damages - Financial losses caused by the violation</Text>
          </View>
          <View style={styles.damageItem}>
            <CheckCircle color={Colors.secondary} size={14} />
            <Text style={styles.damageText}>Statutory damages - Up to $1,000 per violation under FCRA/FDCPA</Text>
          </View>
          <View style={styles.damageItem}>
            <CheckCircle color={Colors.secondary} size={14} />
            <Text style={styles.damageText}>Punitive damages - For willful noncompliance</Text>
          </View>
          <View style={styles.damageItem}>
            <CheckCircle color={Colors.secondary} size={14} />
            <Text style={styles.damageText}>Attorney&apos;s fees and costs - If you prevail in your lawsuit</Text>
          </View>
        </View>

        <View style={styles.warningBox}>
          <AlertTriangle color={Colors.warning} size={20} />
          <Text style={styles.warningBoxText}>
            This guide is for educational purposes only and does not constitute legal advice. Laws and procedures vary by jurisdiction and may change over time. Consider consulting with an attorney before proceeding with a lawsuit.
          </Text>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => {
              console.log('Back button pressed - going to details');
              navigateToSection("details");
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.secondaryButtonText}>Back</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => {
              console.log('Start Over button pressed');
              setCurrentSection("intro");
              setSelectedState("");
              setCounty("");
              setViolationType(null);
              setCompanyName("");
              setViolationDate("");
              setDisputeAttempts("");
              setCaseDescription("");
              setEvidence("");
              setOtherViolation("");
              setCraViolations(prev => prev.map(v => ({ ...v, checked: false })));
              setCreditorViolations(prev => prev.map(v => ({ ...v, checked: false })));
              setCollectorViolations(prev => prev.map(v => ({ ...v, checked: false })));
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.primaryButtonText}>Start Over</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderCurrentSection = () => {
    switch (currentSection) {
      case "intro":
        return renderIntroSection();
      case "location":
        return renderLocationSection();
      case "violation-type":
        return renderViolationTypeSection();
      case "cra-violations":
        return renderViolationsCheckboxes(craViolations, "cra", "Credit Reporting Agency Violations");
      case "creditor-violations":
        return renderViolationsCheckboxes(creditorViolations, "creditor", "Creditor Violations");
      case "collector-violations":
        return renderViolationsCheckboxes(collectorViolations, "collector", "Debt Collector Violations");
      case "details":
        return renderDetailsSection();
      case "results":
        return renderResultsSection();
      default:
        return renderIntroSection();
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
          <View style={styles.headerTitleContainer}>
            <Scale color={Colors.primary} size={24} />
            <Text style={styles.headerTitle}>Lawsuit Assistant</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={styles.disclaimerBanner}>
          <AlertTriangle color={Colors.warning} size={16} />
          <Text style={styles.disclaimerText}>
            This tool does not provide legal advice and is for educational purposes only.
          </Text>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {renderCurrentSection()}
          <View style={{ height: insets.bottom + 20 }} />
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.surfaceAlt,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
  },
  headerSpacer: {
    width: 40,
  },
  disclaimerBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: Colors.warning + "20",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.warning + "40",
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: Colors.text,
    fontWeight: "500",
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  sectionText: {
    fontSize: 15,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: Colors.primary + "10",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  infoBoxText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: Colors.warning + "15",
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  warningBoxText: {
    flex: 1,
    fontSize: 13,
    color: Colors.text,
    lineHeight: 19,
  },
  getStartedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 12,
    marginTop: 8,
  },
  primaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.surface,
  },
  secondaryButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceAlt,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    flex: 1,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.text,
  },
  buttonPressed: {
    opacity: 0.7,
    transform: [{ scale: 0.98 }],
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  formGroup: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.text,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: Colors.text,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  textAreaLarge: {
    minHeight: 120,
    textAlignVertical: "top",
  },
  pickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  pickerButtonText: {
    fontSize: 15,
    color: Colors.text,
  },
  placeholderText: {
    color: Colors.textLight,
  },
  pickerList: {
    maxHeight: 200,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginTop: 4,
  },
  pickerListSmall: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    marginTop: 4,
  },
  pickerItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  pickerItemSelected: {
    backgroundColor: Colors.primary + "15",
  },
  pickerItemText: {
    fontSize: 15,
    color: Colors.text,
  },
  pickerItemTextSelected: {
    color: Colors.primary,
    fontWeight: "600",
  },
  violationOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: Colors.surface,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  violationOptionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.primary + "15",
    justifyContent: "center",
    alignItems: "center",
  },
  violationOptionContent: {
    flex: 1,
  },
  violationOptionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 2,
  },
  violationOptionSubtitle: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: "600",
    marginBottom: 4,
  },
  violationOptionDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
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
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  resultCard: {
    backgroundColor: Colors.surface,
    padding: 18,
    borderRadius: 14,
    gap: 10,
  },
  resultCardTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: Colors.primary,
    marginBottom: 6,
  },
  resultLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 6,
  },
  resultValue: {
    fontSize: 15,
    fontWeight: "600",
    color: Colors.text,
  },
  violationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingLeft: 4,
  },
  violationItemText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  lawItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  lawTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  lawDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  stepItem: {
    flexDirection: "row",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  stepNumberText: {
    fontSize: 13,
    fontWeight: "700",
    color: Colors.surface,
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: Colors.text,
    marginBottom: 4,
  },
  stepDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
  },
  damageItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 4,
  },
  damageText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
});

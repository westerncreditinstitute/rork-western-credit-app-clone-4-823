import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
} from "react-native";
import { Stack } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";

export default function PrivacyPolicyScreen() {
  const { colors, isDark } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 400,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const styles = createStyles(colors, isDark);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Privacy Policy",
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
          <Text style={styles.lastUpdated}>Last Updated: January 2025</Text>

          <View style={styles.section}>
            <Text style={styles.intro}>
              Western Credit Institute is committed to protecting your privacy and personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website and use our services.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Information We Collect</Text>
            <Text style={styles.sectionSubtitle}>Personal Information</Text>
            <Text style={styles.sectionText}>
              We may collect personal information that you voluntarily provide to us when you:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Register for an account or enroll in our courses</Text>
              <Text style={styles.bulletItem}>• Make a purchase or payment</Text>
              <Text style={styles.bulletItem}>• Subscribe to our newsletter or marketing communications</Text>
              <Text style={styles.bulletItem}>• Contact us with inquiries or feedback</Text>
              <Text style={styles.bulletItem}>• Participate in surveys or promotions</Text>
            </View>
            <Text style={styles.sectionText}>
              This information may include:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Contact Information: Name, email address, phone number, mailing address</Text>
              <Text style={styles.bulletItem}>• Account Information: Username, password, account preferences</Text>
              <Text style={styles.bulletItem}>• Payment Information: Credit card details, billing address (processed securely through third-party payment processors)</Text>
              <Text style={styles.bulletItem}>• Educational Records: Course progress, completion certificates, quiz scores</Text>
              <Text style={styles.bulletItem}>• Communication Records: Correspondence with our support team, feedback submissions</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>Automatically Collected Information</Text>
            <Text style={styles.sectionText}>
              When you access our website, we may automatically collect certain information, including:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Technical Data: IP address, browser type and version, operating system, device type</Text>
              <Text style={styles.bulletItem}>• Usage Data: Pages visited, time spent on pages, click patterns, referring website</Text>
              <Text style={styles.bulletItem}>• Cookies and Similar Technologies: Session cookies, persistent cookies, web beacons, pixel tags</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>Information from Third Parties</Text>
            <Text style={styles.sectionText}>
              We may receive information about you from third parties, including:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Payment processors (transaction confirmations)</Text>
              <Text style={styles.bulletItem}>• Social media platforms (if you connect your account)</Text>
              <Text style={styles.bulletItem}>• Analytics providers (aggregated usage data)</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. How We Use Your Information</Text>
            <Text style={styles.sectionSubtitle}>Service Provision</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Provide access to our educational classes and content</Text>
              <Text style={styles.bulletItem}>• Process payments and manage your account</Text>
              <Text style={styles.bulletItem}>• Track your course progress and issue certificates</Text>
              <Text style={styles.bulletItem}>• Provide customer support and respond to inquiries</Text>
              <Text style={styles.bulletItem}>• Send transactional emails (order confirmations, account updates)</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>Communication</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Send updates about your courses and our services</Text>
              <Text style={styles.bulletItem}>• Provide technical support and service announcements</Text>
              <Text style={styles.bulletItem}>• Send marketing communications (with your consent)</Text>
              <Text style={styles.bulletItem}>• Notify you of changes to our policies or terms</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>Business Operations</Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Improve our website, courses, and services</Text>
              <Text style={styles.bulletItem}>• Analyze usage patterns and trends</Text>
              <Text style={styles.bulletItem}>• Prevent fraud and enhance security</Text>
              <Text style={styles.bulletItem}>• Comply with legal obligations</Text>
              <Text style={styles.bulletItem}>• Enforce our terms and conditions</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Legal Basis for Processing (GDPR)</Text>
            <Text style={styles.sectionText}>
              For users in the European Economic Area (EEA), we process your personal information based on the following legal grounds:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Contract Performance: Processing necessary to provide our services to you</Text>
              <Text style={styles.bulletItem}>• Legitimate Interests: Processing for our business purposes, such as improving services and preventing fraud</Text>
              <Text style={styles.bulletItem}>• Consent: Processing based on your explicit consent, particularly for marketing communications</Text>
              <Text style={styles.bulletItem}>• Legal Obligation: Processing required to comply with applicable laws</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Information Sharing and Disclosure</Text>
            <Text style={styles.sectionText}>
              We may share your information with:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Service Providers: Third-party vendors who assist in operating our website, processing payments, and delivering services</Text>
              <Text style={styles.bulletItem}>• Business Partners: Trusted partners who help us provide and improve our educational offerings</Text>
              <Text style={styles.bulletItem}>• Legal Authorities: When required by law, court order, or government request</Text>
              <Text style={styles.bulletItem}>• Business Transfers: In connection with a merger, acquisition, or sale of assets</Text>
            </View>
            <Text style={styles.sectionText}>
              We do not sell your personal information to third parties for their marketing purposes.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Data Security</Text>
            <Text style={styles.sectionText}>
              We implement appropriate technical and organizational security measures to protect your personal information, including:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Encryption of data in transit and at rest</Text>
              <Text style={styles.bulletItem}>• Secure payment processing through PCI-compliant providers</Text>
              <Text style={styles.bulletItem}>• Regular security assessments and updates</Text>
              <Text style={styles.bulletItem}>• Access controls and authentication measures</Text>
              <Text style={styles.bulletItem}>• Employee training on data protection</Text>
            </View>
            <Text style={styles.sectionText}>
              However, no method of transmission over the Internet or electronic storage is 100% secure. While we strive to protect your information, we cannot guarantee absolute security.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Data Retention</Text>
            <Text style={styles.sectionText}>
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, unless a longer retention period is required or permitted by law. When determining retention periods, we consider:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• The duration of our relationship with you</Text>
              <Text style={styles.bulletItem}>• Legal obligations to retain data</Text>
              <Text style={styles.bulletItem}>• Statute of limitations for potential claims</Text>
              <Text style={styles.bulletItem}>• Business needs for historical data</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Your Rights and Choices</Text>
            <Text style={styles.sectionText}>
              Depending on your location, you may have certain rights regarding your personal information:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Access: Request a copy of your personal information</Text>
              <Text style={styles.bulletItem}>• Correction: Request correction of inaccurate data</Text>
              <Text style={styles.bulletItem}>• Deletion: Request deletion of your personal information</Text>
              <Text style={styles.bulletItem}>• Portability: Request transfer of your data to another service</Text>
              <Text style={styles.bulletItem}>• Opt-Out: Unsubscribe from marketing communications</Text>
              <Text style={styles.bulletItem}>• Restriction: Request limitation of processing in certain circumstances</Text>
            </View>
            <Text style={styles.sectionText}>
              To exercise these rights, please contact us using the information provided below.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Cookies and Tracking Technologies</Text>
            <Text style={styles.sectionText}>
              We use cookies and similar tracking technologies to enhance your experience on our website. You can manage your cookie preferences through your browser settings. Please note that disabling cookies may affect the functionality of our website.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Third-Party Links</Text>
            <Text style={styles.sectionText}>
              Our website may contain links to third-party websites. We are not responsible for the privacy practices or content of these external sites. We encourage you to review the privacy policies of any third-party websites you visit.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Children&apos;s Privacy</Text>
            <Text style={styles.sectionText}>
              Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child, we will take steps to delete that information promptly.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. California Privacy Rights</Text>
            <Text style={styles.sectionText}>
              California residents may have additional rights under the California Consumer Privacy Act (CCPA), including:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Right to know what personal information is collected</Text>
              <Text style={styles.bulletItem}>• Right to know whether personal information is sold or disclosed</Text>
              <Text style={styles.bulletItem}>• Right to opt-out of the sale of personal information</Text>
              <Text style={styles.bulletItem}>• Right to non-discrimination for exercising privacy rights</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>12. Changes to This Privacy Policy</Text>
            <Text style={styles.sectionText}>
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on our website and updating the &quot;Last Updated&quot; date. Your continued use of our services after such changes constitutes your acceptance of the updated policy.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>13. Contact Us</Text>
            <Text style={styles.sectionText}>
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
            </Text>
            <View style={styles.contactInfo}>
              <Text style={styles.contactText}>Western Credit Institute</Text>
              <Text style={styles.contactText}>Email: support@westerncreditinstitute.com</Text>
              <Text style={styles.contactText}>Website: www.westerncreditinstitute.com</Text>
            </View>
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              © 2025 Western Credit Institute. All rights reserved.
            </Text>
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
    lastUpdated: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 20,
      fontStyle: "italic" as const,
    },
    section: {
      marginBottom: 24,
    },
    intro: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.text,
      backgroundColor: colors.surfaceAlt,
      padding: 16,
      borderRadius: 12,
      borderLeftWidth: 4,
      borderLeftColor: colors.primary,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      color: colors.text,
      marginBottom: 12,
    },
    sectionSubtitle: {
      fontSize: 16,
      fontWeight: "600" as const,
      color: colors.text,
      marginBottom: 8,
      marginTop: 4,
    },
    sectionText: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    bulletList: {
      marginTop: 8,
      marginLeft: 8,
      marginBottom: 12,
    },
    bulletItem: {
      fontSize: 14,
      lineHeight: 22,
      color: colors.textSecondary,
      marginBottom: 6,
    },
    contactInfo: {
      backgroundColor: colors.surfaceAlt,
      padding: 16,
      borderRadius: 12,
      marginTop: 12,
    },
    contactText: {
      fontSize: 14,
      color: colors.text,
      marginBottom: 4,
    },
    footer: {
      marginTop: 24,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: colors.border,
      alignItems: "center" as const,
    },
    footerText: {
      fontSize: 13,
      color: colors.textLight,
      textAlign: "center" as const,
    },
  });

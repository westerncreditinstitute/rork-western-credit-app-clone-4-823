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

export default function TermsConditionsScreen() {
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
          title: "Terms & Conditions",
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
              Welcome to Western Credit Institute. By using our website and enrolling in our credit repair class, you agree to the following terms and conditions. Please read them carefully before proceeding.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
            <Text style={styles.sectionText}>
              By accessing and using this website, and by enrolling in the Western Credit Institute credit repair class, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree to these terms, please do not use our website or enroll in our class.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>2. Educational Purpose Disclaimer</Text>
            <Text style={styles.sectionText}>
              The content provided by Western Credit Institute, including all materials, videos, documents, and information presented in our credit repair class, is for educational purposes only. This content does not constitute legal, financial, or professional advice of any kind.
            </Text>
            <Text style={styles.sectionText}>
              You acknowledge that any decisions you make based on the information provided are solely your responsibility. We strongly recommend consulting with qualified legal, financial, or credit professionals before making any decisions that may affect your credit, finances, or legal standing.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>3. Disclaimer of Liability</Text>
            <Text style={styles.sectionText}>
              Western Credit Institute, its owners, employees, affiliates, and partners disclaim any and all liability for any damages, losses, or injuries arising from:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• The use of this website or any content therein</Text>
              <Text style={styles.bulletItem}>• Participation in the credit repair class</Text>
              <Text style={styles.bulletItem}>• Any actions taken based on the information provided</Text>
              <Text style={styles.bulletItem}>• Any errors or omissions in the content</Text>
              <Text style={styles.bulletItem}>• Any interruption or cessation of services</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>4. Limitation of Liability</Text>
            <Text style={styles.sectionText}>
              To the fullest extent permitted by law, Western Credit Institute&apos;s total liability to you for any claims arising from or related to this website or the credit repair class shall be limited to the amount you paid for the class.
            </Text>
            <Text style={styles.sectionText}>
              In no event shall Western Credit Institute be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, use, goodwill, or other intangible losses, regardless of whether such damages were foreseeable or whether Western Credit Institute was advised of the possibility of such damages.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>5. Indemnification</Text>
            <Text style={styles.sectionText}>
              You agree to indemnify, defend, and hold harmless Western Credit Institute, its owners, employees, affiliates, and partners from and against any and all claims, liabilities, damages, losses, costs, and expenses (including reasonable attorneys&apos; fees) arising from or related to:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• Your use of this website</Text>
              <Text style={styles.bulletItem}>• Your participation in the credit repair class</Text>
              <Text style={styles.bulletItem}>• Your violation of these Terms and Conditions</Text>
              <Text style={styles.bulletItem}>• Your violation of any rights of a third party</Text>
              <Text style={styles.bulletItem}>• Any claim that your use of our services caused damage to a third party</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>6. Refund Policy</Text>
            <Text style={styles.sectionText}>
              All sales are final. Due to the nature of our digital educational content and the immediate access granted upon enrollment, we do not offer refunds, exchanges, or credits for any purchases made through this website.
            </Text>
            <Text style={styles.sectionText}>
              By completing your purchase, you acknowledge and agree to this no-refund policy. We encourage you to review all available information about our courses before making a purchase decision.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>7. Intellectual Property Rights</Text>
            <Text style={styles.sectionText}>
              All content on this website and in the credit repair class, including but not limited to text, graphics, logos, images, audio clips, video clips, digital downloads, and software, is the property of Western Credit Institute and is protected by United States and international copyright, trademark, and other intellectual property laws.
            </Text>
            <Text style={styles.sectionText}>
              You may not reproduce, distribute, modify, create derivative works of, publicly display, publicly perform, republish, download, store, or transmit any materials from this website without the prior written consent of Western Credit Institute, except as follows:
            </Text>
            <View style={styles.bulletList}>
              <Text style={styles.bulletItem}>• You may temporarily store copies of materials in RAM incidental to your accessing and viewing those materials</Text>
              <Text style={styles.bulletItem}>• You may store files that are automatically cached by your web browser for display enhancement purposes</Text>
              <Text style={styles.bulletItem}>• You may print or download one copy of a reasonable number of pages for your own personal, non-commercial use</Text>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>8. Governing Law and Jurisdiction</Text>
            <Text style={styles.sectionText}>
              These Terms and Conditions shall be governed by and construed in accordance with the laws of the State of California, without regard to its conflict of law provisions.
            </Text>
            <Text style={styles.sectionText}>
              Any dispute arising from or relating to these Terms and Conditions or your use of this website shall be subject to the exclusive jurisdiction of the state and federal courts located in Orange County, California. You hereby consent to the personal jurisdiction of such courts and waive any objection to venue in such courts.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>9. Modifications to Terms</Text>
            <Text style={styles.sectionText}>
              Western Credit Institute reserves the right to modify, amend, or update these Terms and Conditions at any time without prior notice. Your continued use of this website or participation in the credit repair class after any such changes constitutes your acceptance of the new Terms and Conditions.
            </Text>
            <Text style={styles.sectionText}>
              We encourage you to review these Terms and Conditions periodically to stay informed of any updates.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>10. Severability</Text>
            <Text style={styles.sectionText}>
              If any provision of these Terms and Conditions is found to be invalid, illegal, or unenforceable, the remaining provisions shall continue in full force and effect.
            </Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>11. Contact Information</Text>
            <Text style={styles.sectionText}>
              If you have any questions about these Terms and Conditions, please contact us at:
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
    sectionText: {
      fontSize: 15,
      lineHeight: 24,
      color: colors.textSecondary,
      marginBottom: 12,
    },
    bulletList: {
      marginTop: 8,
      marginLeft: 8,
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

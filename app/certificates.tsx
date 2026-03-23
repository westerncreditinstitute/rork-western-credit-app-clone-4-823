import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft, Award, Download, Share2, Calendar, CheckCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { useTheme } from "@/contexts/ThemeContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { useUser } from "@/contexts/UserContext";
import { Card, Badge } from "@/components/ui";
import { courses as mockCourses } from "@/mocks/data";

interface Certificate {
  id: string;
  title: string;
  course: string;
  dateEarned: string;
  credentialId: string;
  status: "active" | "expired";
}

const COURSE_CERTIFICATE_MAP: Record<string, { title: string; course: string; credentialPrefix: string }> = {
  "3": {
    title: "Credit Repair Specialist",
    course: "ACE-1: Advanced Credit Repair",
    credentialPrefix: "ACE1",
  },
  "4": {
    title: "Advanced Credit Strategies",
    course: "ACE-2: Advanced Credit Building",
    credentialPrefix: "ACE2",
  },
  "5": {
    title: "Business Credit Professional",
    course: "ACE-3: Advanced Business Credit",
    credentialPrefix: "ACE3",
  },
  "1": {
    title: "CSO Certified Professional",
    course: "CSO Certification Program",
    credentialPrefix: "CSO",
  },
};

const generateCredentialId = (prefix: string, index: number): string => {
  const year = new Date().getFullYear();
  const randomNum = String(Math.floor(100000 + Math.random() * 900000)).slice(0, 6);
  return `${prefix}-${year}-${randomNum}`;
};

const generateDateEarned = (index: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - (index * 15 + 5));
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
};

const generateCertificateHTML = (certificate: Certificate, userName: string, driversLicenseNumber: string): string => {
  const displayName = userName || 'Certificate Holder';
  const licenseDisplay = driversLicenseNumber ? `DL#: ${driversLicenseNumber}` : '';
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        @page {
          margin: 0;
          size: landscape;
        }
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: 'Georgia', 'Times New Roman', serif;
          background: linear-gradient(135deg, #001F3F 0%, #003366 50%, #001F3F 100%);
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }
        .certificate {
          background: linear-gradient(145deg, #ffffff 0%, #f8f9fa 100%);
          border-radius: 16px;
          padding: 50px 60px;
          max-width: 900px;
          width: 100%;
          position: relative;
          box-shadow: 0 25px 80px rgba(0,0,0,0.4);
        }
        .certificate::before {
          content: '';
          position: absolute;
          top: 12px;
          left: 12px;
          right: 12px;
          bottom: 12px;
          border: 3px solid #D4AF37;
          border-radius: 12px;
          pointer-events: none;
        }
        .certificate::after {
          content: '';
          position: absolute;
          top: 20px;
          left: 20px;
          right: 20px;
          bottom: 20px;
          border: 1px solid #D4AF37;
          border-radius: 8px;
          pointer-events: none;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
        }
        .logo {
          width: 80px;
          height: 80px;
          background: linear-gradient(135deg, #D4AF37 0%, #FFD700 50%, #D4AF37 100%);
          border-radius: 50%;
          margin: 0 auto 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 15px rgba(212, 175, 55, 0.5);
        }
        .logo-text {
          color: #001F3F;
          font-size: 28px;
          font-weight: bold;
        }
        .institute-name {
          font-size: 28px;
          font-weight: 700;
          color: #001F3F;
          letter-spacing: 3px;
          text-transform: uppercase;
          margin-bottom: 5px;
        }
        .subtitle {
          font-size: 14px;
          color: #666;
          letter-spacing: 2px;
          text-transform: uppercase;
        }
        .divider {
          width: 200px;
          height: 2px;
          background: linear-gradient(90deg, transparent, #D4AF37, transparent);
          margin: 25px auto;
        }
        .certificate-title {
          font-size: 42px;
          color: #D4AF37;
          font-weight: 400;
          letter-spacing: 8px;
          text-transform: uppercase;
          margin-bottom: 15px;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.1);
        }
        .presented-to {
          font-size: 16px;
          color: #666;
          margin-bottom: 10px;
          letter-spacing: 2px;
        }
        .recipient-name {
          font-size: 36px;
          color: #001F3F;
          font-style: italic;
          border-bottom: 2px solid #D4AF37;
          display: inline-block;
          padding-bottom: 8px;
          margin-bottom: 20px;
        }
        .achievement {
          font-size: 18px;
          color: #333;
          max-width: 600px;
          margin: 0 auto 20px;
          line-height: 1.6;
        }
        .course-name {
          font-size: 22px;
          color: #001F3F;
          font-weight: 600;
          margin-bottom: 25px;
        }
        .footer {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-top: 40px;
          padding-top: 20px;
        }
        .footer-item {
          text-align: center;
          flex: 1;
        }
        .footer-line {
          width: 180px;
          height: 1px;
          background: #333;
          margin: 0 auto 8px;
        }
        .footer-label {
          font-size: 12px;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .footer-value {
          font-size: 14px;
          color: #333;
          margin-bottom: 3px;
        }
        .credential-id {
          text-align: center;
          margin-top: 25px;
          padding-top: 15px;
          border-top: 1px dashed #ccc;
        }
        .credential-label {
          font-size: 10px;
          color: #999;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .credential-value {
          font-size: 14px;
          color: #666;
          font-family: 'Courier New', monospace;
          margin-top: 3px;
        }
        .license-info {
          font-size: 12px;
          color: #666;
          margin-top: 8px;
          font-family: 'Courier New', monospace;
        }
        .seal {
          position: absolute;
          bottom: 60px;
          right: 80px;
          width: 100px;
          height: 100px;
          border: 4px solid #D4AF37;
          border-radius: 50%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #fff 0%, #f0f0f0 100%);
          box-shadow: 0 4px 15px rgba(0,0,0,0.1);
        }
        .seal-text {
          font-size: 10px;
          color: #D4AF37;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 1px;
        }
        .seal-icon {
          font-size: 28px;
          color: #D4AF37;
          margin: 5px 0;
        }
      </style>
    </head>
    <body>
      <div class="certificate">
        <div class="header">
          <div class="logo">
            <span class="logo-text">WCI</span>
          </div>
          <div class="institute-name">Western Credit Institute</div>
          <div class="subtitle">Professional Development & Certification</div>
        </div>
        
        <div class="divider"></div>
        
        <div style="text-align: center;">
          <div class="certificate-title">Certificate</div>
          <div class="presented-to">This is to certify that</div>
          <div class="recipient-name">${displayName}</div>
          ${licenseDisplay ? `<div class="license-info">${licenseDisplay}</div>` : ''}
          <div class="achievement">
            has successfully completed all requirements and demonstrated proficiency in
          </div>
          <div class="course-name">${certificate.course}</div>
          <div class="achievement">
            and is hereby awarded the designation of
          </div>
          <div class="course-name" style="color: #D4AF37;">${certificate.title}</div>
        </div>
        
        <div class="footer">
          <div class="footer-item">
            <div class="footer-value">${certificate.dateEarned}</div>
            <div class="footer-line"></div>
            <div class="footer-label">Date Issued</div>
          </div>
          <div class="footer-item">
            <div class="footer-value">Western Credit Institute</div>
            <div class="footer-line"></div>
            <div class="footer-label">Issuing Authority</div>
          </div>
        </div>
        
        <div class="credential-id">
          <div class="credential-label">Credential ID</div>
          <div class="credential-value">${certificate.credentialId}</div>
        </div>
        
        <div class="seal">
          <span class="seal-text">Verified</span>
          <span class="seal-icon">★</span>
          <span class="seal-text">Authentic</span>
        </div>
      </div>
    </body>
    </html>
  `;
};

export default function CertificatesScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { enrolledCourses, isEnrolled } = useSubscription();
  const { user } = useUser();
  const [loadingCertId, setLoadingCertId] = useState<string | null>(null);

  const certificates = useMemo(() => {
    const certs: Certificate[] = [];
    const allEnrolled = new Set(enrolledCourses);
    
    mockCourses.forEach(course => {
      if (course.enrolled || isEnrolled(course.id)) {
        allEnrolled.add(course.id);
      }
    });

    const certificateCourseIds = ['3', '4', '5', '1'];
    let certIndex = 0;
    
    certificateCourseIds.forEach(courseId => {
      if (allEnrolled.has(courseId) && COURSE_CERTIFICATE_MAP[courseId]) {
        const certInfo = COURSE_CERTIFICATE_MAP[courseId];
        certs.push({
          id: courseId,
          title: certInfo.title,
          course: certInfo.course,
          dateEarned: generateDateEarned(certIndex),
          credentialId: generateCredentialId(certInfo.credentialPrefix, certIndex),
          status: "active",
        });
        certIndex++;
      }
    });

    return certs;
  }, [enrolledCourses, isEnrolled]);

  const hasDriversLicense = !!(user.driversLicenseNumber && user.driversLicenseState);

  const promptForDriversLicense = () => {
    Alert.alert(
      "Driver's License Required",
      "You must add your driver's license information to your profile before downloading or printing certificates. This helps verify your identity on the certificate.",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Add Now", 
          onPress: () => router.push("/personal-info" as any)
        }
      ]
    );
  };

  const handleDownload = async (certificate: Certificate) => {
    if (!hasDriversLicense) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      promptForDriversLicense();
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setLoadingCertId(certificate.id);
      console.log("Generating certificate PDF:", certificate.id);
      
      const html = generateCertificateHTML(certificate, user.name, user.driversLicenseNumber || '');
      
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({
          html,
          width: 792,
          height: 612,
        });
        console.log("Certificate PDF saved to:", uri);
        
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            UTI: '.pdf',
            mimeType: 'application/pdf',
            dialogTitle: `${certificate.title} Certificate`,
          });
        } else {
          Alert.alert(
            "Certificate Generated",
            `Your certificate has been saved. File location: ${uri}`,
            [{ text: "OK" }]
          );
        }
      }
    } catch (error) {
      console.error("Error generating certificate:", error);
      Alert.alert(
        "Error",
        "Failed to generate certificate. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoadingCertId(null);
    }
  };

  const handleShare = async (certificate: Certificate) => {
    if (!hasDriversLicense) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      promptForDriversLicense();
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLoadingCertId(certificate.id);
      console.log("Sharing certificate:", certificate.id);
      
      const html = generateCertificateHTML(certificate, user.name, user.driversLicenseNumber || '');
      
      if (Platform.OS === 'web') {
        await Print.printAsync({ html });
      } else {
        const { uri } = await Print.printToFileAsync({
          html,
          width: 792,
          height: 612,
        });
        
        const isAvailable = await Sharing.isAvailableAsync();
        if (isAvailable) {
          await Sharing.shareAsync(uri, {
            UTI: '.pdf',
            mimeType: 'application/pdf',
            dialogTitle: `Share ${certificate.title} Certificate`,
          });
        } else {
          Alert.alert(
            "Sharing Unavailable",
            "Sharing is not available on this device.",
            [{ text: "OK" }]
          );
        }
      }
    } catch (error) {
      console.error("Error sharing certificate:", error);
      Alert.alert(
        "Error",
        "Failed to share certificate. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoadingCertId(null);
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "My Certificates",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft color={colors.text} size={24} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={[styles.iconContainer, { backgroundColor: colors.secondary + "15" }]}>
            <Award color={colors.secondary} size={32} />
          </View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {certificates.length} Certificate{certificates.length !== 1 ? "s" : ""} Earned
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Your achievements and credentials
          </Text>
        </View>

        {certificates.map((cert) => (
          <Card key={cert.id} variant="elevated" padding="lg" style={styles.certCard}>
            <View style={styles.certHeader}>
              <View style={[styles.certIcon, { backgroundColor: colors.primary + "15" }]}>
                <Award color={colors.primary} size={24} />
              </View>
              <Badge
                text={cert.status === "active" ? "ACTIVE" : "EXPIRED"}
                variant={cert.status === "active" ? "success" : "error"}
                size="sm"
              />
            </View>

            <Text style={[styles.certTitle, { color: colors.text }]}>{cert.title}</Text>
            <Text style={[styles.certCourse, { color: colors.textSecondary }]}>{cert.course}</Text>

            <View style={styles.certDetails}>
              <View style={styles.certDetailRow}>
                <Calendar color={colors.textLight} size={16} />
                <Text style={[styles.certDetailText, { color: colors.textSecondary }]}>
                  Earned: {cert.dateEarned}
                </Text>
              </View>
              <View style={styles.certDetailRow}>
                <CheckCircle color={colors.textLight} size={16} />
                <Text style={[styles.certDetailText, { color: colors.textSecondary }]}>
                  ID: {cert.credentialId}
                </Text>
              </View>
            </View>

            {!hasDriversLicense && (
              <View style={[styles.licenseWarning, { backgroundColor: colors.warning + '15', borderColor: colors.warning }]}>
                <Text style={[styles.licenseWarningText, { color: colors.warning }]}>
                  Add driver license to profile to download
                </Text>
              </View>
            )}

            <View style={styles.certActions}>
              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  { backgroundColor: hasDriversLicense ? colors.primary : colors.textLight }
                ]}
                onPress={() => handleDownload(cert)}
                disabled={loadingCertId === cert.id}
              >
                {loadingCertId === cert.id ? (
                  <ActivityIndicator color={colors.white} size="small" />
                ) : (
                  <>
                    <Download color={colors.white} size={18} />
                    <Text style={styles.actionButtonText}>Download</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.actionButton, 
                  styles.shareButton, 
                  { borderColor: hasDriversLicense ? colors.border : colors.textLight }
                ]}
                onPress={() => handleShare(cert)}
                disabled={loadingCertId === cert.id}
              >
                {loadingCertId === cert.id ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <>
                    <Share2 color={hasDriversLicense ? colors.text : colors.textLight} size={18} />
                    <Text style={[styles.shareButtonText, { color: hasDriversLicense ? colors.text : colors.textLight }]}>Share</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        {certificates.length === 0 && (
          <Card variant="default" padding="lg" style={styles.emptyCard}>
            <Award color={colors.textLight} size={48} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Certificates Yet</Text>
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              Complete courses to earn certificates and showcase your achievements.
            </Text>
          </Card>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      padding: 20,
    },
    header: {
      alignItems: "center",
      marginBottom: 24,
    },
    iconContainer: {
      width: 72,
      height: 72,
      borderRadius: 36,
      justifyContent: "center",
      alignItems: "center",
      marginBottom: 16,
    },
    headerTitle: {
      fontSize: 22,
      fontWeight: "700" as const,
      marginBottom: 4,
    },
    headerSubtitle: {
      fontSize: 14,
    },
    certCard: {
      marginBottom: 16,
    },
    certHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: 16,
    },
    certIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
    },
    certTitle: {
      fontSize: 18,
      fontWeight: "700" as const,
      marginBottom: 4,
    },
    certCourse: {
      fontSize: 14,
      marginBottom: 16,
    },
    certDetails: {
      gap: 8,
      marginBottom: 16,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    certDetailRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    certDetailText: {
      fontSize: 13,
    },
    certActions: {
      flexDirection: "row",
      gap: 12,
    },
    actionButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 12,
      borderRadius: 10,
      gap: 6,
    },
    actionButtonText: {
      color: "#FFFFFF",
      fontSize: 14,
      fontWeight: "600" as const,
    },
    shareButton: {
      backgroundColor: "transparent",
      borderWidth: 1,
    },
    shareButtonText: {
      fontSize: 14,
      fontWeight: "600" as const,
    },
    licenseWarning: {
      padding: 10,
      borderRadius: 8,
      borderWidth: 1,
      marginBottom: 12,
    },
    licenseWarningText: {
      fontSize: 13,
      fontWeight: "500" as const,
      textAlign: "center" as const,
    },
    emptyCard: {
      alignItems: "center",
    },
    emptyTitle: {
      fontSize: 18,
      fontWeight: "600" as const,
      marginTop: 16,
      marginBottom: 8,
    },
    emptyText: {
      fontSize: 14,
      textAlign: "center" as const,
      lineHeight: 20,
    },
  });

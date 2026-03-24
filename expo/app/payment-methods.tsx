import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft, CreditCard, Plus, Trash2, CheckCircle, Building } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { Card, Badge } from "@/components/ui";

interface PaymentMethod {
  id: string;
  type: "card" | "bank";
  last4: string;
  brand?: string;
  bankName?: string;
  isDefault: boolean;
  expiryDate?: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: "1",
    type: "card",
    last4: "4242",
    brand: "Visa",
    isDefault: true,
    expiryDate: "12/26",
  },
  {
    id: "2",
    type: "card",
    last4: "5555",
    brand: "Mastercard",
    isDefault: false,
    expiryDate: "08/25",
  },
  {
    id: "3",
    type: "bank",
    last4: "6789",
    bankName: "Chase Bank",
    isDefault: false,
  },
];

export default function PaymentMethodsScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const [methods, setMethods] = useState(paymentMethods);

  const handleSetDefault = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMethods(methods.map((m) => ({ ...m, isDefault: m.id === id })));
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      "Remove Payment Method",
      "Are you sure you want to remove this payment method?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: () => setMethods(methods.filter((m) => m.id !== id)),
        },
      ]
    );
  };

  const handleAddNew = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Add Payment Method", "This would open a payment form to add a new card or bank account.");
  };

  const getCardIcon = (brand?: string) => {
    return <CreditCard color={colors.primary} size={24} />;
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Payment Methods",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft color={colors.text} size={24} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Your Payment Methods
        </Text>

        {methods.map((method) => (
          <Card key={method.id} variant="default" padding="lg" style={styles.methodCard}>
            <View style={styles.methodHeader}>
              <View style={[styles.methodIcon, { backgroundColor: colors.primary + "15" }]}>
                {method.type === "card" ? (
                  getCardIcon(method.brand)
                ) : (
                  <Building color={colors.primary} size={24} />
                )}
              </View>
              <View style={styles.methodInfo}>
                <View style={styles.methodTitleRow}>
                  <Text style={[styles.methodTitle, { color: colors.text }]}>
                    {method.type === "card" ? method.brand : method.bankName}
                  </Text>
                  {method.isDefault && (
                    <Badge text="DEFAULT" variant="success" size="sm" />
                  )}
                </View>
                <Text style={[styles.methodNumber, { color: colors.textSecondary }]}>
                  •••• •••• •••• {method.last4}
                </Text>
                {method.expiryDate && (
                  <Text style={[styles.methodExpiry, { color: colors.textLight }]}>
                    Expires {method.expiryDate}
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.methodActions}>
              {!method.isDefault && (
                <TouchableOpacity
                  style={[styles.setDefaultButton, { borderColor: colors.primary }]}
                  onPress={() => handleSetDefault(method.id)}
                >
                  <CheckCircle color={colors.primary} size={16} />
                  <Text style={[styles.setDefaultText, { color: colors.primary }]}>Set Default</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[styles.deleteButton, { borderColor: colors.error }]}
                onPress={() => handleDelete(method.id)}
              >
                <Trash2 color={colors.error} size={16} />
              </TouchableOpacity>
            </View>
          </Card>
        ))}

        <TouchableOpacity
          style={[styles.addButton, { borderColor: colors.border }]}
          onPress={handleAddNew}
        >
          <View style={[styles.addIcon, { backgroundColor: colors.surfaceAlt }]}>
            <Plus color={colors.primary} size={24} />
          </View>
          <Text style={[styles.addText, { color: colors.text }]}>Add Payment Method</Text>
        </TouchableOpacity>

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
    sectionTitle: {
      fontSize: 14,
      fontWeight: "600" as const,
      textTransform: "uppercase" as const,
      letterSpacing: 0.5,
      marginBottom: 16,
    },
    methodCard: {
      marginBottom: 12,
    },
    methodHeader: {
      flexDirection: "row",
      marginBottom: 16,
    },
    methodIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },
    methodInfo: {
      flex: 1,
    },
    methodTitleRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    methodTitle: {
      fontSize: 16,
      fontWeight: "600" as const,
    },
    methodNumber: {
      fontSize: 14,
      marginBottom: 2,
    },
    methodExpiry: {
      fontSize: 12,
    },
    methodActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: 12,
      paddingTop: 16,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    setDefaultButton: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 8,
      borderWidth: 1,
      gap: 6,
    },
    setDefaultText: {
      fontSize: 13,
      fontWeight: "600" as const,
    },
    deleteButton: {
      width: 36,
      height: 36,
      borderRadius: 8,
      borderWidth: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    addButton: {
      flexDirection: "row",
      alignItems: "center",
      padding: 16,
      borderRadius: 12,
      borderWidth: 2,
      borderStyle: "dashed" as const,
      marginTop: 8,
    },
    addIcon: {
      width: 48,
      height: 48,
      borderRadius: 12,
      justifyContent: "center",
      alignItems: "center",
      marginRight: 14,
    },
    addText: {
      fontSize: 16,
      fontWeight: "600" as const,
    },
  });

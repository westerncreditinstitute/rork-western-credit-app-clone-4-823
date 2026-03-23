import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  Image,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Stack, useRouter } from "expo-router";
import { ArrowLeft, Save, User, Mail, Phone, MapPin, Camera, Image as ImageIcon, CreditCard, MapPinned, ChevronDown, AlertCircle, CheckCircle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { useTheme } from "@/contexts/ThemeContext";
import { useUser } from "@/contexts/UserContext";
import { Card } from "@/components/ui";

const US_STATES = [
  { code: 'AL', name: 'Alabama', pattern: /^[0-9]{1,8}$/, format: '1-8 digits' },
  { code: 'AK', name: 'Alaska', pattern: /^[0-9]{1,7}$/, format: '1-7 digits' },
  { code: 'AZ', name: 'Arizona', pattern: /^[A-Z][0-9]{8}$|^[0-9]{9}$/, format: '1 letter + 8 digits, or 9 digits' },
  { code: 'AR', name: 'Arkansas', pattern: /^[0-9]{4,9}$/, format: '4-9 digits' },
  { code: 'CA', name: 'California', pattern: /^[A-Z][0-9]{7}$/, format: '1 letter + 7 digits' },
  { code: 'CO', name: 'Colorado', pattern: /^[0-9]{9}$|^[A-Z][0-9]{3,6}$|^[A-Z]{2}[0-9]{2,5}$/, format: '9 digits, or 1-2 letters + 2-6 digits' },
  { code: 'CT', name: 'Connecticut', pattern: /^[0-9]{9}$/, format: '9 digits' },
  { code: 'DE', name: 'Delaware', pattern: /^[0-9]{1,7}$/, format: '1-7 digits' },
  { code: 'DC', name: 'District of Columbia', pattern: /^[0-9]{7}$|^[0-9]{9}$/, format: '7 or 9 digits' },
  { code: 'FL', name: 'Florida', pattern: /^[A-Z][0-9]{12}$/, format: '1 letter + 12 digits' },
  { code: 'GA', name: 'Georgia', pattern: /^[0-9]{7,9}$/, format: '7-9 digits' },
  { code: 'HI', name: 'Hawaii', pattern: /^[A-Z][0-9]{8}$|^[0-9]{9}$/, format: '1 letter + 8 digits, or 9 digits' },
  { code: 'ID', name: 'Idaho', pattern: /^[A-Z]{2}[0-9]{6}[A-Z]$|^[0-9]{9}$/, format: '2 letters + 6 digits + 1 letter, or 9 digits' },
  { code: 'IL', name: 'Illinois', pattern: /^[A-Z][0-9]{11,12}$/, format: '1 letter + 11-12 digits' },
  { code: 'IN', name: 'Indiana', pattern: /^[A-Z][0-9]{9}$|^[0-9]{9,10}$/, format: '1 letter + 9 digits, or 9-10 digits' },
  { code: 'IA', name: 'Iowa', pattern: /^[0-9]{9}$|^[0-9]{3}[A-Z]{2}[0-9]{4}$/, format: '9 digits, or 3 digits + 2 letters + 4 digits' },
  { code: 'KS', name: 'Kansas', pattern: /^[A-Z][0-9][A-Z][0-9][A-Z]$|^[A-Z][0-9]{8}$|^[0-9]{9}$/, format: 'K1A2B format, or 1 letter + 8 digits, or 9 digits' },
  { code: 'KY', name: 'Kentucky', pattern: /^[A-Z][0-9]{8,9}$|^[0-9]{9}$/, format: '1 letter + 8-9 digits, or 9 digits' },
  { code: 'LA', name: 'Louisiana', pattern: /^[0-9]{1,9}$/, format: '1-9 digits' },
  { code: 'ME', name: 'Maine', pattern: /^[0-9]{7}$|^[0-9]{7}[A-Z]$|^[0-9]{8}$/, format: '7-8 digits, optionally with letter' },
  { code: 'MD', name: 'Maryland', pattern: /^[A-Z][0-9]{12}$/, format: '1 letter + 12 digits' },
  { code: 'MA', name: 'Massachusetts', pattern: /^[A-Z][0-9]{8}$|^[0-9]{9}$/, format: '1 letter + 8 digits, or 9 digits' },
  { code: 'MI', name: 'Michigan', pattern: /^[A-Z][0-9]{10}$|^[A-Z][0-9]{12}$/, format: '1 letter + 10 or 12 digits' },
  { code: 'MN', name: 'Minnesota', pattern: /^[A-Z][0-9]{12}$/, format: '1 letter + 12 digits' },
  { code: 'MS', name: 'Mississippi', pattern: /^[0-9]{9}$/, format: '9 digits' },
  { code: 'MO', name: 'Missouri', pattern: /^[A-Z][0-9]{5,9}$|^[A-Z][0-9]{6}R$|^[0-9]{8,9}$/, format: '1 letter + 5-9 digits, or 8-9 digits' },
  { code: 'MT', name: 'Montana', pattern: /^[A-Z][0-9]{8}$|^[0-9]{9}$|^[0-9]{13,14}$/, format: '1 letter + 8 digits, 9 digits, or 13-14 digits' },
  { code: 'NE', name: 'Nebraska', pattern: /^[A-Z][0-9]{6,8}$/, format: '1 letter + 6-8 digits' },
  { code: 'NV', name: 'Nevada', pattern: /^[0-9]{9,10}$|^[0-9]{12}$|^X[0-9]{8}$/, format: '9-10 digits, 12 digits, or X + 8 digits' },
  { code: 'NH', name: 'New Hampshire', pattern: /^[0-9]{2}[A-Z]{3}[0-9]{5}$/, format: '2 digits + 3 letters + 5 digits' },
  { code: 'NJ', name: 'New Jersey', pattern: /^[A-Z][0-9]{14}$/, format: '1 letter + 14 digits' },
  { code: 'NM', name: 'New Mexico', pattern: /^[0-9]{8,9}$/, format: '8-9 digits' },
  { code: 'NY', name: 'New York', pattern: /^[A-Z][0-9]{7}$|^[A-Z][0-9]{18}$|^[0-9]{8,9}$|^[0-9]{16}$|^[A-Z]{8}$/, format: '1 letter + 7 or 18 digits, 8-9 or 16 digits, or 8 letters' },
  { code: 'NC', name: 'North Carolina', pattern: /^[0-9]{1,12}$/, format: '1-12 digits' },
  { code: 'ND', name: 'North Dakota', pattern: /^[A-Z]{3}[0-9]{6}$|^[0-9]{9}$/, format: '3 letters + 6 digits, or 9 digits' },
  { code: 'OH', name: 'Ohio', pattern: /^[A-Z][A-Z0-9][0-9]{6}$|^[A-Z]{2}[0-9]{6}$|^[0-9]{8}$/, format: '2 letters + 6 digits, or 8 digits' },
  { code: 'OK', name: 'Oklahoma', pattern: /^[A-Z][0-9]{9}$|^[0-9]{9}$/, format: '1 letter + 9 digits, or 9 digits' },
  { code: 'OR', name: 'Oregon', pattern: /^[0-9]{1,9}$|^[A-Z][0-9]{6}$|^[A-Z]{2}[0-9]{5}$/, format: '1-9 digits, or 1-2 letters + digits' },
  { code: 'PA', name: 'Pennsylvania', pattern: /^[0-9]{8}$/, format: '8 digits' },
  { code: 'RI', name: 'Rhode Island', pattern: /^[0-9]{7}$|^[A-Z][0-9]{6}$/, format: '7 digits, or 1 letter + 6 digits' },
  { code: 'SC', name: 'South Carolina', pattern: /^[0-9]{5,11}$/, format: '5-11 digits' },
  { code: 'SD', name: 'South Dakota', pattern: /^[0-9]{6,10}$|^[0-9]{12}$/, format: '6-10 or 12 digits' },
  { code: 'TN', name: 'Tennessee', pattern: /^[0-9]{7,9}$/, format: '7-9 digits' },
  { code: 'TX', name: 'Texas', pattern: /^[0-9]{7,8}$/, format: '7-8 digits' },
  { code: 'UT', name: 'Utah', pattern: /^[0-9]{4,10}$/, format: '4-10 digits' },
  { code: 'VT', name: 'Vermont', pattern: /^[0-9]{8}$|^[0-9]{7}A$/, format: '8 digits, or 7 digits + A' },
  { code: 'VA', name: 'Virginia', pattern: /^[A-Z][0-9]{8,11}$|^[0-9]{9}$/, format: '1 letter + 8-11 digits, or 9 digits' },
  { code: 'WA', name: 'Washington', pattern: /^[A-Z]{1,7}[A-Z0-9\*]{5}[0-9]{3}$|^[A-Z]{7}[0-9]{5}$/, format: 'WA format (letters + digits)' },
  { code: 'WV', name: 'West Virginia', pattern: /^[0-9]{7}$|^[A-Z]{1,2}[0-9]{5,6}$/, format: '7 digits, or 1-2 letters + 5-6 digits' },
  { code: 'WI', name: 'Wisconsin', pattern: /^[A-Z][0-9]{13}$/, format: '1 letter + 13 digits' },
  { code: 'WY', name: 'Wyoming', pattern: /^[0-9]{9,10}$/, format: '9-10 digits' },
];

const validateLicenseFormat = (license: string, state: typeof US_STATES[0] | undefined): { valid: boolean; message: string | null } => {
  if (!license) return { valid: true, message: null };
  if (!state) return { valid: false, message: 'Please select a state first' };
  
  const cleanLicense = license.toUpperCase().replace(/[\s-]/g, '');
  if (state.pattern.test(cleanLicense)) {
    return { valid: true, message: null };
  }
  return { valid: false, message: `Invalid format for ${state.name}. Expected: ${state.format}` };
};

export default function PersonalInfoScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const { user, updateUser } = useUser();
  const [form, setForm] = useState({
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    address: "123 Main Street, City, State 12345",
    driversLicenseNumber: user.driversLicenseNumber || "",
    driversLicenseState: user.driversLicenseState || "",
  });
  const [profileImage, setProfileImage] = useState<string>(user.avatar);
  const [isEditing, setIsEditing] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showStatePicker, setShowStatePicker] = useState(false);
  const [licenseError, setLicenseError] = useState<string | null>(null);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your photo library to change your profile picture.'
        );
        return false;
      }
    }
    return true;
  };

  const pickImage = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingImage(true);
        const imageUri = result.assets[0].uri;
        setProfileImage(imageUri);
        setIsUploadingImage(false);
        console.log('Profile image updated:', imageUri);
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Error', 'Failed to pick image. Please try again.');
      setIsUploadingImage(false);
    }
  };

  const takePhoto = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Please allow access to your camera to take a profile picture.'
        );
        return;
      }
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsUploadingImage(true);
        const imageUri = result.assets[0].uri;
        setProfileImage(imageUri);
        setIsUploadingImage(false);
        console.log('Profile photo taken:', imageUri);
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Error', 'Failed to take photo. Please try again.');
      setIsUploadingImage(false);
    }
  };

  const showImageOptions = () => {
    Alert.alert(
      'Change Profile Photo',
      'Choose how you want to update your profile picture',
      [
        { text: 'Take Photo', onPress: takePhoto },
        { text: 'Choose from Library', onPress: pickImage },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const selectedState = useMemo(() => {
    return US_STATES.find(s => s.name === form.driversLicenseState || s.code === form.driversLicenseState);
  }, [form.driversLicenseState]);

  const handleLicenseChange = useCallback((text: string) => {
    const upperText = text.toUpperCase();
    setForm(prev => ({ ...prev, driversLicenseNumber: upperText }));
    
    if (upperText && selectedState) {
      const validation = validateLicenseFormat(upperText, selectedState);
      setLicenseError(validation.message);
    } else if (upperText && !selectedState) {
      setLicenseError('Please select a state first');
    } else {
      setLicenseError(null);
    }
  }, [selectedState]);

  const handleStateSelect = useCallback((state: typeof US_STATES[0]) => {
    setForm(prev => ({ ...prev, driversLicenseState: state.name }));
    setShowStatePicker(false);
    
    setForm(prev => {
      if (prev.driversLicenseNumber) {
        const validation = validateLicenseFormat(prev.driversLicenseNumber, state);
        setLicenseError(validation.message);
      }
      return prev;
    });
  }, []);

  const isLicenseValid = useMemo(() => {
    if (!form.driversLicenseNumber || !selectedState) return true;
    return validateLicenseFormat(form.driversLicenseNumber, selectedState).valid;
  }, [form.driversLicenseNumber, selectedState]);

  const handleSave = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    if (form.driversLicenseNumber && !selectedState) {
      Alert.alert("Validation Error", "Please select a state for your driver's license.");
      return;
    }
    
    if (form.driversLicenseNumber && selectedState) {
      const validation = validateLicenseFormat(form.driversLicenseNumber, selectedState);
      if (!validation.valid) {
        Alert.alert("Invalid License Format", validation.message || "Please check your driver's license number.");
        return;
      }
    }
    
    try {
      await updateUser({
        name: form.name,
        email: form.email,
        avatar: profileImage,
        driversLicenseNumber: form.driversLicenseNumber,
        driversLicenseState: form.driversLicenseState,
      });
      Alert.alert("Success", "Your personal information has been updated.");
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert("Error", "Failed to update your information. Please try again.");
    }
  };

  const styles = createStyles(colors);

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Personal Information",
          headerLeft: () => (
            <TouchableOpacity onPress={() => router.back()}>
              <ArrowLeft color={colors.text} size={24} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <TouchableOpacity onPress={() => setIsEditing(!isEditing)}>
              <Text style={[styles.editButton, { color: colors.primary }]}>
                {isEditing ? "Cancel" : "Edit"}
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.avatarSection}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ uri: profileImage }} 
              style={styles.avatarImage}
            />
            {isUploadingImage && (
              <View style={[styles.avatarOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                <ActivityIndicator color="#fff" size="small" />
              </View>
            )}
            {isEditing && !isUploadingImage && (
              <TouchableOpacity 
                style={[styles.avatarEditBadge, { backgroundColor: colors.primary }]}
                onPress={showImageOptions}
              >
                <Camera color="#fff" size={16} />
              </TouchableOpacity>
            )}
          </View>
          {isEditing && (
            <View style={styles.photoButtonsRow}>
              <TouchableOpacity 
                style={[styles.photoOptionButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                onPress={takePhoto}
              >
                <Camera color={colors.primary} size={18} />
                <Text style={[styles.photoOptionText, { color: colors.text }]}>Camera</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.photoOptionButton, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}
                onPress={pickImage}
              >
                <ImageIcon color={colors.primary} size={18} />
                <Text style={[styles.photoOptionText, { color: colors.text }]}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Card variant="default" padding="lg" style={styles.formCard}>
          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <User color={colors.textSecondary} size={18} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Full Name</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                { 
                  color: colors.text,
                  backgroundColor: isEditing ? colors.surfaceAlt : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              value={form.name}
              onChangeText={(text) => setForm({ ...form, name: text })}
              editable={isEditing}
              placeholder="Enter your name"
              placeholderTextColor={colors.textLight}
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Mail color={colors.textSecondary} size={18} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Email Address</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                { 
                  color: colors.text,
                  backgroundColor: isEditing ? colors.surfaceAlt : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              value={form.email}
              onChangeText={(text) => setForm({ ...form, email: text })}
              editable={isEditing}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="Enter your email"
              placeholderTextColor={colors.textLight}
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <Phone color={colors.textSecondary} size={18} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Phone Number</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                { 
                  color: colors.text,
                  backgroundColor: isEditing ? colors.surfaceAlt : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              value={form.phone}
              onChangeText={(text) => setForm({ ...form, phone: text })}
              editable={isEditing}
              keyboardType="phone-pad"
              placeholder="Enter your phone number"
              placeholderTextColor={colors.textLight}
            />
          </View>

          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <MapPin color={colors.textSecondary} size={18} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Address</Text>
            </View>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                { 
                  color: colors.text,
                  backgroundColor: isEditing ? colors.surfaceAlt : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              value={form.address}
              onChangeText={(text) => setForm({ ...form, address: text })}
              editable={isEditing}
              multiline
              numberOfLines={2}
              placeholder="Enter your address"
              placeholderTextColor={colors.textLight}
            />
          </View>
        </Card>

        <Card variant="default" padding="lg" style={styles.formCard}>
          <View style={styles.sectionHeader}>
            <CreditCard color={colors.secondary} size={20} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Driver&apos;s License</Text>
          </View>
          <Text style={[styles.sectionDescription, { color: colors.textSecondary }]}>
            Required for certificate verification and identity confirmation.
          </Text>

          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <MapPinned color={colors.textSecondary} size={18} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Issuing State</Text>
            </View>
            <TouchableOpacity
              style={[
                styles.input,
                styles.selectInput,
                { 
                  backgroundColor: isEditing ? colors.surfaceAlt : colors.surface,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => isEditing && setShowStatePicker(true)}
              disabled={!isEditing}
            >
              <Text style={[styles.selectText, { color: form.driversLicenseState ? colors.text : colors.textLight }]}>
                {form.driversLicenseState || 'Select your state'}
              </Text>
              {isEditing && <ChevronDown color={colors.textSecondary} size={20} />}
            </TouchableOpacity>
            {selectedState && (
              <Text style={[styles.formatHint, { color: colors.textSecondary }]}>
                Format: {selectedState.format}
              </Text>
            )}
          </View>

          <View style={styles.formGroup}>
            <View style={styles.labelRow}>
              <CreditCard color={colors.textSecondary} size={18} />
              <Text style={[styles.label, { color: colors.textSecondary }]}>Driver&apos;s License Number</Text>
            </View>
            <View style={styles.inputWithValidation}>
              <TextInput
                style={[
                  styles.input,
                  styles.inputFlex,
                  { 
                    color: colors.text,
                    backgroundColor: isEditing ? colors.surfaceAlt : colors.surface,
                    borderColor: licenseError ? colors.error : (isLicenseValid && form.driversLicenseNumber ? colors.success : colors.border),
                  },
                ]}
                value={form.driversLicenseNumber}
                onChangeText={handleLicenseChange}
                editable={isEditing}
                placeholder={selectedState ? `Enter ${selectedState.code} license number` : "Select state first"}
                placeholderTextColor={colors.textLight}
                autoCapitalize="characters"
              />
              {form.driversLicenseNumber && isEditing && (
                <View style={styles.validationIcon}>
                  {isLicenseValid ? (
                    <CheckCircle color={colors.success} size={20} />
                  ) : (
                    <AlertCircle color={colors.error} size={20} />
                  )}
                </View>
              )}
            </View>
            {licenseError && (
              <Text style={[styles.errorText, { color: colors.error }]}>
                {licenseError}
              </Text>
            )}
          </View>

          {showStatePicker && (
            <View style={[styles.statePickerOverlay, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
              <View style={[styles.statePickerContainer, { backgroundColor: colors.surface }]}>
                <View style={[styles.statePickerHeader, { borderBottomColor: colors.border }]}>
                  <Text style={[styles.statePickerTitle, { color: colors.text }]}>Select State</Text>
                  <TouchableOpacity onPress={() => setShowStatePicker(false)}>
                    <Text style={[styles.statePickerClose, { color: colors.primary }]}>Done</Text>
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.stateList} showsVerticalScrollIndicator={true}>
                  {US_STATES.map((state) => (
                    <TouchableOpacity
                      key={state.code}
                      style={[
                        styles.stateOption,
                        { borderBottomColor: colors.border },
                        form.driversLicenseState === state.name && { backgroundColor: colors.primaryLight + '20' }
                      ]}
                      onPress={() => handleStateSelect(state)}
                    >
                      <Text style={[styles.stateOptionText, { color: colors.text }]}>
                        {state.name}
                      </Text>
                      <Text style={[styles.stateCode, { color: colors.textSecondary }]}>
                        {state.code}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}
        </Card>

        {isEditing && (
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={handleSave}
          >
            <Save color={colors.white} size={20} />
            <Text style={styles.saveButtonText}>Save Changes</Text>
          </TouchableOpacity>
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
    editButton: {
      fontSize: 16,
      fontWeight: "600" as const,
    },
    avatarSection: {
      alignItems: "center",
      marginBottom: 24,
    },
    avatarContainer: {
      position: "relative" as const,
      width: 120,
      height: 120,
    },
    avatarImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
      borderWidth: 3,
      borderColor: colors.primary,
    },
    avatarOverlay: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      borderRadius: 60,
      justifyContent: "center" as const,
      alignItems: "center" as const,
    },
    avatarEditBadge: {
      position: "absolute" as const,
      bottom: 4,
      right: 4,
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      borderWidth: 3,
      borderColor: colors.background,
    },
    photoButtonsRow: {
      flexDirection: "row" as const,
      gap: 12,
      marginTop: 16,
    },
    photoOptionButton: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: 12,
      borderWidth: 1,
      gap: 8,
    },
    photoOptionText: {
      fontSize: 14,
      fontWeight: "500" as const,
    },
    formCard: {
      marginBottom: 20,
    },
    sectionHeader: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 10,
      marginBottom: 8,
    },
    sectionTitle: {
      fontSize: 17,
      fontWeight: "600" as const,
    },
    sectionDescription: {
      fontSize: 13,
      marginBottom: 16,
      lineHeight: 18,
    },
    formGroup: {
      marginBottom: 20,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: "500" as const,
    },
    input: {
      borderWidth: 1,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 14,
      fontSize: 16,
    },
    textArea: {
      minHeight: 80,
      textAlignVertical: "top" as const,
    },
    selectInput: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      justifyContent: "space-between" as const,
    },
    selectText: {
      fontSize: 16,
      flex: 1,
    },
    formatHint: {
      fontSize: 12,
      marginTop: 6,
      fontStyle: "italic" as const,
    },
    inputWithValidation: {
      position: "relative" as const,
    },
    inputFlex: {
      paddingRight: 44,
    },
    validationIcon: {
      position: "absolute" as const,
      right: 14,
      top: 14,
    },
    errorText: {
      fontSize: 12,
      marginTop: 6,
    },
    statePickerOverlay: {
      position: "absolute" as const,
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      zIndex: 1000,
    },
    statePickerContainer: {
      width: "90%" as const,
      maxHeight: "70%" as const,
      borderRadius: 16,
      overflow: "hidden" as const,
    },
    statePickerHeader: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      padding: 16,
      borderBottomWidth: 1,
    },
    statePickerTitle: {
      fontSize: 18,
      fontWeight: "600" as const,
    },
    statePickerClose: {
      fontSize: 16,
      fontWeight: "600" as const,
    },
    stateList: {
      maxHeight: 400,
    },
    stateOption: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      padding: 16,
      borderBottomWidth: 1,
    },
    stateOptionText: {
      fontSize: 16,
    },
    stateCode: {
      fontSize: 14,
      fontWeight: "500" as const,
    },
    saveButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 16,
      borderRadius: 12,
      gap: 8,
    },
    saveButtonText: {
      color: "#FFFFFF",
      fontSize: 16,
      fontWeight: "600" as const,
    },
  });

// src/screens/FeedbackScreen.tsx - FULLY UPDATED with real-time

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert, 
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useFeedback } from '../feedbackHook/useFeedback'; // ✅ Fixed import path
import { ScreenWrapper } from '../components/ScreenWrapper';
import { useTheme } from '../context/ThemeContext';

const FEEDBACK_TYPES = [
  { label: 'Bug Report',       value: 'BUG' },
  { label: 'Feature Request',  value: 'FEATURE_REQUEST' },
  { label: 'General Feedback', value: 'GENERAL' },
  { label: 'Suggestion',       value: 'SUGGESTION' },
  { label: 'Complaint',        value: 'COMPLAINT' },
  { label: 'Question',         value: 'QUESTION' },
  { label: 'Other',            value: 'OTHER' },
];

const CATEGORIES = [
  { label: 'None',            value: '' },
  { label: 'UI/UX',          value: 'UI' },
  { label: 'Performance',    value: 'Performance' },
  { label: 'Tasks',          value: 'Task' },
  { label: 'Groups',         value: 'Group' },
  { label: 'Authentication', value: 'Auth' },
  { label: 'Other',          value: 'Other' },
];

// Custom Dropdown
interface DropdownOption { label: string; value: string; }
interface CustomDropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (val: string) => void;
  disabled?: boolean;
}

function CustomDropdown({ label, value, options, onChange, disabled }: CustomDropdownProps) {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find(o => o.value === value);

  const handleSelect = (val: string) => { onChange(val); setOpen(false); };

  return (
    <View style={{ marginBottom: 20, zIndex: open ? 999 : 1 }}>
      <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>{label}</Text>
      <TouchableOpacity
        onPress={() => !disabled && setOpen(v => !v)}
        activeOpacity={0.7}
        style={[styles.dropdownTrigger, { backgroundColor: theme.bgSecondary, borderColor: open ? theme.primary : theme.border }]}
      >
        <Text style={[styles.dropdownTriggerText, { color: theme.text }]}>
          {selected?.label || 'Select...'}
        </Text>
        <MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={20} color={open ? theme.primary : theme.textMuted} />
      </TouchableOpacity>
      {open && (
        <View style={[styles.dropdownSheet, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {options.map((item, index) => {
            const isSelected = item.value === value;
            const isLast = index === options.length - 1;
            return (
              <TouchableOpacity
                key={item.value}
                style={[
                  styles.dropdownOption,
                  !isLast && { borderBottomWidth: 0.5, borderBottomColor: theme.border },
                  isSelected && { backgroundColor: theme.primaryLight },
                ]}
                onPress={() => handleSelect(item.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dropdownOptionText, { color: theme.text }, isSelected && { color: theme.primary, fontWeight: '600' }]}>
                  {item.label}
                </Text>
                {isSelected && <MaterialCommunityIcons name="check" size={18} color={theme.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

export default function FeedbackScreen({ navigation }: any) {
  const { theme } = useTheme();
  const [type,     setType]     = useState('GENERAL');
  const [category, setCategory] = useState('');
  const [message,  setMessage]  = useState('');
  const { submitting, submitFeedback, authError } = useFeedback();

  useEffect(() => {
    if (authError) {
      Alert.alert('Session Expired', 'Please log in again', [
        { text: 'OK', onPress: () => navigation.navigate('Login') },
      ]);
    }
  }, [authError]);
 
  const handleSubmit = async () => {
    if (!message.trim()) {
      Alert.alert('Error', 'Please enter your feedback message');
      return;
    }
    
    // ✅ Submit feedback - success alert will come from socket
    const result = await submitFeedback({ 
      type, 
      message: message.trim(), 
      category: category || undefined 
    });
    
    if (result.success) {
      // ✅ Clear form immediately
      setMessage('');
      setCategory('');
      setType('GENERAL');
    
    }
  };

  return (
    <ScreenWrapper style={[styles.container, { backgroundColor: theme.bgSecondary }]}>

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.backButton, { backgroundColor: theme.card, shadowColor: theme.shadow }]}>
          <MaterialCommunityIcons name="arrow-left" size={22} color={theme.primary} />
        </TouchableOpacity>
        <View style={styles.titleContainer}>
          <Text style={[styles.title, { color: theme.text }]}>Submit Feedback</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Help us improve</Text>
        </View>
        <TouchableOpacity onPress={() => navigation.navigate('FeedbackHistory')}>
          <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={[styles.historyButton, { borderColor: theme.border }]}>
            <MaterialCommunityIcons name="history" size={18} color={theme.primary} />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Form Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
            <View style={[styles.cardIconWrap, { backgroundColor: theme.bgTertiary }]}>
              <MaterialCommunityIcons name="message-plus-outline" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>New Feedback</Text>
          </View>

          <View style={styles.cardBody}>
            <CustomDropdown label="Feedback Type *" value={type} options={FEEDBACK_TYPES} onChange={setType} disabled={submitting} />
            <CustomDropdown label="Category (Optional)" value={category} options={CATEGORIES} onChange={setCategory} disabled={submitting} />

            <View>
              <Text style={[styles.fieldLabel, { color: theme.textMuted }]}>Your Feedback *</Text>
              <TextInput
                style={[styles.messageInput, { color: theme.text, backgroundColor: theme.bgSecondary, borderColor: theme.border }]}
                multiline
                numberOfLines={8}
                placeholder="Tell us what you think..."
                placeholderTextColor={theme.textPlaceholder}
                value={message}
                onChangeText={setMessage}
                textAlignVertical="top"
                selectionColor={theme.primary}
                editable={!submitting}
              />
            </View>
          </View>

          <View style={[styles.cardFooter, { borderTopColor: theme.border }]}>
            <TouchableOpacity style={styles.cancelButton} onPress={() => navigation.goBack()} disabled={submitting}>
              <LinearGradient colors={[theme.bgSecondary, theme.bgTertiary]} style={styles.cancelGradient}>
                <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
              </LinearGradient>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.submitButton, submitting && styles.buttonDisabled]} onPress={handleSubmit} disabled={submitting}>
              <LinearGradient colors={submitting ? [theme.bgSecondary, theme.bgTertiary] : [theme.primary, theme.primaryDark]} style={styles.submitGradient}>
                {submitting
                  ? <ActivityIndicator size="small" color={theme.textMuted} />
                  : <><MaterialCommunityIcons name="send" size={16} color="#fff" /><Text style={styles.submitText}>Submit</Text></>
                }
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* Tips Card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.cardHeader, { borderBottomColor: theme.border }]}>
            <View style={[styles.cardIconWrap, { backgroundColor: theme.bgTertiary }]}>
              <MaterialCommunityIcons name="lightbulb-outline" size={20} color={theme.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Quick Tips</Text>
          </View>
          <View style={styles.cardBody}>
            {[
              { icon: 'bug',              color: theme.error,   bg: theme.errorBg,      border: theme.errorBorder,   text: 'Report bugs with details of what happened' },
              { icon: 'lightbulb',        color: theme.primary, bg: theme.primaryLight,  border: theme.primaryBorder, text: "Suggest features you'd like to see" },
              { icon: 'format-list-text', color: theme.primary, bg: theme.primaryLight,  border: theme.primaryBorder, text: 'Be specific — it helps us understand better' },
            ].map((tip, i, arr) => (
              <View key={i} style={[styles.tipRow, i < arr.length - 1 && { marginBottom: 12 }]}>
                <View style={[styles.tipIcon, { backgroundColor: tip.bg, borderColor: tip.border }]}>
                  <MaterialCommunityIcons name={tip.icon as any} size={16} color={tip.color} />
                </View>
                <Text style={[styles.tipText, { color: theme.textSecondary }]}>{tip.text}</Text>
              </View>
            ))}
          </View>
        </View>

      </ScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, minHeight: 60,
  },
  backButton: {
    width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center',
    shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 4, elevation: 2,
  },
  titleContainer: { flex: 1, alignItems: 'center' },
  title:    { fontSize: 16, fontWeight: '600' },
  subtitle: { fontSize: 11, marginTop: 2 },
  historyButton: { width: 36, height: 36, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  content: { padding: 16, paddingBottom: 40 },

  card: { borderRadius: 12, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  cardIconWrap: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  cardTitle: { fontSize: 15, fontWeight: '600' },
  cardBody:  { padding: 16 },

  cardFooter: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: 1 },
  cancelButton:   { flex: 1, borderRadius: 8, overflow: 'hidden' },
  cancelGradient: { paddingVertical: 14, alignItems: 'center' },
  cancelText:     { fontSize: 14, fontWeight: '600' },
  submitButton:   { flex: 1, borderRadius: 8, overflow: 'hidden' },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, gap: 6 },
  submitText:     { fontSize: 14, fontWeight: '600', color: '#fff' },
  buttonDisabled: { opacity: 0.6 },

  fieldLabel: { fontSize: 13, fontWeight: '500', marginBottom: 8, marginLeft: 4 },

  dropdownTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 14, minHeight: 50 },
  dropdownTriggerText: { fontSize: 14, flex: 1 },
  dropdownSheet: { borderWidth: 1, borderRadius: 8, marginTop: 4, overflow: 'hidden' },
  dropdownOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 13 },
  dropdownOptionText: { fontSize: 14 },

  messageInput: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 16, paddingVertical: 14, fontSize: 14, minHeight: 150, textAlignVertical: 'top', lineHeight: 20 },

  tipRow:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tipIcon: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center', borderWidth: 1 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 18 },
});
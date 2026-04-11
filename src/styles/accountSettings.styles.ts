// src/styles/accountSettings.styles.ts - FIXED EYE BUTTON ALIGNMENT

import { StyleSheet } from 'react-native';
import { Theme } from '../context/ThemeContext';

export const makeAccountSettingsStyles = (theme: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.bgSecondary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: theme.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
    minHeight: 60, 
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.card,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: theme.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: theme.textMuted,
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 8,
    paddingLeft: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: theme.border,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: theme.textMuted,
    marginBottom: 6,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.bgSecondary,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    height: 48,
    gap: 8,
  },
  inputError: {
    borderColor: theme.error,
    backgroundColor: theme.errorBg,
  },
  inputValid: {
    borderColor: theme.primary,
    backgroundColor: theme.primaryLight,
  },
  disabledInputWrapper: {
    backgroundColor: theme.bgTertiary,
    opacity: 0.7,
  },
  input: {
    flex: 1,
    height: 48,
    paddingHorizontal: 0,
    fontSize: 15,
    color: theme.text,
    backgroundColor: 'transparent',
  },
  inputDisabled: {
    opacity: 0.6,
  },
  disabledInput: {
    color: theme.textMuted,
  },
  hintText: {
    fontSize: 11,
    color: theme.textMuted,
    marginTop: 4,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 11,
    color: theme.error,
    marginTop: 4,
    marginLeft: 4,
  },
  eyeButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  saveButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  changePasswordButton: {
    marginTop: 8,
    borderRadius: 10,
    overflow: 'hidden',
  },
  changePasswordGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  changePasswordText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
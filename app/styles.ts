import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
   // AUTH STYLES
  authContainer: { flex: 1, backgroundColor: '#F4F7FB', justifyContent: 'center', paddingHorizontal: 30 },
  authLogoBox: { alignItems: 'center', marginBottom: 50 },
  authWelcomeText: { fontSize: 16, color: '#8D99AE', fontWeight: '600', marginTop: 20, textTransform: 'uppercase', letterSpacing: 2 },
  authTitleText: { fontSize: 36, fontWeight: '900', color: '#1E293B', marginTop: 5 },
  authActionBox: { gap: 15 },
  authPrimaryBtn: { flexDirection: 'row', backgroundColor: '#4361EE', paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#4361EE', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 5 },
  authPrimaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
  authSecondaryBtn: { flexDirection: 'row', backgroundColor: '#E2E8F0', paddingVertical: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  authSecondaryBtnText: { color: '#64748B', fontSize: 16, fontWeight: '700' },
  authBackBtn: { position: 'absolute', top: 60, left: 30, zIndex: 10, padding: 10, backgroundColor: '#E2E8F0', borderRadius: 12 },
  authFormBox: { backgroundColor: '#FFF', padding: 24, borderRadius: 24, shadowColor: '#1E293B', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.05, shadowRadius: 16, elevation: 5 },
  authInput: { backgroundColor: '#F8FAFC', padding: 18, borderRadius: 16, fontSize: 16, color: '#1E293B', fontWeight: '500', borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 15 },

  // APP STYLES
  container: { flex: 1, backgroundColor: '#F4F7FB', paddingTop: 60 },
  headerContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, marginBottom: 20 },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1E293B', letterSpacing: -0.5 },

  inputCard: { backgroundColor: '#FFFFFF', marginHorizontal: 20, padding: 24, borderRadius: 24, shadowColor: '#4361EE', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.08, shadowRadius: 16, elevation: 5, marginBottom: 24 },
  dateSelectorRow: { flexDirection: 'row', marginBottom: 20 },
  dateSelectorBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F4FF', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#DCE4FF' },
  dateSelectorText: { fontSize: 15, color: '#4361EE', fontWeight: '700' },
  dropdownSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0' },
  dropdownTextPlaceholder: { color: '#A0AABF', fontSize: 15, fontWeight: '500' },
  dropdownTextActive: { color: '#1E293B', fontSize: 15, fontWeight: '700' },

  row: { flexDirection: 'row', justifyContent: 'space-between' },
  halfInputContainer: { width: '47%' },
  inputLabel: { fontSize: 12, fontWeight: '700', color: '#8D99AE', marginBottom: 8, letterSpacing: 1 },
  input: { backgroundColor: '#F8FAFC', padding: 16, marginBottom: 20, borderRadius: 16, fontSize: 16, color: '#1E293B', fontWeight: '600', borderWidth: 1, borderColor: '#E2E8F0', zIndex: 10 },
  
  unitToggleContainer: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, marginBottom: 20 },
  unitOption: { flex: 1, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  unitOptionActive: { backgroundColor: '#4361EE' },
  unitOptionText: { fontSize: 13, fontWeight: '600', color: '#64748B' },
  unitOptionTextActive: { color: '#FFFFFF' },
  
  unitToggleContainerCompact: { flexDirection: 'row', backgroundColor: '#F1F5F9', borderRadius: 12, padding: 4, height: 55, width: 100 },
  unitOptionCompact: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 10 },

  measurementInputContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 20, paddingRight: 16 },
  measurementInput: { flex: 1, padding: 16, fontSize: 16, color: '#1E293B', fontWeight: '600' },
  measurementUnitSuffix: { fontSize: 14, color: '#8D99AE', fontWeight: '600' },
  
  formActionRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  cancelButton: { backgroundColor: '#F1F5F9', paddingVertical: 16, borderRadius: 16, flex: 1, marginRight: 8, alignItems: 'center' },
  cancelButtonText: { color: '#64748B', fontSize: 16, fontWeight: '700' },
  saveButton: { flexDirection: 'row', backgroundColor: '#4361EE', paddingVertical: 16, borderRadius: 16, flex: 1, marginLeft: 8, alignItems: 'center', justifyContent: 'center' },
  saveButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  listContainer: { flex: 1, paddingHorizontal: 20 },
  listHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, paddingHorizontal: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '700', color: '#1E293B' },
  calendarOverviewBtn: { backgroundColor: '#E2E8F0', padding: 10, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1E293B', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20 },
  addButtonText: { color: '#FFF', fontWeight: '700', marginLeft: 6, fontSize: 14 },
  
  filterBadgeContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFECEC', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 16 },
  filterBadgeText: { color: '#EF233C', fontWeight: '700', marginRight: 8 },
  emptyText: { textAlign: 'center', color: '#8D99AE', marginTop: 20, fontSize: 16, fontStyle: 'italic' },

  workoutCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', marginBottom: 16, borderRadius: 20, alignItems: 'center', shadowColor: '#1E293B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2, overflow: 'hidden' },
  cardAccentBar: { width: 6, height: '100%', backgroundColor: '#4361EE' }, 
  workoutInfo: { flex: 1, paddingVertical: 16, paddingLeft: 16 },
  workoutName: { fontSize: 18, fontWeight: '800', color: '#1E293B', marginBottom: 6 },
  workoutStats: { fontSize: 15, color: '#64748B', marginBottom: 8 },
  statHighlight: { color: '#1E293B', fontWeight: '600' },
  statHighlightBold: { color: '#1E293B', fontWeight: '800' },

  measurementTag: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F1F5F9', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  measurementTagText: { fontSize: 13, color: '#486581', marginLeft: 4, fontWeight: '500' },
  dateRow: { flexDirection: 'row', alignItems: 'center' },
  workoutDate: { fontSize: 13, color: '#8D99AE', marginLeft: 4, fontWeight: '500' },
  
  cardActionsContainer: { flexDirection: 'row', paddingHorizontal: 16, alignItems: 'center', gap: 10 },
  editActionBtn: { backgroundColor: '#4361EE', padding: 12, borderRadius: 14 },
  deleteActionBtn: { backgroundColor: '#EF233C', padding: 12, borderRadius: 14 },

  modalBackground: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.6)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: '800', color: '#1E293B' },
  
  customExerciseCard: { backgroundColor: '#F8FAFC', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: '#E2E8F0', marginBottom: 16 },
  customExerciseInput: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, fontSize: 16, color: '#1E293B', borderWidth: 1, borderColor: '#E2E8F0' },
  intensityBtn: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8, backgroundColor: '#E2E8F0' },
  intensityBtnActive: { backgroundColor: '#4361EE' },
  intensityBtnText: { fontSize: 12, color: '#64748B', fontWeight: '600' },
  intensityBtnTextActive: { color: '#FFF' },
  customExerciseBtn: { backgroundColor: '#10B981', flexDirection: 'row', paddingVertical: 12, alignItems: 'center', justifyContent: 'center', borderRadius: 12, marginTop: 16 },

  modalItemContainer: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  modalItemTextContainer: { flex: 1, paddingVertical: 18 },
  modalItemText: { fontSize: 17, color: '#1E293B', fontWeight: '600' },
  modalCloseButton: { marginTop: 20, padding: 15, backgroundColor: '#F1F5F9', borderRadius: 16, alignItems: 'center' },
  modalCloseText: { color: '#1E293B', fontSize: 16, fontWeight: '700' },

  // STATS STYLES
  statsContainer: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  statBox: { flex: 1, backgroundColor: '#FFFFFF', padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#1E293B', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 },
  statBoxLabel: { fontSize: 12, color: '#8D99AE', fontWeight: '700', textTransform: 'uppercase', marginBottom: 4, letterSpacing: 0.5 },
  statBoxValue: { fontSize: 20, color: '#1E293B', fontWeight: '800' },

  // SETTINGS STYLES
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  settingsRowText: { fontSize: 16, color: '#1E293B', fontWeight: '600' },
  settingsRowValue: { fontSize: 16, color: '#64748B', fontWeight: '500' },
  profileSection: { marginTop: 20, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  dangerZone: { marginTop: 20, paddingTop: 20 },
  dangerZoneTitle: { fontSize: 12, fontWeight: '800', color: '#8D99AE', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  deleteAccountBtn: { flexDirection: 'row', backgroundColor: '#EF233C', paddingVertical: 16, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  deleteAccountBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
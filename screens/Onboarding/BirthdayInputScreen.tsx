// screens/Onboarding/BirthdayInputScreen.tsx
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useNavigation } from '@react-navigation/native';

export default function BirthdayInputScreen() {
  const navigation = useNavigation();
  const [birthday, setBirthday] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);

  const handleNext = () => {
    // You can compute age using birthday later if needed
    navigation.navigate('MainTabs');
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>When’s your birthday?</Text>
      <TouchableOpacity style={styles.dateBox} onPress={() => setShowPicker(true)}>
        <Text style={styles.dateText}>{birthday.toDateString()}</Text>
      </TouchableOpacity>
      {showPicker && (
        <DateTimePicker
          value={birthday}
          mode="date"
          display="spinner"
          maximumDate={new Date()}
          onChange={(event, selectedDate) => {
            const currentDate = selectedDate || birthday;
            setShowPicker(Platform.OS === 'ios');
            setBirthday(currentDate);
          }}
        />
      )}
      <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
        <Text style={styles.nextText}>Finish</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fdf8f3',
    padding: 20,
    justifyContent: 'center',
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111',
    marginBottom: 30,
  },
  dateBox: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    borderColor: '#ddd',
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 30,
  },
  dateText: {
    fontSize: 18,
    color: '#111',
  },
  nextButton: {
    backgroundColor: '#f4a261',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
  },
  nextText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
});

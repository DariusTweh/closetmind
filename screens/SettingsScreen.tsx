import React from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  TouchableOpacity, Switch, Alert, ActivityIndicator
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import * as Updates from 'expo-updates'; // optional if you want to reload after theme change

export default function SettingsScreen() {
  const navigation = useNavigation();
  const [darkMode, setDarkMode] = React.useState(false); // TODO: replace with your theme store
  const [loading, setLoading] = React.useState(true);
  const [user, setUser] = React.useState<any>(null);

  // Resolve session
  React.useEffect(() => {
    let mounted = true;
    const init = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!mounted) return;
      if (error || !data?.user) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
        return;
      }
      setUser(data.user);
      setLoading(false);
    };
    init();

    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (!session?.user) {
        navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
      } else {
        setUser(session.user);
      }
    });
    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, [navigation]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error.message);
      Alert.alert('Error', 'Unable to log out.');
      return;
    }
    navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
  };

  // SECURE: call an Edge Function / server route that uses the service role
  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            setLoading(true);
            const { data, error } = await supabase.functions.invoke('delete-account', {
              body: { reason: 'user_requested' }, // optional
            });
            if (error) throw error;
            await supabase.auth.signOut();
            navigation.reset({ index: 0, routes: [{ name: 'Login' as never }] as never });
          } catch (e: any) {
            console.error('Delete account failed:', e?.message || e);
            Alert.alert('Error', 'Could not delete account.');
          } finally {
            setLoading(false);
          }
        },
      },
    ]);
  };

  const handleChangePassword = async () => {
    // In production, navigate to a dedicated ChangePassword screen with validation.
    Alert.prompt('Change Password', 'Enter a new password', async (pwd) => {
      if (!pwd) return;
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Password updated.');
      }
    });
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#fdf8f3', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#999" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fdf8f3' }}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Settings</Text>

        <Text style={styles.sectionTitle}>ACCOUNT</Text>
        <View style={styles.card}>
          <SettingsItem label="Edit Profile" onPress={() => navigation.navigate('EditProfile' as never)} />
          <SettingsItem label="Change Password" onPress={handleChangePassword} />
          <SettingsItem label="Delete My Account" danger onPress={handleDeleteAccount} />
          <SettingsItem label="Log Out" onPress={handleLogout} />
        </View>

        <Text style={styles.sectionTitle}>APPEARANCE</Text>
        <View style={styles.card}>
          <SettingsToggle label="Dark Mode" value={darkMode} onValueChange={setDarkMode} />
          <SettingsItem label="Font Size" value="Medium" onPress={() => {}} />
        </View>

        <Text style={styles.sectionTitle}>CLOSET PREFERENCES</Text>
        <View style={styles.card}>
          <SettingsItem label="Default Outfit Vibe" value="Casual" onPress={() => {}} />
        </View>

        <Text style={styles.sectionTitle}>PRIVACY & SECURITY</Text>
        <View style={styles.card}>
          <SettingsItem label="Data Export" onPress={() => { /* TODO: supabase.functions.invoke('export-data') */ }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function SettingsItem({ label, onPress, value, danger = false }) {
  return (
    <TouchableOpacity onPress={onPress} style={styles.item}>
      <Text style={[styles.itemLabel, danger && styles.dangerText]}>{label}</Text>
      {value && <Text style={styles.itemValue}>{value}</Text>}
    </TouchableOpacity>
  );
}

function SettingsToggle({ label, value, onValueChange }) {
  return (
    <View style={styles.item}>
      <Text style={styles.itemLabel}>{label}</Text>
      <Switch value={value} onValueChange={onValueChange} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 60,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    color: '#111',
    marginBottom: 24,
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '500',
    color: '#999',
    marginTop: 28,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    paddingVertical: 6,
    paddingHorizontal: 12,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderColor: '#eee',
  },
  itemLabel: {
    fontSize: 15,
    color: '#111',
  },
  itemValue: {
    fontSize: 14,
    color: '#666',
  },
  dangerText: {
    color: '#d9534f',
    fontWeight: '600',
  },
});

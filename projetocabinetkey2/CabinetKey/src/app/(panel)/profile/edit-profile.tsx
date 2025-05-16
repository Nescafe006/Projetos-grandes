import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '@/lib/supabase';
import { StyleSheet } from 'react-native';
import colors  from '@/constants/colors';





export default function EditProfileScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        // busca dados do perfil atual
        const { data, error } = await supabase.from('usuario').select('*').eq('id', user.id).single();
        if (data) {
          setNome(data.nome || '');
          setBio(data.bio || '');
          setWebsite(data.website || '');
          setAvatarUrl(data.avatar_url || '');
        }
        if (error) console.log('Erro ao carregar perfil:', error.message);
      }
    })();
  }, []);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
    });

    if (result.canceled) return;
    
const file = result.assets[0];
const ext = file.uri.split('.').pop();
const fileName = `${userId}-${Date.now()}.${ext}`;

const fileBlob = await fetch(file.uri).then(response => response.blob());

const formData = new FormData();
formData.append('file', fileBlob, fileName);
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    const uploadRes = await fetch(
      `https://uilkwilxhmktvimauohh.supabase.co/storage/v1/object/public/avatars/${fileName}`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'x-upsert': 'true',
        },
        body: formData,
      }
    );

    if (!uploadRes.ok) {
      Alert.alert('Erro ao enviar imagem');
      return;
    }

    const publicUrl = `https://uilkwilxhmktvimauohh.supabase.co/storage/v1/object/public/avatars/${fileName}`;
    setAvatarUrl(publicUrl);
  };

  const handleSave = async () => {
    if (!userId) return;

    const { error } = await supabase.from('usuario').upsert({
      id: userId,
      nome,
      bio,
      website,
      avatar_url: avatarUrl,
    });

    if (error) return Alert.alert('Erro ao salvar perfil', error.message);
    Alert.alert('Perfil atualizado com sucesso!');
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <TouchableOpacity onPress={handleSave}>
          <Text style={styles.saveText}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarEditContainer}>
          {avatarUrl ? (
            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
          ) : (
            <View style={styles.avatarPlaceholder}>
              <Text style={{ color: '#ccc' }}>Selecionar</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.formContainer}>
        <Text style={styles.label}>Nome</Text>
        <TextInput style={styles.input} value={nome} onChangeText={setNome} />

        <Text style={styles.label}>Bio</Text>
        <TextInput style={styles.input} value={bio} onChangeText={setBio} multiline />

        <Text style={styles.label}>Website</Text>
        <TextInput style={styles.input} value={website} onChangeText={setWebsite} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContainer: { padding: 20, paddingBottom: 40 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 30,
  },
  headerTitle: {
    color: colors.pearl,
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveText: {
    color: colors.neon.aqua,
    fontSize: 16,
    fontWeight: 'bold',
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  avatarEditContainer: {
    position: 'relative',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.glow.blue,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.slate[700],
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: colors.glow.blue,
  },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    borderRadius: 20,
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  formContainer: {
    marginBottom: 30,
  },
  label: {
    color: colors.neon.lime,
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 5,
  },
  input: {
    width: '100%',
    minHeight: 50,
    backgroundColor: colors.slate[700],
    borderRadius: 12,
    paddingHorizontal: 15,
    color: colors.pearl,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.slate[700],
    fontSize: 16,
    textAlignVertical: 'top',
  },
  deleteButton: {
    padding: 15,
    alignItems: 'center',
    backgroundColor: colors.glass.dark,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.state.error,
  },
  deleteButtonText: {
    color: colors.state.error,
    fontSize: 16,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCard: {
    backgroundColor: colors.slate[800],
    borderRadius: 16,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: colors.neon.aqua,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: colors.slate[700],
  },
  alertIcon: {
    marginBottom: 12,
  },
  alertTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.pearl,
    textAlign: 'center',
    marginBottom: 8,
  },
  alertMessage: {
    fontSize: 16,
    color: colors.slate[300],
    textAlign: 'center',
    marginBottom: 20,
  },
  alertButton: {
    backgroundColor: colors.neon.aqua,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.glow.blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
  alertButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.noir,
  },
});
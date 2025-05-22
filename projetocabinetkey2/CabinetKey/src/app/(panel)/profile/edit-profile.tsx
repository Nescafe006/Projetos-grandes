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
import colors from '@/constants/colors';

export default function EditProfileScreen() {
  const [userId, setUserId] = useState<string | null>(null);
  const [nome, setNome] = useState('');
  const [bio, setBio] = useState('');
  const [website, setWebsite] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      // Debug: List buckets
      const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
      console.log('Available buckets:', buckets, 'Bucket error:', bucketError);

      // Request permission
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'É necessário permitir acesso à galeria.');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data, error } = await supabase
          .from('usuario')
          .select('*')
          .eq('id', user.id)
          .single();
        if (data) {
          setNome(data.nome || '');
          setBio(data.bio || '');
          setWebsite(data.website || '');
          setAvatarUrl(data.avatar_url || '');
        }
        if (error) {
          console.error('Erro ao carregar perfil:', error.message);
          Alert.alert('Erro', 'Não foi possível carregar o perfil.');
        }
      }
    })();
  }, []);

  const pickImage = async () => {
    try {
      setLoading(true);

      // Check auth
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert('Erro', 'Você precisa estar logado para fazer upload.');
        setLoading(false);
        return;
      }

      // Check permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'É necessário permitir acesso à galeria.');
        setLoading(false);
        return;
      }

      // Pick image
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.7,
        allowsEditing: true,
        aspect: [1, 1],
      });

      if (result.canceled) {
        setLoading(false);
        return;
      }

      const file = result.assets[0];
     const ext = file.uri.split('.').pop()?.toLowerCase() ?? '';
if (!['jpg', 'jpeg', 'png'].includes(ext)) {
  Alert.alert('Erro', 'Apenas arquivos JPG ou PNG são suportados.');
  setLoading(false);
  return;
}

      const fileName = `${userId}-${Date.now()}.${ext}`;
      const filePath = `${fileName}`;

      console.log('Uploading to bucket: avatars, path:', filePath);

      // Read file
      const response = await fetch(file.uri);
      const fileBuffer = await response.arrayBuffer();

      // Upload
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, fileBuffer, {
          contentType: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
          upsert: true,
          cacheControl: '3600',
        });

      if (error) {
        console.error('Upload error:', error.message);
        Alert.alert('Erro', `Falha ao enviar a imagem: ${error.message}`);
        setLoading(false);
        return;
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        Alert.alert('Erro', 'Não foi possível obter a URL da imagem.');
        setLoading(false);
        return;
      }

      console.log('Uploaded image URL:', publicUrlData.publicUrl);
      setAvatarUrl(publicUrlData.publicUrl);

      // Delete old avatar
      if (avatarUrl) {
        const oldFilePath = avatarUrl.split('/avatars/')[1];
        if (oldFilePath) {
          const { error: removeError } = await supabase.storage
            .from('avatars')
            .remove([oldFilePath]);
          if (removeError) console.error('Error removing old avatar:', removeError.message);
        }
      }

    } catch (err) {
      console.error('Unexpected error:', JSON.stringify(err, null, 2));
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao processar a imagem.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!userId) {
      Alert.alert('Erro', 'Usuário não identificado.');
      return;
    }

    try {
      setLoading(true);
      const { error } = await supabase.from('usuario').upsert({
        id: userId,
        nome,
        bio,
        website,
        avatar_url: avatarUrl,
        atualizado_em: new Date().toISOString(),
      });

      if (error) {
        console.error('Erro ao salvar perfil:', error.message);
        Alert.alert('Erro ao salvar perfil', error.message);
        return;
      }

      Alert.alert('Sucesso', 'Perfil atualizado com sucesso!');
    } catch (err) {
      console.error('Erro inesperado ao salvar:', err);
      Alert.alert('Erro', 'Ocorreu um erro inesperado ao salvar o perfil.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scrollContainer}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Editar Perfil</Text>
        <TouchableOpacity onPress={handleSave} disabled={loading}>
          <Text style={[styles.saveText, loading && { opacity: 0.5 }]}>Salvar</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.avatarSection}>
        <TouchableOpacity onPress={pickImage} style={styles.avatarEditContainer} disabled={loading}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.neon.aqua} />
          ) : avatarUrl ? (
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
        <TextInput
          style={styles.input}
          value={nome}
          onChangeText={setNome}
          editable={!loading}
        />

        <Text style={styles.label}>Bio</Text>
        <TextInput
          style={styles.input}
          value={bio}
          onChangeText={setBio}
          multiline
          editable={!loading}
        />

        <Text style={styles.label}>Website</Text>
        <TextInput
          style={styles.input}
          value={website}
          onChangeText={setWebsite}
          editable={!loading}
        />
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
});
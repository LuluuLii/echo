import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

// Placeholder for materials from the store
interface RawMaterial {
  id: string;
  type: 'text' | 'image';
  content: string;
  createdAt: number;
}

export default function RawLibrary() {
  const router = useRouter();
  const [materials, setMaterials] = useState<RawMaterial[]>([]);

  const handleAddMaterial = () => {
    // TODO: Open add material modal
    console.log('Add material');
  };

  const handleGenerateActivation = () => {
    router.push('/activation');
  };

  if (materials.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>Your Raw Library</Text>
          <Text style={styles.emptySubtitle}>
            These are things you once noticed.
          </Text>
          <Text style={styles.emptyHint}>
            Start by adding your first material - a thought, a note, or a screenshot.
          </Text>
        </View>

        <Pressable style={styles.fab} onPress={handleAddMaterial}>
          <Text style={styles.fabText}>+</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={materials}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.materialCard}>
            <Text style={styles.materialContent} numberOfLines={3}>
              {item.content}
            </Text>
            <Text style={styles.materialMeta}>
              {new Date(item.createdAt).toLocaleDateString()}
            </Text>
          </View>
        )}
        contentContainerStyle={styles.list}
      />

      {materials.length >= 2 && (
        <Pressable
          style={styles.activateButton}
          onPress={handleGenerateActivation}
        >
          <Text style={styles.activateButtonText}>Generate Activation Card</Text>
        </Pressable>
      )}

      <Pressable style={styles.fab} onPress={handleAddMaterial}>
        <Text style={styles.fabText}>+</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fafafa',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 16,
  },
  emptyHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    padding: 16,
  },
  materialCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  materialContent: {
    fontSize: 15,
    color: '#333',
    lineHeight: 22,
  },
  materialMeta: {
    fontSize: 12,
    color: '#999',
    marginTop: 8,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  fabText: {
    fontSize: 28,
    color: '#fff',
    lineHeight: 28,
  },
  activateButton: {
    position: 'absolute',
    left: 20,
    right: 80,
    bottom: 30,
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

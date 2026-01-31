import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

// Placeholder activation card data
const placeholderCard = {
  id: '1',
  emotionalAnchor: 'A moment you became aware of how emotions show up in the body.',
  livedExperience:
    'When I get tense in the water, everything reacts immediately. My shoulders tighten, my legs slow down... Slowing down for just a few seconds somehow resets everything.',
  expressions: [
    'Any tension shows up immediately in the body.',
    'Slowing down helps me regain control.',
    'The body reacts faster than the mind.',
  ],
  invitation:
    'If you were explaining this to someone — not as a swimmer, but as a person — what would you say?',
};

export default function ActivationScreen() {
  const router = useRouter();

  const handleStartEcho = () => {
    router.push('/session');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        {/* Emotional Anchor */}
        <Text style={styles.anchor}>{placeholderCard.emotionalAnchor}</Text>

        {/* Lived Experience */}
        <View style={styles.experienceBox}>
          <Text style={styles.experience}>{placeholderCard.livedExperience}</Text>
        </View>

        {/* Expressions */}
        <View style={styles.expressionsSection}>
          <Text style={styles.expressionsLabel}>Expressions to carry the feeling:</Text>
          {placeholderCard.expressions.map((expr, index) => (
            <Text key={index} style={styles.expression}>
              "{expr}"
            </Text>
          ))}
        </View>

        {/* Invitation */}
        <Text style={styles.invitation}>{placeholderCard.invitation}</Text>

        {/* CTA */}
        <Pressable style={styles.ctaButton} onPress={handleStartEcho}>
          <Text style={styles.ctaText}>Start Echo</Text>
        </Pressable>
      </View>

      <Text style={styles.footerHint}>
        This card will fade. The only way to keep it is to speak.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  anchor: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginBottom: 20,
    lineHeight: 20,
  },
  experienceBox: {
    backgroundColor: '#fafafa',
    borderLeftWidth: 3,
    borderLeftColor: '#333',
    padding: 16,
    marginBottom: 24,
  },
  experience: {
    fontSize: 17,
    color: '#333',
    lineHeight: 26,
    fontStyle: 'italic',
  },
  expressionsSection: {
    marginBottom: 24,
  },
  expressionsLabel: {
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  expression: {
    fontSize: 15,
    color: '#555',
    marginBottom: 8,
    lineHeight: 22,
  },
  invitation: {
    fontSize: 16,
    color: '#333',
    lineHeight: 24,
    marginBottom: 24,
  },
  ctaButton: {
    backgroundColor: '#333',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  ctaText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  footerHint: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    marginTop: 24,
    fontStyle: 'italic',
  },
});

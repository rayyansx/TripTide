import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { View, Text, Pressable, TextInput, ActivityIndicator } from 'react-native';
import { useTranslation } from '../../i18n/TranslationContext';
import { fontFamily, useTheme } from '../../theme';
import { GlassCard, Sheet, IconButton } from '../../ui/chrome';

// Mocked members for now, in a real scenario we'd fetch these from `tripMembersRepo.ts` or similar
const mockMembers = [
  { id: 1, username: 'Rayyan', role: 'owner', avatar: 'R' },
  { id: 2, username: 'Junaid', role: 'editor', avatar: 'J' },
];

export function CollabMembersUI({ tripId }: { tripId: number }) {
  const { t } = useTranslation();
  const { m } = useTheme();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState('');
  const [inviting, setInviting] = useState(false);

  const handleInvite = () => {
    if (!emailOrUsername.trim()) return;
    setInviting(true);
    // Simulate API call
    setTimeout(() => {
      setInviting(false);
      setInviteOpen(false);
      setEmailOrUsername('');
      // In reality: refresh members
    }, 800);
  };

  return (
    <>
      <View style={{ marginBottom: 16 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 18, color: m.ink }}>Collaborators</Text>
          <Pressable onPress={() => setInviteOpen(true)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: m.act, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16 }}>
            <Ionicons name="person-add-outline" size={14} color={m.actFg} />
            <Text style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: m.actFg }}>Invite</Text>
          </Pressable>
        </View>

        <View style={{ gap: 8 }}>
          {mockMembers.map((member) => (
            <GlassCard key={member.id} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: m.faint, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: fontFamily.bold, fontSize: 16, color: m.bg }}>{member.avatar}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontFamily: fontFamily.semibold, fontSize: 15, color: m.ink }}>{member.username}</Text>
              </View>
              <View style={{ backgroundColor: member.role === 'owner' ? m.act : m.glassBorder, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ fontFamily: fontFamily.medium, fontSize: 11, color: member.role === 'owner' ? m.actFg : m.muted }}>
                  {member.role.toUpperCase()}
                </Text>
              </View>
            </GlassCard>
          ))}
        </View>
      </View>

      <Sheet open={inviteOpen} onClose={() => setInviteOpen(false)}>
        <View style={{ padding: 20 }}>
          <Text style={{ fontFamily: fontFamily.bold, fontSize: 18, color: m.ink, marginBottom: 16 }}>Invite Collaborator</Text>
          <TextInput
            placeholder="Username or Email"
            placeholderTextColor={m.muted}
            value={emailOrUsername}
            onChangeText={setEmailOrUsername}
            autoCapitalize="none"
            style={{
              fontFamily: fontFamily.regular,
              fontSize: 15,
              color: m.ink,
              backgroundColor: m.ic,
              borderRadius: 12,
              padding: 14,
              marginBottom: 16,
            }}
          />
          <Pressable
            onPress={handleInvite}
            disabled={inviting}
            style={{
              backgroundColor: m.act,
              borderRadius: 12,
              padding: 14,
              alignItems: 'center',
            }}
          >
            {inviting ? (
              <ActivityIndicator color={m.actFg} />
            ) : (
              <Text style={{ fontFamily: fontFamily.semibold, fontSize: 16, color: m.actFg }}>Send Invite</Text>
            )}
          </Pressable>
        </View>
      </Sheet>
    </>
  );
}

import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { FullUserProfile } from '../../api/userProfileApi';

// Register a standard clean font if needed, otherwise Helvetica is default.
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    backgroundColor: '#ffffff',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: '#111827',
    paddingBottom: 15,
    marginBottom: 20,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 5,
  },
  contactText: {
    fontSize: 10,
    color: '#6b7280',
    marginRight: 10,
  },
  contactRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 5,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2563eb',
    marginTop: 15,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  gridItem: {
    width: '50%',
    marginBottom: 6,
  },
  label: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  value: {
    fontSize: 10,
    color: '#374151',
  },
  itemTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  itemSubtitle: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
    marginBottom: 8,
  },
  listItem: {
    fontSize: 10,
    color: '#374151',
    marginBottom: 3,
  }
});

export const ProfilePDF = ({ profileData }: { profileData: FullUserProfile }) => {
  const profilePic = profileData?.documents?.find(d => d.docType === 'Profile Picture');
  
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.headerContainer}>
          {profilePic && (
            <Image 
              src={`http://localhost:5000${profilePic.fileUrl}?t=${new Date().getTime()}`} 
              style={styles.profileImage} 
            />
          )}
          <View>
            <Text style={styles.name}>
              {profileData?.profile?.firstName || 'Candidate'} {profileData?.profile?.lastName || ''}
            </Text>
            <View style={styles.contactRow}>
              {profileData?.profile?.currentNationality && (
                <Text style={styles.contactText}>Nationality: {profileData.profile.currentNationality}</Text>
              )}
              {profileData?.phones && profileData.phones[0] && (
                <Text style={styles.contactText}>Tel: {profileData.phones[0].phoneNumber}</Text>
              )}
              <Text style={styles.contactText}>Email: {profileData?.email}</Text>
            </View>
          </View>
        </View>

        {/* Personal Details */}
        <View style={{ marginBottom: 15 }}>
          <View style={styles.grid}>
            {profileData?.profile?.dob && (
              <View style={styles.gridItem}>
                <Text style={styles.label}>Date of Birth: <Text style={styles.value}>{profileData.profile.dob.split('T')[0]}</Text></Text>
              </View>
            )}
            {profileData?.profile?.gender && (
              <View style={styles.gridItem}>
                <Text style={styles.label}>Gender: <Text style={styles.value}>{profileData.profile.gender}</Text></Text>
              </View>
            )}
            {profileData?.profile?.maritalStatus && (
              <View style={styles.gridItem}>
                <Text style={styles.label}>Marital Status: <Text style={styles.value}>{profileData.profile.maritalStatus}</Text></Text>
              </View>
            )}
            {profileData?.profile?.nationalityAtBirth && (
              <View style={styles.gridItem}>
                <Text style={styles.label}>Nat. at Birth: <Text style={styles.value}>{profileData.profile.nationalityAtBirth}</Text></Text>
              </View>
            )}
            {profileData?.profile?.legalResidency && (
              <View style={styles.gridItem}>
                <Text style={styles.label}>Legal Residency: <Text style={styles.value}>{profileData.profile.legalResidency}</Text></Text>
              </View>
            )}
          </View>
        </View>

        {/* Addresses */}
        {profileData?.addresses && profileData.addresses.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Addresses</Text>
            {profileData.addresses.map(addr => (
              <Text key={addr.id} style={styles.listItem}>
                • {addr.address}{addr.address2 ? `, ${addr.address2}` : ''}, {addr.city}, {addr.state}, {addr.postalCode}, {addr.country}
              </Text>
            ))}
          </View>
        )}

        {/* Education */}
        {profileData?.academicQualifications && profileData.academicQualifications.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Education</Text>
            {profileData.academicQualifications.map(aq => (
              <View key={aq.id}>
                <Text style={styles.itemTitle}>{aq.degreeLevel} in {aq.mainField}</Text>
                <Text style={styles.itemSubtitle}>{aq.university} ({aq.fromDate?.substring(0,4)} - {aq.toDate?.substring(0,4)})</Text>
              </View>
            ))}
          </View>
        )}

        {/* Languages */}
        {profileData?.languages && profileData.languages.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Languages</Text>
            <View style={styles.grid}>
              {profileData.languages.map(lang => (
                <View key={lang.id} style={styles.gridItem}>
                  <Text style={styles.label}>{lang.language}: <Text style={styles.value}>{lang.level}</Text></Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* IT Skills */}
        {profileData?.itSkills && profileData.itSkills.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Skills & Qualifications</Text>
            {profileData.itSkills.map(s => (
              <Text key={s.id} style={styles.listItem}>• {s.description}</Text>
            ))}
          </View>
        )}

        {/* Other Qualifications */}
        {profileData?.otherQualifications && profileData.otherQualifications.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Other Qualifications</Text>
            {profileData.otherQualifications.map(oq => (
              <Text key={oq.id} style={styles.listItem}>• {oq.description}</Text>
            ))}
          </View>
        )}
        
      </Page>
    </Document>
  );
};

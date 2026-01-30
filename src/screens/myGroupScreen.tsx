// src/screens/MyGroupsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';

export default function MyGroupsScreen({ navigation }: any) {
  const [groups, setGroups] = useState([
    { id: '1', name: 'Family', role: 'ADMIN', memberCount: 4, taskCount: 5 },
    { id: '2', name: 'Roommates', role: 'MEMBER', memberCount: 3, taskCount: 2 },
  ]);
  const [loading, setLoading] = useState(false);

  const handleCreateGroup = () => {
    navigation.navigate('CreateGroup');
  };

  const handleJoinGroup = () => {
    navigation.navigate('JoinGroup');
  };

  const renderGroup = ({ item }: any) => (
    <TouchableOpacity 
      style={styles.groupCard}
      onPress={() => navigation.navigate('GroupDetails', { groupId: item.id })}
    >
      <View style={styles.groupHeader}>
        <View style={styles.groupIcon}>
          <Text style={styles.groupIconText}>{item.name.charAt(0)}</Text>
        </View>
        <View style={styles.groupInfo}>
          <Text style={styles.groupName}>{item.name}</Text>
          <Text style={styles.groupRole}>
            {item.role === 'ADMIN' ? '👑 Admin' : '👤 Member'}
          </Text>
        </View>
      </View>
      
      <View style={styles.groupStats}>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{item.memberCount}</Text>
          <Text style={styles.statLabel}>members</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statNumber}>{item.taskCount}</Text>
          <Text style={styles.statLabel}>tasks</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Groups</Text>
        <TouchableOpacity onPress={() => console.log('Refresh')}>
          <Text style={styles.refreshButton}>🔄</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <Text>Loading groups...</Text>
        </View>
      ) : (
        <FlatList
          data={groups}
          renderItem={renderGroup}
          keyExtractor={item => item.id}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No groups yet</Text>
              <Text style={styles.emptySubtext}>Create or join a group to get started</Text>
            </View>
          }
          contentContainerStyle={styles.listContainer}
        />
      )}

      <View style={styles.fabContainer}>
        <TouchableOpacity style={styles.fab} onPress={handleJoinGroup}>
          <Text style={styles.fabText}>🔗</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.fab, styles.primaryFab]} onPress={handleCreateGroup}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212529',
  },
  refreshButton: {
    fontSize: 20,
    padding: 5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 20,
  },
  groupCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  groupIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  groupIconText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#212529',
    marginBottom: 3,
  },
  groupRole: {
    fontSize: 14,
    color: '#6c757d',
  },
  groupStats: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e9ecef',
    paddingTop: 10,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212529',
  },
  statLabel: {
    fontSize: 12,
    color: '#6c757d',
    textTransform: 'uppercase',
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 18,
    color: '#212529',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#6c757d',
    textAlign: 'center',
  },
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    alignItems: 'flex-end',
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#6c757d',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  primaryFab: {
    backgroundColor: '#007AFF',
  },
  fabText: {
    fontSize: 24,
    color: 'white',
  },
});
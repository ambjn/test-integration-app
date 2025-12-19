// import { api } from "@/convex/_generated/api";
// import { useAuth, useUser } from '@clerk/clerk-expo';
// import { useMutation, useQuery } from "convex/react";
// import { Button } from 'heroui-native';
// import React from "react";
// import { ActivityIndicator, Text, View } from "react-native";

// export default function Index() {
//   const { isSignedIn, signOut } = useAuth();
//   const { user } = useUser();
//   const getTodos = useQuery(api.todos.getTodos);
//   const addTodo = useMutation(api.todos.addTodo);

//   const isLoading = getTodos === undefined;

//   return (
//     <View className="flex-1 justify-center items-center bg-background-tertiary gap-4">
//       {isSignedIn && <Text>{user?.emailAddresses[0].emailAddress}</Text>}
//       <Button onPress={() => signOut()}>Log Out</Button>

//       {isLoading ? <ActivityIndicator /> : getTodos?.map(({ _id, text }) => <Text key={_id}>{text}</Text>)}
//       <Button onPress={() => addTodo({ text: "New Todo 1" })}>Add Todo</Button>


//       <Button onPress={() => fetch("https://tough-ermine-673.convex.site/ass").then(res => res.text()).then(console.log)}>Fetch</Button>
//       <Button onPress={() => console.log(getTodos)}>Print</Button>

//     </View>
//   );
// }


// App.tsx or your main component
import { api } from '@/convex/_generated/api';
import { useNotifications } from '@/hooks/useNotifications';
import { useUser } from '@clerk/clerk-expo';
import { useMutation } from 'convex/react';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function App() {
  const { user } = useUser();
  const { expoPushToken, myNotifications, unreadCount } = useNotifications();
  const markAsRead = useMutation(api.notifications.markAsRead);

  const handleNotificationPress = async (notificationId: any) => {
    try {
      await markAsRead({ notificationId });
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.section}>
        <Text style={styles.title}>📱 My Notifications</Text>

        <View style={styles.card}>
          <Text style={styles.label}>Logged in as:</Text>
          <Text style={styles.value}>{user?.emailAddresses[0]?.emailAddress}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>User ID (for admin):</Text>
          <Text style={styles.userId} selectable>{user?.id}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Push Token Status:</Text>
          <Text style={styles.status}>
            {expoPushToken ? '✅ Active' : '⏳ Registering...'}
          </Text>
          {expoPushToken && (
            <Text style={styles.token} selectable numberOfLines={3}>
              {expoPushToken}
            </Text>
          )}
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Unread Notifications:</Text>
          <Text style={styles.badge}>{unreadCount || 0}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Recent Notifications</Text>
          {myNotifications && myNotifications.length > 0 ? (
            myNotifications.map((notif) => (
              <TouchableOpacity
                key={notif._id}
                style={[styles.notifItem, !notif.readAt && styles.unreadNotif]}
                onPress={() => handleNotificationPress(notif._id)}
              >
                <Text style={styles.notifTitle}>{notif.title}</Text>
                <Text style={styles.notifBody}>{notif.body}</Text>
                <Text style={styles.notifTime}>
                  {new Date(notif.sentAt).toLocaleString()}
                </Text>
                {!notif.readAt && (
                  <View style={styles.unreadBadge}>
                    <Text style={styles.unreadText}>NEW</Text>
                  </View>
                )}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyText}>No notifications yet</Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  section: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 5,
    color: '#666',
  },
  value: {
    fontSize: 16,
    color: '#333',
  },
  userId: {
    fontSize: 12,
    color: '#007AFF',
    fontFamily: 'monospace',
  },
  token: {
    fontSize: 10,
    color: '#666',
    marginTop: 5,
    fontFamily: 'monospace',
  },
  status: {
    fontSize: 16,
    fontWeight: '600',
  },
  badge: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
  },
  notifItem: {
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    marginBottom: 8,
    position: 'relative',
  },
  unreadNotif: {
    backgroundColor: '#e3f2fd',
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  notifTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  notifBody: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  notifTime: {
    fontSize: 11,
    color: '#999',
  },
  unreadBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  unreadText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 20,
  },
});
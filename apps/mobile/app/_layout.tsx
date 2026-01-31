import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="auto" />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#fff',
          },
          headerTintColor: '#000',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: 'Echo',
            headerLargeTitle: true,
          }}
        />
        <Stack.Screen
          name="activation"
          options={{
            title: 'Activation',
            presentation: 'card',
          }}
        />
        <Stack.Screen
          name="session"
          options={{
            title: 'Echo Session',
            presentation: 'fullScreenModal',
          }}
        />
      </Stack>
    </>
  );
}

import { Stack } from 'expo-router'
import React from 'react'

const Layout = () => {
    return (
        <Stack screenOptions={{
            headerTintColor: 'light-gray',
            headerStyle: { backgroundColor: 'light-gray' },
        }} >
            <Stack.Screen name="index" options={{ title: "home🏠" }} />
        </Stack>
    )
}

export default Layout
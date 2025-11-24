import React from "react";

import { AntDesign, Ionicons } from "@expo/vector-icons";
import * as AuthSession from "expo-auth-session";
import { View } from "react-native";

import { useSignIn, useSSO } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import { Button, Card } from "heroui-native";

const SignInPage = () => {

    const { isLoaded } = useSignIn();
    const router = useRouter();

    const { startSSOFlow } = useSSO();

    const onSignInPress = async (strategy: "oauth_google" | "oauth_apple") => {
        if (!isLoaded) return;

        try {
            const { createdSessionId, setActive } = await startSSOFlow({
                strategy: strategy,
                redirectUrl: AuthSession.makeRedirectUri(),
            });

            if (createdSessionId) {
                await setActive!({ session: createdSessionId });
                router.replace("/(home)");
            } else {
            }
        } catch (err: any) {
            console.error(JSON.stringify(err, null, 2));
        }
    };

    return (
        <View className="flex-1 bg-background-quaternary items-center justify-center">
            <View className="p-5 w-[90%]">
                <Card className="gap-5">
                    <Card.Title className="text-center text-pink-500">
                        Test Integration⚡️
                    </Card.Title>

                    <Card.Description className="text-center">
                        Sign in with Google or Apple
                    </Card.Description>
                    <Card.Footer className="items-center">
                        <View className="flex-row gap-5">
                            <Button variant="tertiary" onPress={() => onSignInPress("oauth_google")}>
                                <AntDesign name="google" size={24} />
                            </Button>
                            <Button variant="tertiary" onPress={() => onSignInPress("oauth_apple")}>
                                <Ionicons name="logo-apple" size={24} />
                            </Button>
                        </View>
                    </Card.Footer>
                </Card>
            </View>
        </View>
    );
};

export default SignInPage;



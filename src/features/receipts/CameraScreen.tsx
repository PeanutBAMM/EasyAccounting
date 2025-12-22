import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { uploadReceiptImage } from './uploadService';
import { useAuthStore, AuthState } from '../auth/authStore';

export default function CameraScreen() {
    const [permission, requestPermission] = useCameraPermissions();
    const [isProcessing, setIsProcessing] = useState(false);
    const cameraRef = useRef<CameraView>(null);
    const navigation = useNavigation();
    const user = useAuthStore((state: AuthState) => state.user);

    if (!permission) {
        // Camera permissions are still loading.
        return <View style={styles.container} />;
    }

    if (!permission.granted) {
        // Camera permissions are not granted yet.
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.message}>We hebben toegang tot je camera nodig om bonnetjes te scannen.</Text>
                <TouchableOpacity style={styles.button} onPress={requestPermission}>
                    <Text style={styles.buttonText}>Toestemming geven</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current && !isProcessing) {
            setIsProcessing(true);
            try {
                const photo = await cameraRef.current.takePictureAsync({
                    quality: 0.7, // Compress slightly immediately
                    base64: false, // We upload the file, no base64 needed yet
                    exif: false,
                });

                if (photo) {
                    console.log('Photo taken, starting processing...');

                    if (!user) {
                        Alert.alert("Fout", "Je bent niet ingelogd.");
                        setIsProcessing(false);
                        return;
                    }

                    // Upload Process (Non-blocking navigation)
                    try {
                        // Start upload and return immediately
                        uploadReceiptImage(photo.uri, user.id);
                        console.log('Upload initiated, navigating back...');

                        // Navigate back immediately so user can continue
                        navigation.goBack();
                    } catch (err) {
                        console.error("Upload start error:", err);
                        Alert.alert("Upload Fout", "Kon bonnetje niet uploaden. Probeer opnieuw.");
                        setIsProcessing(false);
                    }
                }
            } catch (error) {
                console.error("Failed to take picture:", error);
                Alert.alert("Fout", "Kon geen foto maken.");
            } finally {
                setIsProcessing(false);
            }
        }
    };

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} ref={cameraRef} facing="back">
                <SafeAreaView style={styles.overlay}>

                    {/* Header: Close Button */}
                    <View style={styles.header}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color="white" />
                        </TouchableOpacity>
                    </View>

                    {/* Middle: Guide Frame (Visual only) */}
                    <View style={styles.guideFrameContainer}>
                        <View style={[styles.guideFrame, { borderColor: isProcessing ? '#22D3EE' : 'rgba(255,255,255,0.5)' }]} />
                        <Text style={styles.guideText}>Plaats bonnetje in het kader</Text>
                    </View>

                    {/* Footer: Capture Button */}
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.captureButton}
                            onPress={takePicture}
                            disabled={isProcessing}
                        >
                            <View style={styles.captureInner}>
                                {isProcessing && <ActivityIndicator color="#000" />}
                            </View>
                        </TouchableOpacity>
                    </View>

                </SafeAreaView>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    permissionContainer: {
        flex: 1,
        backgroundColor: '#0F172A',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    message: {
        color: '#FFF',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
    },
    button: {
        backgroundColor: '#22D3EE',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    buttonText: {
        color: '#0F172A',
        fontWeight: 'bold',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'space-between',
    },
    header: {
        padding: 16,
        alignItems: 'flex-start',
    },
    closeButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    guideFrameContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    guideFrame: {
        width: 280,
        height: 400,
        borderWidth: 2,
        borderRadius: 20,
        backgroundColor: 'transparent',
    },
    guideText: {
        color: 'rgba(255,255,255,0.8)',
        marginTop: 16,
        fontSize: 14,
        fontWeight: '600',
    },
    footer: {
        paddingBottom: 40,
        alignItems: 'center',
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    captureInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

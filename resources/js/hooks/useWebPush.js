import { useEffect, useRef } from 'react';
import api from '../services/api';

export function useWebPush() {
  const subscriptionRef = useRef(null);
  const notifiedAlertsRef = useRef(new Set());

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('Web Push not supported');
      return;
    }

    const subscribe = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;

        // Verificar si ya está suscrito
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          subscriptionRef.current = subscription;
          sendSubscriptionToBackend(subscription);
          return;
        }

        // Pedir permiso
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        // Obtener clave pública VAPID (luego la configuras en tu app)
        const vapidPublicKey = window.__VAPID_PUBLIC_KEY_;

        if (!vapidPublicKey) {
          console.warn('VAPID_PUBLIC_KEY not configured');
          return;
        }

        // Suscribirse
        const newSubscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        subscriptionRef.current = newSubscription;
        sendSubscriptionToBackend(newSubscription);
      } catch (error) {
        console.error('Web Push subscription failed:', error);
      }
    };

    subscribe();
  }, []);

  const sendSubscriptionToBackend = async (subscription) => {
    try {
      await api.subscribeToPush({
        endpoint: subscription.endpoint,
        keys: subscription.toJSON().keys,
      });
      console.log('✓ Push subscription sent to backend');
    } catch (error) {
      console.error('Failed to send subscription to backend:', error);
    }
  };

  return { subscriptionRef, notifiedAlertsRef };
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

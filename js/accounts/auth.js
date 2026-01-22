// js/accounts/auth.js
import { auth, provider } from './config.js';
import {
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
} from 'https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js';

export class AuthManager {
    constructor() {
        this.user = null;
        this.unsubscribe = null;
        this.authListeners = [];
        this.init();
    }

    init() {
        if (!auth) return;

        // Handle redirect result (Required for Tauri)
        // This is a no-op in browsers if no redirect happened
        getRedirectResult(auth)
            .then((result) => {
                if (result?.user) {
                    console.log("Redirect sign-in success:", result.user);
                    // onAuthStateChanged will handle the UI update
                }
            })
            .catch((error) => {
                console.error("Redirect sign-in failed:", error);
                if (window.__TAURI__) {
                    // Avoid alert() loop if something goes generic-wrong on load in Tauri
                    console.error('Tauri auth redirect error:', error);
                }
            });

        this.unsubscribe = onAuthStateChanged(auth, (user) => {
            this.user = user;
            this.updateUI(user);

            this.authListeners.forEach((listener) => listener(user));
        });
    }

    onAuthStateChanged(callback) {
        this.authListeners.push(callback);
        // If we already have a user state, trigger immediately
        if (this.user !== null) {
            callback(this.user);
        }
    }

    async signInWithGoogle() {
        if (!auth) {
            alert('Firebase is not configured. Please check console.');
            return;
        }

        // Force account selection
        provider.setCustomParameters({
            prompt: "select_account",
        });

        try {
            // Detect Tauri / WebView environment
            const isTauri = typeof window !== "undefined" && window.__TAURI__ !== undefined;

            if (isTauri) {
                // Redirect-based auth for Tauri
                await signInWithRedirect(auth, provider);
                return null; // result comes from getRedirectResult
            } else {
                // Popup-based auth for normal browsers
                const result = await signInWithPopup(auth, provider);
                return result.user;
            }
        } catch (error) {
            console.error('Login failed:', error);

            // Avoid alert() in Tauri auth flows if possible, or keep it generic
            if (!window.__TAURI__) {
                alert(`Login failed: ${error.message}`);
            }

            throw error;
        }
    }

    async signInWithEmail(email, password) {
        if (!auth) {
            alert('Firebase is not configured.');
            return;
        }
        try {
            const result = await signInWithEmailAndPassword(auth, email, password);
            return result.user;
        } catch (error) {
            console.error('Email Login failed:', error);
            alert(`Login failed: ${error.message}`);
            throw error;
        }
    }

    async signUpWithEmail(email, password) {
        if (!auth) {
            alert('Firebase is not configured.');
            return;
        }
        try {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            return result.user;
        } catch (error) {
            console.error('Sign Up failed:', error);
            alert(`Sign Up failed: ${error.message}`);
            throw error;
        }
    }

    async signOut() {
        if (!auth) return;

        try {
            await firebaseSignOut(auth);
            // The onAuthStateChanged listener will handle the rest
        } catch (error) {
            console.error('Logout failed:', error);
            throw error;
        }
    }

    updateUI(user) {
        const connectBtn = document.getElementById('firebase-connect-btn');
        const clearDataBtn = document.getElementById('firebase-clear-cloud-btn');
        const statusText = document.getElementById('firebase-status');
        const emailContainer = document.getElementById('email-auth-container');
        const emailToggleBtn = document.getElementById('toggle-email-auth-btn');

        if (!connectBtn) return; // UI might not be rendered yet

        if (user) {
            connectBtn.textContent = 'Sign Out';
            connectBtn.classList.add('danger');
            connectBtn.onclick = () => this.signOut();

            if (clearDataBtn) clearDataBtn.style.display = 'block';
            if (emailContainer) emailContainer.style.display = 'none';
            if (emailToggleBtn) emailToggleBtn.style.display = 'none';

            if (statusText) statusText.textContent = `Signed in as ${user.email}`;
        } else {
            connectBtn.textContent = 'Connect with Google';
            connectBtn.classList.remove('danger');
            connectBtn.onclick = () => this.signInWithGoogle();

            if (clearDataBtn) clearDataBtn.style.display = 'none';
            if (emailToggleBtn) emailToggleBtn.style.display = 'inline-block';

            if (statusText) statusText.textContent = 'Sync your library across devices';
        }
    }
}

export const authManager = new AuthManager();

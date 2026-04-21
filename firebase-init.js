import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, query, orderBy, limit, getDocs, where, doc, getDoc, setDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// 1. CONFIGURATION
const firebaseConfig = {
  apiKey: "AIzaSyD42RkZ-K-yLVrNtweoumFCmZmC_h7-qOM", 
  authDomain: "future-dash-ff5b1.firebaseapp.com",
  projectId: "future-dash-ff5b1",
  storageBucket: "future-dash-ff5b1.appspot.com",
  messagingSenderId: "707082461773",
  appId: "1:707082461773:web:4c201734847a60d2753204"
};

// 2. INITIALIZATION
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app-check.js";
const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('6Le6GsIsAAAAAB1ffTlUpnm7TtW1NjHTKLT8HPA1'),
    isTokenAutoRefreshEnabled: true
});

// ===============================
// 3. AUTHENTICATION (Required for auth.js)
// ===============================
window.userSignUp = (email, pass) => createUserWithEmailAndPassword(auth, email, pass);
window.userLogin = (email, pass) => signInWithEmailAndPassword(auth, email, pass);
window.userLogout = () => signOut(auth);
window.getCurrentUser = () => auth.currentUser;

window.updateUserProfile = async (uid, data) => {
    try {
        const userRef = doc(db, "users", uid);
        await setDoc(userRef, data, { merge: true });
    } catch (e) { console.error("Profile Update Error:", e); }
};

// ===============================
// 4. LEVEL MANAGEMENT (Required for editor.js)
// ===============================
window.publishLevel = async (name, creator, data) => {
    try {
        const docRef = await addDoc(collection(db, "published_levels"), {
            name: name,
            creator: creator,
            data: JSON.stringify(data),
            timestamp: Date.now()
        });
        return docRef.id;
    } catch (e) { console.error("Publish Error:", e); return null; }
};

export const getCommunityLevels = async () => {
    try {
        const q = query(collection(db, "published_levels"), orderBy("timestamp", "desc"));
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) { console.error("Fetch Error:", e); return []; }
};
window.getCommunityLevels = getCommunityLevels;

window.getLevelByID = async (levelId) => {
    try {
        const docRef = doc(db, "published_levels", levelId);
        const docSnap = await getDoc(docRef);
        return docSnap.exists() ? docSnap.data() : null;
    } catch (e) { console.error("Fetch Single Error:", e); return null; }
};

// ===============================
// 5. LEADERBOARD (Required for game.js)
// ===============================
window.saveGlobalScoreSecurely = async (runData) => {
    const secretKey = "FutureDash_REDACTED_2026"; 
    const token = btoa(runData.time + "-" + secretKey);
    try {
        await addDoc(collection(db, "leaderboards"), {
            level: runData.levelName,
            user: runData.username,
            score: parseFloat(runData.time),
            path: JSON.stringify(runData.path), 
            token: token,
            timestamp: Date.now()
        });
        console.log("Global Score Saved!");
    } catch (e) { console.error("Cloud Score Error:", e); }
};

// Alias so game.js can find it by the name it uses
window.saveToLeaderboardFree = window.saveGlobalScoreSecurely;

export const getGlobalLeaderboard = async (levelName) => {
    try {
        const q = query(
            collection(db, "leaderboards"), 
            where("level", "==", levelName),
            orderBy("score", "asc"), 
            limit(10)
        );
        const querySnapshot = await getDocs(q);
        return querySnapshot.docs.map(doc => doc.data());
    } catch (e) { console.error("Leaderboard Fetch Error:", e); return []; }
};
window.getGlobalLeaderboard = getGlobalLeaderboard;

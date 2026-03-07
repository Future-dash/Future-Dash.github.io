import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, query, orderBy, limit, getDocs, where, doc, getDoc } 
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyD42RkZ-K-yLVrNtweoumFCmZmC_h7-qOM", 
  authDomain: "future-dash-ff5b1.firebaseapp.com",
  projectId: "future-dash-ff5b1",
  storageBucket: "future-dash-ff5b1.appspot.com",
  messagingSenderId: "707082461773",
  appId: "1:707082461773:web:4c201734847a60d2753204"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- CLOUD FUNCTIONS ---

// 1. SAVE LEVEL (Publisher)
window.publishLevel = async (levelName, creator, mapData) => {
    try {
        const docRef = await addDoc(collection(db, "published_levels"), {
            name: levelName,
            creator: creator,
            data: JSON.stringify(mapData),
            timestamp: Date.now()
        });
        alert("SUCCESS! Level Published. ID: " + docRef.id);
        return docRef.id;
    } catch (e) { console.error("Publish Error:", e); }
};

// 2. GET LEVELS (Browser)
window.getCommunityLevels = async () => {
    const q = query(collection(db, "published_levels"), orderBy("timestamp", "desc"));
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
};

// 3. GET SINGLE LEVEL (For Playing)
window.getLevelByID = async (levelId) => {
    try {
        const docRef = doc(db, "published_levels", levelId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return docSnap.data();
        } else {
            console.error("Level not found in Firebase!");
            return null;
        }
    } catch (e) {
        console.error("Fetch Error:", e);
        return null;
    }
};

// 4. SAVE SCORE (Leaderboard)
window.saveGlobalScore = async (levelName, username, time, ghostPath) => {
    try {
        await addDoc(collection(db, "leaderboards"), {
            level: levelName,
            user: username,
            score: parseFloat(time),
            ghost: JSON.stringify(ghostPath),
            timestamp: Date.now()
        });
    } catch (e) { console.error("Score Error:", e); }
};

console.log("Future-Dash Cloud Engine: ACTIVE");
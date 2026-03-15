import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: "AIzaSyAmoQgoL34LdCOmiVgRpiP4PiuyrPaiAAs",
  authDomain: "safe-f4f8b.firebaseapp.com",
  projectId: "safe-f4f8b",
  storageBucket: "safe-f4f8b.appspot.com",
  messagingSenderId: "842528382804",
  appId: "1:842528382804:web:4dd1d5451290d46558b2c1",
  databaseURL: "https://safe-f4f8b-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
